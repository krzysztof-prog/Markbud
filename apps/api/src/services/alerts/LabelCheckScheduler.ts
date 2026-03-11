/**
 * LabelCheckScheduler - Automatyczne sprawdzanie etykiet
 *
 * Codziennie o 7:00 sprawdza etykiety dla dostaw.
 * Zakres: od najbliższej niezrealizowanej dostawy + 21 dni do przodu.
 * Pomija dostawy które:
 * - mają ostatnie sprawdzenie ze wszystkimi etykietami OK (nie nadpisuje dobrych wyników)
 * - mają sprawdzenie w ciągu ostatnich 24h (nawet z błędami - nie spamuj)
 *
 * Implementacja: setInterval co 15 min sprawdza godzinę (bardziej odporne niż node-cron
 * który gubi taski raz-dziennie po dłuższym uptime).
 *
 * Użycie:
 * - Start: LabelCheckScheduler.start()
 * - Stop: LabelCheckScheduler.stop()
 * - Manual test: LabelCheckScheduler.manualTrigger()
 */

import { prisma } from '../../utils/prisma.js';
import { LabelCheckService } from '../label-check/LabelCheckService.js';
import { logger } from '../../utils/logger.js';
import { formatDateWarsaw } from '../../utils/date-helpers.js';

// Konfiguracja schedulera
const SCHEDULER_CONFIG = {
  // Godzina uruchomienia (7:00 rano Warsaw)
  targetHour: 7,
  // Ile dni do przodu sprawdzać (od najbliższej niezrealizowanej dostawy)
  daysAhead: 21,
  // Ile godzin od ostatniego sprawdzenia żeby pominąć (24h)
  skipIfCheckedWithinHours: 24,
  // Co ile minut sprawdzać czy pora uruchomić (15 min)
  checkIntervalMinutes: 15,
  // Opóźnienie po starcie serwera (60s - żeby DB/WebSocket były gotowe)
  startupDelayMs: 60_000,
};

class LabelCheckSchedulerClass {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private labelCheckService: LabelCheckService | null = null;
  private isRunning = false;
  // Dzień ostatniego uruchomienia (YYYY-MM-DD Warsaw) - żeby nie powtarzać w tym samym dniu
  private lastRunDate: string | null = null;

  /**
   * Uruchamia scheduler
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('[LabelCheckScheduler] Already started, ignoring');
      return;
    }

    // Sprawdzaj co 15 minut czy pora uruchomić
    this.intervalId = setInterval(
      () => this.tick(),
      SCHEDULER_CONFIG.checkIntervalMinutes * 60 * 1000
    );

    // Uruchom sprawdzenie 60s po starcie serwera (nadrabianie zaległości)
    this.startupTimer = setTimeout(() => {
      this.checkUpcomingDeliveries().catch((error) => {
        logger.error('[LabelCheckScheduler] Error in startup check:', error);
      });
    }, SCHEDULER_CONFIG.startupDelayMs);

    logger.info(
      `[LabelCheckScheduler] Started - daily at ${SCHEDULER_CONFIG.targetHour}:00 Europe/Warsaw, ` +
        `checking ${SCHEDULER_CONFIG.daysAhead} days ahead, ` +
        `interval every ${SCHEDULER_CONFIG.checkIntervalMinutes} min, ` +
        `startup check in ${SCHEDULER_CONFIG.startupDelayMs / 1000}s`
    );
  }

  /**
   * Zatrzymuje scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    logger.info('[LabelCheckScheduler] Stopped');
  }

  /**
   * Tick co 15 min - sprawdza czy pora uruchomić sprawdzanie (7:00 Warsaw)
   */
  private tick(): void {
    const now = new Date();
    // Oblicz godzinę Warsaw (UTC+1 zimą, UTC+2 latem)
    const warsawTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
    const hour = warsawTime.getHours();
    const dateStr = warsawTime.toISOString().slice(0, 10);

    // Uruchom jeśli: jest po targetHour (7:00) I nie uruchamiano dzisiaj
    if (hour >= SCHEDULER_CONFIG.targetHour && this.lastRunDate !== dateStr) {
      logger.info(`[LabelCheckScheduler] Tick: ${hour}:00 Warsaw, date=${dateStr}, triggering daily check`);
      this.checkUpcomingDeliveries().catch((error) => {
        logger.error('[LabelCheckScheduler] Error in scheduled check:', error);
      });
    }
  }

  /**
   * Sprawdza etykiety dla dostaw - od najbliższej niezrealizowanej + 21 dni
   */
  async checkUpcomingDeliveries(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[LabelCheckScheduler] Check already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    // Oznacz dzień jako obsłużony (Warsaw timezone)
    const now = new Date();
    const warsawTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
    this.lastRunDate = warsawTime.toISOString().slice(0, 10);

    try {
      // Znajdź najbliższą dostawę która NIE jest completed (zrealizowana)
      const nearestUncompletedDelivery = await prisma.delivery.findFirst({
        where: {
          status: {
            not: 'completed',
          },
          deletedAt: null,
          deliveryOrders: {
            some: {},
          },
        },
        orderBy: {
          deliveryDate: 'asc',
        },
        select: {
          deliveryDate: true,
        },
      });

      // Jeśli nie ma żadnej niezrealizowanej dostawy, kończymy
      if (!nearestUncompletedDelivery) {
        logger.info('[LabelCheckScheduler] No uncompleted deliveries found, skipping');
        return;
      }

      // Zakres: od daty najbliższej niezrealizowanej dostawy + 21 dni
      const startDate = new Date(nearestUncompletedDelivery.deliveryDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + SCHEDULER_CONFIG.daysAhead);
      endDate.setHours(23, 59, 59, 999);

      logger.info(
        `[LabelCheckScheduler] Checking deliveries from ${formatDateWarsaw(startDate)} to ${formatDateWarsaw(endDate)}`
      );

      // Pobierz dostawy w zakresie dat (nie zrealizowane, nie usunięte, mają zlecenia)
      const deliveries = await prisma.delivery.findMany({
        where: {
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            not: 'completed',
          },
          deletedAt: null,
          // Tylko dostawy które mają przypisane zlecenia
          deliveryOrders: {
            some: {},
          },
        },
        select: {
          id: true,
          deliveryNumber: true,
          deliveryDate: true,
          _count: {
            select: {
              deliveryOrders: true,
            },
          },
        },
        orderBy: {
          deliveryDate: 'asc',
        },
      });

      logger.info(
        `[LabelCheckScheduler] Found ${deliveries.length} uncompleted deliveries with orders in range`
      );

      // Oblicz próg czasowy dla pominięcia (ostatnie sprawdzenie < 24h temu)
      const skipThreshold = new Date();
      skipThreshold.setHours(
        skipThreshold.getHours() - SCHEDULER_CONFIG.skipIfCheckedWithinHours
      );

      // Lazy init serwisu
      if (!this.labelCheckService) {
        this.labelCheckService = new LabelCheckService(prisma);
      }

      let checkedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Sprawdź każdą dostawę
      for (const delivery of deliveries) {
        try {
          // Sprawdź najnowsze sprawdzenie (niezależnie od czasu)
          const latestCheck = await prisma.labelCheck.findFirst({
            where: {
              deliveryId: delivery.id,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              createdAt: true,
              status: true,
              okCount: true,
              mismatchCount: true,
              errorCount: true,
            },
          });

          // Pomiń jeśli ostatnie sprawdzenie ma wszystkie etykiety OK
          if (
            latestCheck &&
            latestCheck.status === 'completed' &&
            latestCheck.okCount > 0 &&
            latestCheck.mismatchCount === 0 &&
            latestCheck.errorCount === 0
          ) {
            logger.debug(
              `[LabelCheckScheduler] Skipping delivery ${delivery.deliveryNumber || delivery.id} - all labels OK (check #${latestCheck.id}, ${latestCheck.okCount} OK)`
            );
            skippedCount++;
            continue;
          }

          // Pomiń jeśli sprawdzono w ciągu 24h (nawet z błędami - nie spamuj)
          if (latestCheck && latestCheck.status === 'completed' && latestCheck.createdAt >= skipThreshold) {
            logger.debug(
              `[LabelCheckScheduler] Skipping delivery ${delivery.deliveryNumber || delivery.id} - checked ${latestCheck.createdAt.toISOString()}`
            );
            skippedCount++;
            continue;
          }

          // Uruchom sprawdzenie etykiet
          logger.info(
            `[LabelCheckScheduler] Checking labels for delivery ${delivery.deliveryNumber || delivery.id} (${delivery._count.deliveryOrders} orders)`
          );

          await this.labelCheckService.checkDelivery(delivery.id);
          checkedCount++;

          logger.info(
            `[LabelCheckScheduler] Completed check for delivery ${delivery.deliveryNumber || delivery.id}`
          );
        } catch (error) {
          errorCount++;
          logger.error(
            `[LabelCheckScheduler] Error checking delivery ${delivery.id}:`,
            error
          );
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[LabelCheckScheduler] Check completed in ${duration}ms. ` +
          `Checked: ${checkedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ręczne wywołanie sprawdzenia (do testów)
   */
  async manualTrigger(): Promise<void> {
    logger.info('[LabelCheckScheduler] Manual trigger initiated');
    await this.checkUpcomingDeliveries();
  }

  /**
   * Sprawdza czy scheduler jest uruchomiony
   */
  isStarted(): boolean {
    return this.intervalId !== null;
  }
}

// Singleton export
export const LabelCheckScheduler = new LabelCheckSchedulerClass();
