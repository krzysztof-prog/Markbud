import { PrismaClient } from '@prisma/client';
import { SchucoService } from './schucoService.js';
import { SchucoItemService } from './schucoItemService.js';
import { logger } from '../../utils/logger.js';

// Opóźnienie między pobraniem zamówień a pobieraniem pozycji (1 godzina)
const ITEM_FETCH_DELAY_MS = 60 * 60 * 1000;

// Godziny pobierania i archiwizacji
const FETCH_HOURS = [8, 12, 15];
const ARCHIVE_HOUR = 2;

// Co ile minut sprawdzać czy pora uruchomić (5 min)
const CHECK_INTERVAL_MINUTES = 5;

/**
 * Schuco Scheduler - automatyczne pobieranie danych 3 razy dziennie
 * Harmonogram: 8:00, 12:00, 15:00
 * Po pobraniu zamówień automatycznie pobiera pozycje dla nowych i zmienionych
 *
 * Implementacja: setInterval co 5 min sprawdza godzinę Warsaw
 * (bardziej odporne niż node-cron który gubi taski po dłuższym uptime)
 */
export class SchucoScheduler {
  private prisma: PrismaClient;
  private schucoService: SchucoService;
  private schucoItemService: SchucoItemService;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  // Śledzenie które godziny już uruchomiono dzisiaj (klucz: "YYYY-MM-DD_HH")
  private executedSlots = new Set<string>();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.schucoService = new SchucoService(prisma);
    this.schucoItemService = new SchucoItemService(prisma);
  }

  /**
   * Start scheduler
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

    // Sprawdzaj co 5 minut czy pora uruchomić
    this.intervalId = setInterval(
      () => this.tick(),
      CHECK_INTERVAL_MINUTES * 60 * 1000
    );

    this.isRunning = true;

    logger.info(
      `[SchucoScheduler] Scheduler started. Fetch: ${FETCH_HOURS.map(h => h + ':00').join(', ')}. ` +
        `Archive: ${ARCHIVE_HOUR}:00 (Europe/Warsaw), interval every ${CHECK_INTERVAL_MINUTES} min`
    );
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[SchucoScheduler] Not running');
      return;
    }

    logger.info('[SchucoScheduler] Stopping scheduler...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('[SchucoScheduler] Scheduler stopped');
  }

  /**
   * Tick co 5 min - sprawdza godzinę Warsaw i uruchamia odpowiednie zadania
   */
  private tick(): void {
    const now = new Date();
    const warsawTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
    const hour = warsawTime.getHours();
    const dateStr = warsawTime.toISOString().slice(0, 10);

    // Sprawdź godziny pobierania (8, 12, 15)
    for (const fetchHour of FETCH_HOURS) {
      const slotKey = `${dateStr}_${fetchHour}_fetch`;
      if (hour >= fetchHour && !this.executedSlots.has(slotKey)) {
        this.executedSlots.add(slotKey);
        logger.info(`[SchucoScheduler] Tick: ${hour}:xx Warsaw, triggering fetch for ${fetchHour}:00`);
        this.runFetch(`${fetchHour}:00`).catch((error) => {
          logger.error(`[SchucoScheduler] Fetch error (${fetchHour}:00):`, error);
        });
      }
    }

    // Sprawdź godzinę archiwizacji (2:00)
    const archiveSlotKey = `${dateStr}_${ARCHIVE_HOUR}_archive`;
    if (hour >= ARCHIVE_HOUR && !this.executedSlots.has(archiveSlotKey)) {
      this.executedSlots.add(archiveSlotKey);
      this.runArchive().catch((error) => {
        logger.error('[SchucoScheduler] Archive error:', error);
      });
    }

    // Czyszczenie starych slotów (z poprzednich dni)
    for (const key of this.executedSlots) {
      if (!key.startsWith(dateStr)) {
        this.executedSlots.delete(key);
      }
    }
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
   * Czeka 1h po fetch zamówień, potem pobiera pozycje dla nowych/zmienionych
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
      scheduledTimes: this.isRunning ? FETCH_HOURS.map(h => `${h}:00`) : [],
      archiveTime: this.isRunning ? `${ARCHIVE_HOUR}:00` : '',
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
