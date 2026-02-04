/**
 * DeliveryAlertScheduler - Scheduler alertów o zablokowanych dostawach
 *
 * Codziennie o 8:00 sprawdza czy jutrzejsze dostawy są zablokowane.
 * Jeśli tak - emituje event przez WebSocket.
 *
 * Użycie:
 * - Start: DeliveryAlertScheduler.start()
 * - Stop: DeliveryAlertScheduler.stop()
 * - Manual test: DeliveryAlertScheduler.manualTrigger()
 */

import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../../utils/prisma.js';
import { DeliveryReadinessAggregator } from '../readiness/DeliveryReadinessAggregator.js';
import { eventEmitter } from '../event-emitter.js';
import { logger } from '../../utils/logger.js';
import { formatDateWarsaw } from '../../utils/date-helpers.js';

// Typ dla payloadu alertu dostawy
interface DeliveryAlertPayload {
  type: 'blocked_tomorrow';
  deliveryId: number;
  deliveryNumber: string | null;
  deliveryDate: Date;
  blockingCount: number;
  blockingReasons: string[];
  timestamp: Date;
}

class DeliveryAlertSchedulerClass {
  private task: ScheduledTask | null = null;
  private aggregator: DeliveryReadinessAggregator | null = null;
  private isRunning = false;

  /**
   * Uruchamia scheduler - codziennie o 8:00 (Europe/Warsaw)
   */
  start(): void {
    if (this.task) {
      logger.warn('[DeliveryAlertScheduler] Already started, ignoring');
      return;
    }

    // Codziennie o 8:00 (Europe/Warsaw)
    this.task = cron.schedule(
      '0 8 * * *',
      () => {
        this.checkTomorrowDeliveries().catch((error) => {
          logger.error('[DeliveryAlertScheduler] Error in scheduled check:', error);
        });
      },
      {
        timezone: 'Europe/Warsaw',
      }
    );

    logger.info('[DeliveryAlertScheduler] Started - daily at 8:00 Europe/Warsaw');
  }

  /**
   * Zatrzymuje scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[DeliveryAlertScheduler] Stopped');
    }
  }

  /**
   * Sprawdza jutrzejsze dostawy pod kątem blokad
   */
  async checkTomorrowDeliveries(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[DeliveryAlertScheduler] Check already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Oblicz zakres dat dla jutra
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      logger.info(
        `[DeliveryAlertScheduler] Checking deliveries for ${formatDateWarsaw(tomorrow)}`
      );

      // Pobierz jutrzejsze dostawy (nie wysłane, nie usunięte)
      const deliveries = await prisma.delivery.findMany({
        where: {
          deliveryDate: {
            gte: tomorrow,
            lte: tomorrowEnd,
          },
          status: {
            not: 'shipped',
          },
          deletedAt: null,
        },
        select: {
          id: true,
          deliveryNumber: true,
          deliveryDate: true,
        },
      });

      logger.info(`[DeliveryAlertScheduler] Found ${deliveries.length} deliveries for tomorrow`);

      // Lazy initialization agregatora
      if (!this.aggregator) {
        this.aggregator = new DeliveryReadinessAggregator(prisma);
      }

      let blockedCount = 0;

      // Sprawdź każdą dostawę
      for (const delivery of deliveries) {
        try {
          const readiness = await this.aggregator.calculateReadiness(delivery.id);

          if (readiness.status === 'blocked') {
            blockedCount++;

            const alertPayload: DeliveryAlertPayload = {
              type: 'blocked_tomorrow',
              deliveryId: delivery.id,
              deliveryNumber: delivery.deliveryNumber,
              deliveryDate: delivery.deliveryDate,
              blockingCount: readiness.blocking.length,
              blockingReasons: readiness.blocking.map((b) => b.message),
              timestamp: new Date(),
            };

            // Emit event dla WebSocket (używa emitDataChange aby dotarło do klientów)
            eventEmitter.emitDataChange({
              type: 'deliveryAlert',
              data: alertPayload as unknown as Record<string, unknown>,
              timestamp: new Date(),
            });

            logger.warn(
              `[DeliveryAlertScheduler] Delivery ${delivery.deliveryNumber || delivery.id} is BLOCKED for tomorrow`,
              {
                deliveryId: delivery.id,
                blockingCount: readiness.blocking.length,
                blocking: readiness.blocking.map((b) => b.message),
              }
            );
          }
        } catch (error) {
          logger.error(
            `[DeliveryAlertScheduler] Error checking delivery ${delivery.id}:`,
            error
          );
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[DeliveryAlertScheduler] Check completed in ${duration}ms. ` +
          `Total: ${deliveries.length}, Blocked: ${blockedCount}`
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ręczne wywołanie sprawdzenia (do testów)
   */
  async manualTrigger(): Promise<void> {
    logger.info('[DeliveryAlertScheduler] Manual trigger initiated');
    await this.checkTomorrowDeliveries();
  }

  /**
   * Sprawdza czy scheduler jest uruchomiony
   */
  isStarted(): boolean {
    return this.task !== null;
  }
}

// Singleton export
export const DeliveryAlertScheduler = new DeliveryAlertSchedulerClass();
