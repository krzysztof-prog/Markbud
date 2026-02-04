import { ImapFlow } from 'imapflow';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import {
  emitGmailFetchStarted,
  emitGmailFetchCompleted,
  emitGmailFetchFailed,
} from '../event-emitter.js';
import path from 'path';
import fs from 'fs';

// Klucze ustawień Gmail w tabeli Setting
const GMAIL_SETTINGS_KEYS = {
  email: 'gmail_email',
  appPassword: 'gmail_app_password',
  enabled: 'gmail_enabled',
  targetFolder: 'gmail_target_folder',
} as const;

interface GmailConfig {
  email: string;
  appPassword: string;
  enabled: boolean;
  targetFolder: string;
}

interface FetchResult {
  success: boolean;
  totalEmails: number;
  downloaded: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * GmailFetcherService - pobiera załączniki CSV z konta Gmail przez IMAP.
 *
 * Flow:
 * 1. Łączy się z Gmail IMAP (imap.gmail.com:993, TLS)
 * 2. Szuka nieprzeczytanych maili w INBOX
 * 3. Dla każdego maila z załącznikiem CSV:
 *    a) Sprawdza deduplication (messageUid w GmailFetchLog)
 *    b) Pobiera załącznik i zapisuje do targetFolder
 *    c) Przenosi mail do labela "Zaimportowane"
 *    d) Zapisuje log w GmailFetchLog
 * 4. GlassWatcher automatycznie wykrywa nowy CSV i importuje
 */
export class GmailFetcherService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Pobierz konfigurację Gmail z tabeli Setting
   */
  async getConfig(): Promise<GmailConfig | null> {
    const settings = await this.prisma.setting.findMany({
      where: {
        key: { in: Object.values(GMAIL_SETTINGS_KEYS) },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const email = settingsMap.get(GMAIL_SETTINGS_KEYS.email);
    const appPassword = settingsMap.get(GMAIL_SETTINGS_KEYS.appPassword);
    const enabled = settingsMap.get(GMAIL_SETTINGS_KEYS.enabled);
    const targetFolder = settingsMap.get(GMAIL_SETTINGS_KEYS.targetFolder);

    if (!email || !appPassword) {
      return null;
    }

    return {
      email,
      appPassword,
      enabled: enabled === 'true',
      targetFolder: targetFolder || '',
    };
  }

  /**
   * Testuj połączenie IMAP z Gmail
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig();
    if (!config) {
      return { success: false, message: 'Brak konfiguracji Gmail (email lub hasło aplikacji)' };
    }

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: config.email,
        pass: config.appPassword,
      },
      logger: false,
    });

    try {
      await client.connect();
      await client.logout();
      return { success: true, message: 'Połączenie OK' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Nieznany błąd';
      logger.error('[GmailFetcher] Test connection failed:', error);
      return { success: false, message: `Błąd połączenia: ${errorMsg}` };
    }
  }

  /**
   * Główna metoda - pobierz maile z załącznikami CSV
   */
  async fetchEmails(): Promise<FetchResult> {
    const config = await this.getConfig();
    if (!config) {
      return {
        success: false,
        totalEmails: 0,
        downloaded: 0,
        skipped: 0,
        failed: 0,
        errors: ['Brak konfiguracji Gmail'],
      };
    }

    if (!config.enabled) {
      return {
        success: false,
        totalEmails: 0,
        downloaded: 0,
        skipped: 0,
        failed: 0,
        errors: ['Gmail IMAP jest wyłączony'],
      };
    }

    if (!config.targetFolder) {
      return {
        success: false,
        totalEmails: 0,
        downloaded: 0,
        skipped: 0,
        failed: 0,
        errors: ['Brak skonfigurowanego folderu docelowego'],
      };
    }

    // Upewnij się że folder docelowy istnieje
    if (!fs.existsSync(config.targetFolder)) {
      try {
        fs.mkdirSync(config.targetFolder, { recursive: true });
      } catch (err) {
        return {
          success: false,
          totalEmails: 0,
          downloaded: 0,
          skipped: 0,
          failed: 0,
          errors: [`Nie można utworzyć folderu docelowego: ${config.targetFolder}`],
        };
      }
    }

    emitGmailFetchStarted({ status: 'started' });

    const result: FetchResult = {
      success: true,
      totalEmails: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: config.email,
        pass: config.appPassword,
      },
      logger: false,
    });

    try {
      await client.connect();
      logger.info('[GmailFetcher] Connected to Gmail IMAP');

      // Otwórz INBOX
      const mailbox = await client.mailboxOpen('INBOX');
      logger.info(`[GmailFetcher] INBOX opened, ${mailbox.exists} messages total`);

      // Szukaj nieprzeczytanych maili
      const messages = client.fetch(
        { seen: false },
        {
          uid: true,
          envelope: true,
          bodyStructure: true,
        }
      );

      // Zbierz UID-y do przetworzenia
      const messagesToProcess: Array<{
        uid: number;
        subject: string;
        sender: string;
        date: Date | null;
        attachments: Array<{ part: string; filename: string }>;
      }> = [];

      for await (const msg of messages) {
        result.totalEmails++;

        const uid = msg.uid;
        const subject = msg.envelope?.subject || '(brak tematu)';
        const sender = msg.envelope?.from?.[0]?.address || '(nieznany)';
        const date = msg.envelope?.date || null;

        // Znajdź załączniki CSV w strukturze wiadomości
        const csvAttachments = this.findCsvAttachments(msg.bodyStructure);

        if (csvAttachments.length === 0) {
          // Brak załącznika CSV - pomiń, ale nie oznaczaj jako przeczytany
          continue;
        }

        messagesToProcess.push({
          uid,
          subject,
          sender,
          date,
          attachments: csvAttachments,
        });
      }

      logger.info(`[GmailFetcher] Found ${messagesToProcess.length} emails with CSV attachments out of ${result.totalEmails} unread`);

      // Przetwórz każdy mail
      for (const msg of messagesToProcess) {
        const messageUid = `${mailbox.uidValidity}-${msg.uid}`;

        // Sprawdź deduplication
        const existingLog = await this.prisma.gmailFetchLog.findUnique({
          where: { messageUid },
        });

        if (existingLog) {
          result.skipped++;
          logger.debug(`[GmailFetcher] Skipping already processed: ${messageUid}`);
          continue;
        }

        // Pobierz każdy załącznik CSV
        for (const attachment of msg.attachments) {
          try {
            // Pobierz zawartość załącznika
            const { content } = await client.download(String(msg.uid), attachment.part, { uid: true });

            // Odczytaj stream do Buffer
            const chunks: Buffer[] = [];
            for await (const chunk of content) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const csvBuffer = Buffer.concat(chunks);

            // Generuj unikalną nazwę pliku z timestampem
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sanitizedFilename = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filename = `gmail_${timestamp}_${sanitizedFilename}`;
            const filePath = path.join(config.targetFolder, filename);

            // Zapisz plik
            fs.writeFileSync(filePath, csvBuffer);
            logger.info(`[GmailFetcher] Saved CSV: ${filePath} (${csvBuffer.length} bytes)`);

            // Zapisz log w bazie
            await this.prisma.gmailFetchLog.create({
              data: {
                messageUid,
                subject: msg.subject.substring(0, 500),
                sender: msg.sender.substring(0, 200),
                receivedAt: msg.date,
                attachmentName: attachment.filename.substring(0, 200),
                savedFilePath: filePath,
                status: 'downloaded',
              },
            });

            result.downloaded++;
          } catch (error) {
            result.failed++;
            const errorMsg = error instanceof Error ? error.message : 'Nieznany błąd';
            result.errors.push(`Błąd pobierania ${attachment.filename}: ${errorMsg}`);
            logger.error(`[GmailFetcher] Failed to download attachment ${attachment.filename}:`, error);

            // Zapisz log z błędem
            await this.prisma.gmailFetchLog.create({
              data: {
                messageUid,
                subject: msg.subject.substring(0, 500),
                sender: msg.sender.substring(0, 200),
                receivedAt: msg.date,
                attachmentName: attachment.filename.substring(0, 200),
                status: 'failed',
                errorMessage: errorMsg.substring(0, 500),
              },
            });
          }
        }

        // Przenieś mail do labela "Zaimportowane" (jeśli istnieje)
        try {
          await client.messageMove(String(msg.uid), 'Zaimportowane', { uid: true });
          logger.debug(`[GmailFetcher] Moved message ${msg.uid} to Zaimportowane`);
        } catch {
          // Label może nie istnieć - nie przerywaj, tylko zaloguj
          logger.warn(`[GmailFetcher] Could not move message ${msg.uid} to 'Zaimportowane' label. Create this label in Gmail to auto-organize processed emails.`);

          // Jako fallback, oznacz jako przeczytany
          try {
            await client.messageFlagsAdd(String(msg.uid), ['\\Seen'], { uid: true });
          } catch {
            logger.warn(`[GmailFetcher] Could not mark message ${msg.uid} as read`);
          }
        }
      }

      await client.logout();
      logger.info(`[GmailFetcher] Fetch complete: ${result.downloaded} downloaded, ${result.skipped} skipped, ${result.failed} failed`);

      if (result.failed > 0) {
        result.success = false;
      }

      emitGmailFetchCompleted({
        downloaded: result.downloaded,
        skipped: result.skipped,
        failed: result.failed,
        totalEmails: result.totalEmails,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Nieznany błąd';
      logger.error('[GmailFetcher] Fetch failed:', error);

      emitGmailFetchFailed({ error: errorMsg });

      return {
        success: false,
        totalEmails: result.totalEmails,
        downloaded: result.downloaded,
        skipped: result.skipped,
        failed: result.failed + 1,
        errors: [...result.errors, `Błąd połączenia IMAP: ${errorMsg}`],
      };
    }
  }

  /**
   * Znajdź załączniki CSV w strukturze MIME wiadomości
   */
  private findCsvAttachments(
    bodyStructure: any,
    partPath = ''
  ): Array<{ part: string; filename: string }> {
    const results: Array<{ part: string; filename: string }> = [];

    if (!bodyStructure) return results;

    // Sprawdź childNodes (multipart)
    if (bodyStructure.childNodes && Array.isArray(bodyStructure.childNodes)) {
      for (let i = 0; i < bodyStructure.childNodes.length; i++) {
        const childPart = partPath ? `${partPath}.${i + 1}` : `${i + 1}`;
        results.push(...this.findCsvAttachments(bodyStructure.childNodes[i], childPart));
      }
      return results;
    }

    // Sprawdź ten node - czy to CSV?
    const disposition = bodyStructure.disposition;
    const type = bodyStructure.type || '';
    const filename =
      bodyStructure.dispositionParameters?.filename ||
      bodyStructure.parameters?.name ||
      '';

    const isCsv =
      filename.toLowerCase().endsWith('.csv') ||
      type === 'text/csv' ||
      (disposition === 'attachment' && type.startsWith('text/'));

    if (isCsv && filename) {
      const part = partPath || '1';
      results.push({ part, filename });
    }

    return results;
  }

  /**
   * Pobierz historię pobranych maili
   */
  async getFetchLogs(limit = 50): Promise<any[]> {
    return this.prisma.gmailFetchLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Pobierz statystyki
   */
  async getStats(): Promise<{
    total: number;
    downloaded: number;
    failed: number;
    lastFetchAt: Date | null;
  }> {
    const [total, downloaded, failed, lastLog] = await Promise.all([
      this.prisma.gmailFetchLog.count(),
      this.prisma.gmailFetchLog.count({ where: { status: 'downloaded' } }),
      this.prisma.gmailFetchLog.count({ where: { status: 'failed' } }),
      this.prisma.gmailFetchLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      total,
      downloaded,
      failed,
      lastFetchAt: lastLog?.createdAt || null,
    };
  }
}
