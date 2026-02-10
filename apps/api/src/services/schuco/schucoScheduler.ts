import cron, { ScheduledTask } from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { SchucoService } from './schucoService.js';
import { SchucoItemService } from './schucoItemService.js';
import { logger } from '../../utils/logger.js';

// Opóźnienie między pobraniem zamówień a pobieraniem pozycji (1 godzina)
const ITEM_FETCH_DELAY_MS = 60 * 60 * 1000;

/**
 * Schuco Scheduler - automatyczne pobieranie danych 3 razy dziennie
 * Harmonogram: 8:00, 12:00, 15:00
 * Po pobraniu zamówień automatycznie pobiera pozycje dla nowych i zmienionych
 */
export class SchucoScheduler {
  private prisma: PrismaClient;
  private schucoService: SchucoService;
  private schucoItemService: SchucoItemService;
  private tasks: ScheduledTask[] = [];
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.schucoService = new SchucoService(prisma);
    this.schucoItemService = new SchucoItemService(prisma);
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[SchucoScheduler] Already running');
      return;
    }

    logger.info('[SchucoScheduler] Starting scheduler...');

    // Wyczyść stare pending logi przy starcie
    this.schucoService.cleanupStalePendingLogs().catch((error) => {
      logger.error('[SchucoScheduler] Failed to cleanup stale pending logs on start:', error);
    });

    // Schedule for 8:00 AM (Europe/Warsaw timezone)
    const task8am = cron.schedule('0 8 * * *', () => this.runFetch('8:00'), {
      timezone: 'Europe/Warsaw',
    });

    // Schedule for 12:00 PM (noon)
    const task12pm = cron.schedule('0 12 * * *', () => this.runFetch('12:00'), {
      timezone: 'Europe/Warsaw',
    });

    // Schedule for 3:00 PM
    const task3pm = cron.schedule('0 15 * * *', () => this.runFetch('15:00'), {
      timezone: 'Europe/Warsaw',
    });

    // Schedule archiving at 2:00 AM (nocna archiwizacja starych zamówień)
    const taskArchive = cron.schedule('0 2 * * *', () => this.runArchive(), {
      timezone: 'Europe/Warsaw',
    });

    this.tasks = [task8am, task12pm, task3pm, taskArchive];
    this.isRunning = true;

    logger.info('[SchucoScheduler] Scheduler started. Fetch: 8:00, 12:00, 15:00. Archive: 2:00 (Europe/Warsaw)');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[SchucoScheduler] Not running');
      return;
    }

    logger.info('[SchucoScheduler] Stopping scheduler...');

    for (const task of this.tasks) {
      task.stop();
    }

    this.tasks = [];
    this.isRunning = false;

    logger.info('[SchucoScheduler] Scheduler stopped');
  }

  /**
   * Run fetch task - pobiera zamówienia, a po sukcesie automatycznie pobiera pozycje
   */
  private async runFetch(scheduledTime: string): Promise<void> {
    logger.info(`[SchucoScheduler] Running scheduled fetch (${scheduledTime})...`);

    try {
      // Wyczyść stare pending logi przed nowym pobieraniem
      await this.schucoService.cleanupStalePendingLogs();

      const result = await this.schucoService.fetchAndStoreDeliveries(true, 'scheduled');

      if (result.success) {
        logger.info(
          `[SchucoScheduler] Scheduled fetch completed (${scheduledTime}). ` +
            `Records: ${result.recordsCount}, New: ${result.newRecords}, ` +
            `Updated: ${result.updatedRecords}, Unchanged: ${result.unchangedRecords}`
        );

        // Automatyczne pobieranie pozycji - ZAWSZE wywołaj (metoda sama sprawdzi które zamówienia potrzebują pozycji)
        // Dotyczy: nowych zamówień, zmienionych, oraz tych które nigdy nie miały pobranych pozycji
        await this.runItemAutoFetch(scheduledTime, result.newRecords ?? 0, result.updatedRecords ?? 0);
      } else {
        logger.error(`[SchucoScheduler] Scheduled fetch failed (${scheduledTime}): ${result.errorMessage}`);
      }
    } catch (error) {
      logger.error(`[SchucoScheduler] Scheduled fetch error (${scheduledTime}):`, error);
    }
  }

  /**
   * Automatyczne pobieranie pozycji po pobraniu zamówień
   * Czeka 2 minuty po fetch zamówień, potem pobiera pozycje dla nowych/zmienionych
   */
  private async runItemAutoFetch(scheduledTime: string, newOrders: number, updatedOrders: number): Promise<void> {
    logger.info(
      `[SchucoScheduler] Waiting ${ITEM_FETCH_DELAY_MS / 1000}s before item auto-fetch ` +
        `(${newOrders} new, ${updatedOrders} updated orders)...`
    );

    // Czekaj aby sesja Schuco się zakończyła i baza się ustabilizowała
    await new Promise((resolve) => setTimeout(resolve, ITEM_FETCH_DELAY_MS));

    try {
      if (this.schucoItemService.isItemFetchRunning()) {
        logger.warn('[SchucoScheduler] Item fetch already running - skipping auto-fetch');
        return;
      }

      const itemResult = await this.schucoItemService.autoFetchChangedItems();

      if (itemResult) {
        logger.info(
          `[SchucoScheduler] Item auto-fetch completed (${scheduledTime}). ` +
            `Deliveries: ${itemResult.processedDeliveries}/${itemResult.totalDeliveries}, ` +
            `Items - new: ${itemResult.newItems}, updated: ${itemResult.updatedItems}, errors: ${itemResult.errors}`
        );
      } else {
        logger.info(`[SchucoScheduler] Item auto-fetch skipped (${scheduledTime}) - already running or no items needed`);
      }
    } catch (error) {
      // Błąd pobierania pozycji NIE powinien wpływać na główny flow
      logger.error(`[SchucoScheduler] Item auto-fetch error (${scheduledTime}):`, error);
    }
  }

  /**
   * Run archive task - archiwizuj stare zrealizowane zamówienia
   */
  private async runArchive(): Promise<void> {
    logger.info('[SchucoScheduler] Running scheduled archive (2:00)...');

    try {
      const result = await this.schucoService.archiveOldDeliveries();

      logger.info(
        `[SchucoScheduler] Scheduled archive completed (2:00). ` +
          `Archived: ${result.archivedCount} deliveries`
      );
    } catch (error) {
      logger.error('[SchucoScheduler] Scheduled archive error (2:00):', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; scheduledTimes: string[]; archiveTime: string; itemAutoFetchEnabled: boolean } {
    return {
      isRunning: this.isRunning,
      scheduledTimes: this.isRunning ? ['8:00', '12:00', '15:00'] : [],
      archiveTime: this.isRunning ? '2:00' : '',
      itemAutoFetchEnabled: this.isRunning,
    };
  }
}

// Singleton instance for global access
let schedulerInstance: SchucoScheduler | null = null;

export function getSchucoScheduler(prisma: PrismaClient): SchucoScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new SchucoScheduler(prisma);
  }
  return schedulerInstance;
}

export function startSchucoScheduler(prisma: PrismaClient): void {
  const scheduler = getSchucoScheduler(prisma);
  scheduler.start();
}

export function stopSchucoScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
