/**
 * CriticalErrorNotifier - wysyła email o błędach krytycznych
 *
 * Używany przez automatyczne procesy (schedulery, file watchery), żeby Krzysztof
 * dostał powiadomienie gdy coś przestało działać w tle.
 *
 * Cooldown 6h per source — gdy ta sama infrastruktura pada wielokrotnie
 * (np. 8:00, 12:00, 15:00 z rzędu), email idzie tylko raz.
 *
 * Konfiguracja SMTP: tabela Setting (gmail_email, gmail_app_password).
 * Jeśli SMTP nie jest skonfigurowany, alert zostaje tylko w logach.
 */

import type { PrismaClient } from '@prisma/client';
import { EmailService } from '../email/EmailService.js';
import { logger } from '../../utils/logger.js';

const RECIPIENT = 'krzysztof@markbud.pl';
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

interface NotifyOptions {
  source: string;
  errorMessage: string;
  context?: Record<string, string | number | boolean | undefined | null>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(options: NotifyOptions): string {
  const timestamp = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
  const ctxRows = options.context
    ? Object.entries(options.context)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(
          ([key, value]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#555;"><b>${escapeHtml(key)}</b></td><td style="padding:4px 0;">${escapeHtml(String(value))}</td></tr>`
        )
        .join('')
    : '';

  return `<!doctype html>
<html lang="pl"><body style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.5;">
  <h2 style="color:#c00;margin-bottom:4px;">Błąd krytyczny - MARKBUD System</h2>
  <p style="margin-top:0;color:#666;font-size:13px;">Wiadomość wygenerowana automatycznie.</p>
  <p><b>Źródło:</b> ${escapeHtml(options.source)}</p>
  <p><b>Czas:</b> ${escapeHtml(timestamp)} (Europe/Warsaw)</p>
  <p style="margin-bottom:4px;"><b>Komunikat błędu:</b></p>
  <pre style="background:#f7f7f7;padding:12px;border-left:4px solid #c00;white-space:pre-wrap;font-family:Consolas,monospace;font-size:13px;">${escapeHtml(options.errorMessage)}</pre>
  ${ctxRows ? `<p style="margin-bottom:4px;"><b>Kontekst:</b></p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">${ctxRows}</table>` : ''}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="color:#999;font-size:12px;">Kolejne wiadomości z tego samego źródła zostaną wstrzymane przez 6 godzin (cooldown).</p>
</body></html>`;
}

function renderText(options: NotifyOptions): string {
  const timestamp = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
  const ctxLines = options.context
    ? Object.entries(options.context)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n')
    : '';
  return [
    'Błąd krytyczny - MARKBUD System',
    `Źródło: ${options.source}`,
    `Czas: ${timestamp} (Europe/Warsaw)`,
    '',
    'Komunikat błędu:',
    options.errorMessage,
    ctxLines ? `\nKontekst:\n${ctxLines}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

class CriticalErrorNotifier {
  private emailService: EmailService;
  private lastSent = new Map<string, number>();

  constructor(prisma: PrismaClient) {
    this.emailService = new EmailService(prisma);
  }

  async notify(options: NotifyOptions): Promise<void> {
    const now = Date.now();
    const last = this.lastSent.get(options.source);
    if (last && now - last < COOLDOWN_MS) {
      logger.debug(
        `[CriticalErrorNotifier] Pomijam email (cooldown 6h aktywny): ${options.source}`
      );
      return;
    }

    const subject = `[MARKBUD] Błąd krytyczny: ${options.source}`;
    const result = await this.emailService.send({
      to: RECIPIENT,
      subject,
      html: renderHtml(options),
      text: renderText(options),
    });

    if (result.success) {
      this.lastSent.set(options.source, now);
      logger.info(
        `[CriticalErrorNotifier] Wysłano alert email do ${RECIPIENT} (${options.source})`
      );
    } else {
      logger.error(
        `[CriticalErrorNotifier] Nie udało się wysłać alert emaila (${options.source}): ${result.error}`
      );
    }
  }
}

let instance: CriticalErrorNotifier | null = null;

export function getCriticalErrorNotifier(prisma: PrismaClient): CriticalErrorNotifier {
  if (!instance) {
    instance = new CriticalErrorNotifier(prisma);
  }
  return instance;
}

/**
 * Convenience wrapper - nie rzuca, tylko loguje błąd wysyłki.
 * Bezpieczne do wywoływania bez await w handlerach błędów.
 */
export function notifyCriticalError(
  prisma: PrismaClient,
  options: NotifyOptions
): void {
  getCriticalErrorNotifier(prisma)
    .notify(options)
    .catch((err) => {
      logger.error('[CriticalErrorNotifier] Unexpected notify error:', err);
    });
}
