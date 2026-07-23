/**
 * DeliveryEmailReportService - Generuje raport emailowy o problemach w dostawach
 *
 * Zbiera dane o:
 * 1. Brakujących zamówieniach szyb (reuses GlassDeliveryCheck)
 * 2. Problemach z etykietami (reuses LabelCheckModule)
 *
 * Zakres: dostawy na najbliższe 14 dni od dziś
 */

import type { PrismaClient } from '@prisma/client';
import { GlassDeliveryCheck } from '../readiness/modules/GlassDeliveryCheck.js';
import { LabelCheckModule } from '../readiness/modules/LabelCheckModule.js';
import { LabelCheckService } from '../label-check/LabelCheckService.js';
import { EmailService } from './EmailService.js';
import { logger } from '../../utils/logger.js';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  formatDateWarsawPolish,
  getStartOfDayWarsaw,
  getEndOfDayWarsaw,
  addDays,
} from '../../utils/date-helpers.js';

// Klucz w tabeli Setting z listą odbiorców (comma-separated emaile)
const RECIPIENTS_SETTING_KEY = 'email_alert_recipients';

interface OrderGlassDetail {
  orderNumber: string;
  totalGlasses: number;
  deliveredGlassCount: number;
  glassOrderStatus: string | null;
}

interface DeliveryGlassIssue {
  deliveryId: number;
  deliveryNumber: string | null;
  deliveryDate: Date;
  message: string;
  ordersWithoutGlass: OrderGlassDetail[];
}

interface LabelProblemOrder {
  orderNumber: string;
  reason: string;
}

interface DeliveryLabelIssue {
  deliveryId: number;
  deliveryNumber: string | null;
  deliveryDate: Date;
  message: string;
  problemOrders: LabelProblemOrder[];
}

export interface EmailReportData {
  glassIssues: DeliveryGlassIssue[];
  labelIssues: DeliveryLabelIssue[];
  deliveriesChecked: number;
  rangeStart: Date;
  rangeEnd: Date;
}

export interface EmailReportResult {
  sent: boolean;
  recipients: string[];
  issuesFound: boolean;
  glassIssueCount: number;
  labelIssueCount: number;
  deliveriesChecked: number;
  error?: string;
}

export class DeliveryEmailReportService {
  private prisma: PrismaClient;
  private emailService: EmailService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.emailService = new EmailService(prisma);
  }

  /**
   * Pobierz adresy email odbiorców z tabeli Setting
   */
  async getRecipients(): Promise<string[]> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: RECIPIENTS_SETTING_KEY },
    });

    if (!setting || !setting.value.trim()) {
      return [];
    }

    return setting.value
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));
  }

  /**
   * Zbierz dane raportu dla dostaw na najbliższe 14 dni
   */
  async gatherReportData(): Promise<EmailReportData> {
    const today = getStartOfDayWarsaw();
    const twoWeeksOut = getEndOfDayWarsaw(addDays(today, 14));

    // Pobierz dostawy w zakresie (nie wysłane/zakończone, nie usunięte, mające zlecenia)
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: today,
          lte: twoWeeksOut,
        },
        status: { in: ['planned', 'in_progress'] },
        deletedAt: null,
        deliveryOrders: { some: {} },
      },
      orderBy: { deliveryDate: 'asc' },
      select: {
        id: true,
        deliveryNumber: true,
        deliveryDate: true,
      },
    });

    const glassModule = new GlassDeliveryCheck(this.prisma);
    const labelModule = new LabelCheckModule(this.prisma);

    const glassIssues: DeliveryGlassIssue[] = [];
    const labelIssues: DeliveryLabelIssue[] = [];

    for (const delivery of deliveries) {
      try {
        // --- Sprawdzenie szyb ---
        const glassResult = await glassModule.check(delivery.id);
        if (glassResult.status !== 'ok') {
          const ordersWithoutGlass = await this.getOrdersMissingGlass(delivery.id);
          const cleanMessage = glassResult.message.replace(/\s*\|\s*DATES:.*$/, '');

          glassIssues.push({
            deliveryId: delivery.id,
            deliveryNumber: delivery.deliveryNumber,
            deliveryDate: delivery.deliveryDate,
            message: cleanMessage,
            ordersWithoutGlass,
          });
        }

        // --- Sprawdzenie etykiet ---
        const labelResult = await labelModule.check(delivery.id);
        if (labelResult.status !== 'ok') {
          const problemOrders: LabelProblemOrder[] = (labelResult.details || []).map((d) => ({
            orderNumber: d.itemId || 'Nieznane',
            reason: d.reason,
          }));

          labelIssues.push({
            deliveryId: delivery.id,
            deliveryNumber: delivery.deliveryNumber,
            deliveryDate: delivery.deliveryDate,
            message: labelResult.message,
            problemOrders,
          });
        }
      } catch (error) {
        logger.error(
          `[DeliveryEmailReport] Błąd sprawdzania dostawy ${delivery.id}:`,
          error
        );
      }
    }

    // Re-weryfikacja: dla zleceń z NO_FOLDER sprawdź ponownie czy folder już istnieje na dysku
    const verifiedLabelIssues = await this.reverifyNoFolderIssues(labelIssues);

    return {
      glassIssues,
      labelIssues: verifiedLabelIssues,
      deliveriesChecked: deliveries.length,
      rangeStart: today,
      rangeEnd: twoWeeksOut,
    };
  }

  /**
   * Re-weryfikacja zleceń z NO_FOLDER — sprawdza ponownie na dysku czy folder już istnieje.
   * Foldery mogą być dodane po ostatnim sprawdzeniu etykiet, więc raport nie powinien
   * zgłaszać problemu jeśli folder w międzyczasie się pojawił.
   */
  private async reverifyNoFolderIssues(labelIssues: DeliveryLabelIssue[]): Promise<DeliveryLabelIssue[]> {
    const basePath = LabelCheckService.BASE_PATH;
    const noFolderCount = labelIssues.reduce(
      (sum, issue) => sum + issue.problemOrders.filter((po) => po.reason.includes('Brak folderu z etykietą')).length,
      0
    );
    logger.info(
      `[DeliveryEmailReport] Re-weryfikacja folderów: ${noFolderCount} zleceń NO_FOLDER, basePath=${basePath}`
    );

    if (noFolderCount === 0) return labelIssues;

    const result: DeliveryLabelIssue[] = [];

    for (const issue of labelIssues) {
      // Odfiltruj zlecenia NO_FOLDER, dla których folder już istnieje
      const stillProblematic: LabelProblemOrder[] = [];

      for (const po of issue.problemOrders) {
        if (!po.reason.includes('Brak folderu z etykietą')) {
          // Nie jest NO_FOLDER — zachowaj bez zmian
          stillProblematic.push(po);
          continue;
        }

        // Sprawdź czy folder istnieje na dysku
        const folderPath = join(basePath, po.orderNumber);
        try {
          await access(folderPath);
          // Folder istnieje — pomijamy ten problem w raporcie
          logger.info(
            `[DeliveryEmailReport] Folder ${po.orderNumber} istnieje na dysku (${folderPath}) — pomijam w raporcie`
          );
        } catch (err) {
          // Folder nadal nie istnieje — zachowaj problem
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.warn(
            `[DeliveryEmailReport] Folder ${po.orderNumber} niedostępny: ${errMsg}`
          );
          stillProblematic.push(po);
        }
      }

      // Dodaj dostawę do raportu tylko jeśli nadal ma problemy
      if (stillProblematic.length > 0) {
        result.push({
          ...issue,
          problemOrders: stillProblematic,
          message: `${stillProblematic.length} etykiet ma błędy`,
        });
      } else if (issue.problemOrders.length > 0) {
        logger.info(
          `[DeliveryEmailReport] Dostawa ${issue.deliveryNumber || issue.deliveryId} — wszystkie foldery już istnieją, pomijam`
        );
      }
    }

    return result;
  }

  /**
   * Pobierz zlecenia bez zamówionych/dostarczonych szyb
   */
  private async getOrdersMissingGlass(deliveryId: number): Promise<OrderGlassDetail[]> {
    const deliveryOrders = await this.prisma.deliveryOrder.findMany({
      where: { deliveryId },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalGlasses: true,
            deliveredGlassCount: true,
            glassOrderStatus: true,
          },
        },
      },
    });

    const validStatuses = ['ordered', 'partial', 'complete'];

    return deliveryOrders
      .filter((do_) => {
        const total = do_.order.totalGlasses ?? 0;
        if (total === 0) return false;
        const delivered = do_.order.deliveredGlassCount ?? 0;
        if (delivered >= total) return false;
        if (validStatuses.includes(do_.order.glassOrderStatus ?? '')) return false;
        return true;
      })
      .map((do_) => ({
        orderNumber: do_.order.orderNumber,
        totalGlasses: do_.order.totalGlasses ?? 0,
        deliveredGlassCount: do_.order.deliveredGlassCount ?? 0,
        glassOrderStatus: do_.order.glassOrderStatus,
      }));
  }

  /**
   * Zbuduj HTML emaila z danymi raportu
   */
  buildEmailHtml(data: EmailReportData): string {
    const now = new Date();
    const nowStr = formatDateWarsawPolish(now);
    const rangeStr = `${formatDateWarsawPolish(data.rangeStart)} - ${formatDateWarsawPolish(data.rangeEnd)}`;

    const glassSection = data.glassIssues.length > 0
      ? this.buildGlassSection(data.glassIssues)
      : '';

    const labelSection = data.labelIssues.length > 0
      ? this.buildLabelSection(data.labelIssues)
      : '';

    const noIssuesMessage = data.glassIssues.length === 0 && data.labelIssues.length === 0
      ? '<p style="color: #16a34a; font-size: 16px; text-align: center; padding: 40px 0;">Wszystkie dostawy OK - brak problemów.</p>'
      : '';

    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Raport dostaw MARKBUD</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #333;">
  <div style="max-width: 800px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #1a56db; color: #fff; padding: 20px 30px;">
      <h1 style="margin: 0; font-size: 22px;">Raport problemów w dostawach</h1>
      <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">
        ${nowStr} | Zakres: ${rangeStr} | Sprawdzono: ${data.deliveriesChecked} dostaw
      </p>
    </div>
    <div style="padding: 20px 30px;">
      ${glassSection}
      ${labelSection}
      ${noIssuesMessage}
    </div>
    <div style="background-color: #f9fafb; padding: 15px 30px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
      Wygenerowano automatycznie przez system MARKBUD.
    </div>
  </div>
</body>
</html>`;
  }

  private buildGlassSection(issues: DeliveryGlassIssue[]): string {
    let rows = '';
    for (const issue of issues) {
      const dateStr = formatDateWarsawPolish(issue.deliveryDate);
      const deliveryLabel = issue.deliveryNumber || `#${issue.deliveryId}`;
      const ordersList = issue.ordersWithoutGlass
        .map((o) => o.orderNumber)
        .join(', ');

      rows += `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${deliveryLabel}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${dateStr}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${issue.message}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${ordersList || '-'}</td>
        </tr>`;
    }

    return `
      <h2 style="color: #dc2626; font-size: 18px; margin-top: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 8px;">
        Brakujące zamówienia szyb (${issues.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #fef2f2;">
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fecaca; font-size: 13px; color: #991b1b;">Dostawa</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fecaca; font-size: 13px; color: #991b1b;">Data dostawy</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fecaca; font-size: 13px; color: #991b1b;">Status szyb</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fecaca; font-size: 13px; color: #991b1b;">Zlecenia bez szyb</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>`;
  }

  private buildLabelSection(issues: DeliveryLabelIssue[]): string {
    let rows = '';
    for (const issue of issues) {
      const dateStr = formatDateWarsawPolish(issue.deliveryDate);
      const deliveryLabel = issue.deliveryNumber || `#${issue.deliveryId}`;

      if (issue.problemOrders.length > 0) {
        for (let i = 0; i < issue.problemOrders.length; i++) {
          const po = issue.problemOrders[i];
          rows += `
            <tr>
              ${i === 0
                ? `<td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;" rowspan="${issue.problemOrders.length}">${deliveryLabel}</td>
                   <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;" rowspan="${issue.problemOrders.length}">${dateStr}</td>`
                : ''
              }
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${po.orderNumber}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #b45309;">${this.formatLabelReason(po.reason)}</td>
            </tr>`;
        }
      } else {
        // Ogólna wiadomość bez szczegółów per zlecenie
        rows += `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${deliveryLabel}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${dateStr}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;" colspan="2">${issue.message}</td>
          </tr>`;
      }
    }

    return `
      <h2 style="color: #d97706; font-size: 18px; margin-top: 20px; border-bottom: 2px solid #d97706; padding-bottom: 8px;">
        Problemy z etykietami (${issues.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #fffbeb;">
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fde68a; font-size: 13px; color: #92400e;">Dostawa</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fde68a; font-size: 13px; color: #92400e;">Data dostawy</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fde68a; font-size: 13px; color: #92400e;">Zlecenie</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fde68a; font-size: 13px; color: #92400e;">Problem</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>`;
  }

  /**
   * Formatuje treść problemu z etykietą — wyciąga wykrytą datę i renderuje na czerwono
   */
  private formatLabelReason(reason: string): string {
    const detectedIdx = reason.indexOf('|||DETECTED:');
    if (detectedIdx === -1) return reason;
    const base = reason.slice(0, detectedIdx);
    const detectedDate = reason.slice(detectedIdx + '|||DETECTED:'.length);
    return `${base} <span style="color:#dc2626;font-weight:700">(wykryta: ${detectedDate})</span>`;
  }

  /**
   * Główna metoda: zbierz dane, zbuduj email, wyślij
   */
  async generateAndSend(): Promise<EmailReportResult> {
    const recipients = await this.getRecipients();
    if (recipients.length === 0) {
      logger.warn('[DeliveryEmailReport] Brak skonfigurowanych odbiorców (setting: email_alert_recipients)');
      return {
        sent: false,
        recipients: [],
        issuesFound: false,
        glassIssueCount: 0,
        labelIssueCount: 0,
        deliveriesChecked: 0,
        error: 'Brak skonfigurowanych odbiorców (email_alert_recipients)',
      };
    }

    const reportData = await this.gatherReportData();
    const hasIssues = reportData.glassIssues.length > 0 || reportData.labelIssues.length > 0;

    // Wyślij email TYLKO gdy są problemy
    if (!hasIssues) {
      logger.info('[DeliveryEmailReport] Brak problemów - email nie zostanie wysłany');
      return {
        sent: false,
        recipients,
        issuesFound: false,
        glassIssueCount: 0,
        labelIssueCount: 0,
        deliveriesChecked: reportData.deliveriesChecked,
      };
    }

    const html = this.buildEmailHtml(reportData);
    const subject = `MARKBUD - Problemy w dostawach (szyby: ${reportData.glassIssues.length}, etykiety: ${reportData.labelIssues.length})`;

    const result = await this.emailService.send({
      to: recipients,
      subject,
      html,
    });

    return {
      sent: result.success,
      recipients,
      issuesFound: true,
      glassIssueCount: reportData.glassIssues.length,
      labelIssueCount: reportData.labelIssues.length,
      deliveriesChecked: reportData.deliveriesChecked,
      error: result.error,
    };
  }
}
