/**
 * DeliveryEmailAlertScheduler - Raport emailowy o problemach w dostawach
 *
 * Harmonogram: 2x dziennie o 8:00 i 14:00 (Europe/Warsaw)
 * Odbiorcy: z tabeli Setting (klucz: email_alert_recipients)
 * Zakres: dostawy na najbliższe 14 dni
 *
 * Sprawdza:
 * - Brakujące zamówienia szyb
 * - Problemy z etykietami
 *
 * Wysyła email TYLKO jeżeli są problemy.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../../utils/prisma.js';
import { DeliveryEmailReportService, type EmailReportResult } from './DeliveryEmailReportService.js';
import { logger } from '../../utils/logger.js';

class DeliveryEmailAlertSchedulerClass {
  private task: ScheduledTask | null = null;
  private isRunning = false;
  private reportService: DeliveryEmailReportService | null = null;

  /**
   * Uruchom scheduler - 2x dziennie o 8:00 i 14:00 (Europe/Warsaw)
   */
  start(): void {
    if (this.task) {
      logger.warn('[DeliveryEmailAlertScheduler] Already started, ignoring');
      return;
    }

    // "0 8,13 * * *" = o pełnej godzinie o 8:00 i 13:00
    this.task = cron.schedule(
      '0 8,13 * * *',
      () => {
        this.runTask().catch((error) => {
          logger.error('[DeliveryEmailAlertScheduler] Błąd w zaplanowanym zadaniu:', error);
        });
      },
      {
        timezone: 'Europe/Warsaw',
      }
    );

    logger.info('[DeliveryEmailAlertScheduler] Uruchomiony - codziennie o 8:00 i 13:00 Europe/Warsaw');
  }

  /**
   * Zatrzymaj scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    logger.info('[DeliveryEmailAlertScheduler] Zatrzymany');
  }

  /**
   * Uruchom zadanie generowania i wysyłania raportu
   */
  async runTask(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[DeliveryEmailAlertScheduler] Zadanie już w trakcie, pomijam');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      if (!this.reportService) {
        this.reportService = new DeliveryEmailReportService(prisma);
      }

      logger.info('[DeliveryEmailAlertScheduler] Generowanie raportu emailowego...');

      const result = await this.reportService.generateAndSend();
      const duration = Date.now() - startTime;

      if (result.sent) {
        logger.info(
          `[DeliveryEmailAlertScheduler] Email wysłany w ${duration}ms. ` +
          `Odbiorcy: ${result.recipients.join(', ')}. ` +
          `Szyby: ${result.glassIssueCount}, Etykiety: ${result.labelIssueCount}. ` +
          `Sprawdzono dostaw: ${result.deliveriesChecked}`
        );
      } else if (!result.issuesFound) {
        logger.info(
          `[DeliveryEmailAlertScheduler] Brak problemów (${duration}ms). ` +
          `Sprawdzono dostaw: ${result.deliveriesChecked}. Email nie wysłany.`
        );
      } else {
        logger.error(
          `[DeliveryEmailAlertScheduler] Błąd wysyłki (${duration}ms): ${result.error}`
        );
      }
    } catch (error) {
      logger.error('[DeliveryEmailAlertScheduler] Błąd:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ręczne wyzwolenie (do testów z API)
   */
  async manualTrigger(): Promise<EmailReportResult> {
    logger.info('[DeliveryEmailAlertScheduler] Ręczne wyzwolenie');

    if (!this.reportService) {
      this.reportService = new DeliveryEmailReportService(prisma);
    }

    return this.reportService.generateAndSend();
  }

  /**
   * Podgląd raportu bez wysyłania
   */
  async previewReport(): Promise<{
    html: string;
    recipients: string[];
    data: {
      glassIssueCount: number;
      labelIssueCount: number;
      deliveriesChecked: number;
    };
  }> {
    if (!this.reportService) {
      this.reportService = new DeliveryEmailReportService(prisma);
    }

    const recipients = await this.reportService.getRecipients();
    const reportData = await this.reportService.gatherReportData();
    const html = this.reportService.buildEmailHtml(reportData);

    return {
      html,
      recipients,
      data: {
        glassIssueCount: reportData.glassIssues.length,
        labelIssueCount: reportData.labelIssues.length,
        deliveriesChecked: reportData.deliveriesChecked,
      },
    };
  }

  isStarted(): boolean {
    return this.task !== null;
  }
}

// Singleton export
export const DeliveryEmailAlertScheduler = new DeliveryEmailAlertSchedulerClass();
