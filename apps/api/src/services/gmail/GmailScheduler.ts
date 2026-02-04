import cron, { ScheduledTask } from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { GmailFetcherService } from './GmailFetcherService.js';
import { logger } from '../../utils/logger.js';

/**
 * Gmail Scheduler - automatyczne pobieranie CSV z Gmail co godzinę
 * Harmonogram: co godzinę o :05 (np. 7:05, 8:05, 9:05...)
 * Tylko w godzinach roboczych: 6:05 - 20:05
 */
export class GmailScheduler {
  private prisma: PrismaClient;
  private gmailService: GmailFetcherService;
  private task: ScheduledTask | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.gmailService = new GmailFetcherService(prisma);
  }

  /**
   * Start schedulera
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[GmailScheduler] Already running');
      return;
    }

    logger.info('[GmailScheduler] Starting scheduler...');

    // Co godzinę o :05, w godzinach 6-20 (pon-sob)
    this.task = cron.schedule('5 6-20 * * 1-6', () => this.runFetch(), {
      timezone: 'Europe/Warsaw',
    });

    this.isRunning = true;
    logger.info('[GmailScheduler] Scheduler started. Fetch: co godzinę o :05 (6:05-20:05, pon-sob, Europe/Warsaw)');
  }

  /**
   * Stop schedulera
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[GmailScheduler] Not running');
      return;
    }

    logger.info('[GmailScheduler] Stopping scheduler...');

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.isRunning = false;
    logger.info('[GmailScheduler] Scheduler stopped');
  }

  /**
   * Uruchom pobieranie
   */
  private async runFetch(): Promise<void> {
    logger.info('[GmailScheduler] Running scheduled Gmail fetch...');

    try {
      // Sprawdź czy Gmail jest włączony
      const config = await this.gmailService.getConfig();
      if (!config || !config.enabled) {
        logger.debug('[GmailScheduler] Gmail IMAP disabled, skipping');
        return;
      }

      const result = await this.gmailService.fetchEmails();

      if (result.success) {
        logger.info(
          `[GmailScheduler] Fetch completed. Downloaded: ${result.downloaded}, ` +
          `Skipped: ${result.skipped}, Total unread: ${result.totalEmails}`
        );
      } else {
        logger.error(
          `[GmailScheduler] Fetch completed with errors. Downloaded: ${result.downloaded}, ` +
          `Failed: ${result.failed}. Errors: ${result.errors.join('; ')}`
        );
      }
    } catch (error) {
      logger.error('[GmailScheduler] Scheduled fetch error:', error);
    }
  }

  /**
   * Status schedulera
   */
  getStatus(): { isRunning: boolean; schedule: string } {
    return {
      isRunning: this.isRunning,
      schedule: this.isRunning ? 'co godzinę o :05 (6:05-20:05, pon-sob)' : '',
    };
  }

  /**
   * Dostęp do serwisu (dla ręcznego pobierania z API)
   */
  getService(): GmailFetcherService {
    return this.gmailService;
  }
}

// Singleton instance
let schedulerInstance: GmailScheduler | null = null;

export function getGmailScheduler(prisma: PrismaClient): GmailScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new GmailScheduler(prisma);
  }
  return schedulerInstance;
}

export function startGmailScheduler(prisma: PrismaClient): void {
  const scheduler = getGmailScheduler(prisma);
  scheduler.start();
}

export function stopGmailScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
