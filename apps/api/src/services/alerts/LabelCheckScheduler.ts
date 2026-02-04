/**
 * LabelCheckScheduler - Automatyczne sprawdzanie etykiet
 *
 * Codziennie o 7:00 sprawdza etykiety dla dostaw na najbliższe 14 dni.
 * Dla każdej dostawy która jeszcze nie ma sprawdzenia etykiet
 * (lub ma sprawdzenie starsze niż 24h), uruchamia LabelCheckService.
 *
 * Użycie:
 * - Start: LabelCheckScheduler.start()
 * - Stop: LabelCheckScheduler.stop()
 * - Manual test: LabelCheckScheduler.manualTrigger()
 */

import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../../utils/prisma.js';
import { LabelCheckService } from '../label-check/LabelCheckService.js';
import { logger } from '../../utils/logger.js';
import { formatDateWarsaw } from '../../utils/date-helpers.js';

// Konfiguracja schedulera
const SCHEDULER_CONFIG = {
  // Godzina uruchomienia (7:00 rano)
  cronExpression: '0 7 * * *',
  // Strefa czasowa
  timezone: 'Europe/Warsaw',
  // Ile dni do przodu sprawdzać
  daysAhead: 14,
  // Ile godzin od ostatniego sprawdzenia żeby pominąć (24h)
  skipIfCheckedWithinHours: 24,
};

class LabelCheckSchedulerClass {
  private task: ScheduledTask | null = null;
  private labelCheckService: LabelCheckService | null = null;
  private isRunning = false;

  /**
   * Uruchamia scheduler - codziennie o 7:00 (Europe/Warsaw)
   */
  start(): void {
    if (this.task) {
      logger.warn('[LabelCheckScheduler] Already started, ignoring');
      return;
    }

    this.task = cron.schedule(
      SCHEDULER_CONFIG.cronExpression,
      () => {
        this.checkUpcomingDeliveries().catch((error) => {
          logger.error('[LabelCheckScheduler] Error in scheduled check:', error);
        });
      },
      {
        timezone: SCHEDULER_CONFIG.timezone,
      }
    );

    logger.info(
      `[LabelCheckScheduler] Started - daily at 7:00 ${SCHEDULER_CONFIG.timezone}, checking ${SCHEDULER_CONFIG.daysAhead} days ahead`
    );
  }

  /**
   * Zatrzymuje scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[LabelCheckScheduler] Stopped');
    }
  }

  /**
   * Sprawdza etykiety dla dostaw na najbliższe 14 dni
   */
  async checkUpcomingDeliveries(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[LabelCheckScheduler] Check already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Oblicz zakres dat: od dziś do +14 dni
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + SCHEDULER_CONFIG.daysAhead);
      endDate.setHours(23, 59, 59, 999);

      logger.info(
        `[LabelCheckScheduler] Checking deliveries from ${formatDateWarsaw(today)} to ${formatDateWarsaw(endDate)}`
      );

      // Pobierz dostawy w zakresie dat (nie wysłane, nie usunięte, mają zlecenia)
      const deliveries = await prisma.delivery.findMany({
        where: {
          deliveryDate: {
            gte: today,
            lte: endDate,
          },
          status: {
            not: 'shipped',
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
        `[LabelCheckScheduler] Found ${deliveries.length} deliveries with orders in the next ${SCHEDULER_CONFIG.daysAhead} days`
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
          // Sprawdź czy jest ostatnie sprawdzenie w ciągu 24h
          const recentCheck = await prisma.labelCheck.findFirst({
            where: {
              deliveryId: delivery.id,
              createdAt: {
                gte: skipThreshold,
              },
              deletedAt: null,
            },
            select: {
              id: true,
              createdAt: true,
              status: true,
            },
          });

          if (recentCheck && recentCheck.status === 'completed') {
            logger.debug(
              `[LabelCheckScheduler] Skipping delivery ${delivery.deliveryNumber || delivery.id} - checked ${recentCheck.createdAt.toISOString()}`
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
    return this.task !== null;
  }
}

// Singleton export
export const LabelCheckScheduler = new LabelCheckSchedulerClass();
