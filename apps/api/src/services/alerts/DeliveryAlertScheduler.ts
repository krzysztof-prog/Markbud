/**
 * DeliveryAlertScheduler - Scheduler alertów gotowości dostaw
 *
 * Co 2 godziny (+ po starcie) sprawdza 3 najbliższe dostawy
 * nie będące jeszcze w produkcji/wysłane.
 * Sprawdza tylko: etykiety (label_check) i szyby (glass_delivery).
 * Wysyła przez WebSocket tylko negatywne wyniki.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../../utils/prisma.js';
import { LabelCheckModule } from '../readiness/modules/LabelCheckModule.js';
import { GlassDeliveryCheck } from '../readiness/modules/GlassDeliveryCheck.js';
import { eventEmitter } from '../event-emitter.js';
import { logger } from '../../utils/logger.js';

interface DeliveryIssue {
  deliveryId: number;
  deliveryNumber: string | null;
  deliveryDate: string;
  issues: string[];
}

interface ReadinessAlertPayload {
  type: 'readiness_issues';
  deliveries: DeliveryIssue[];
  timestamp: string;
}

class DeliveryAlertSchedulerClass {
  private task: ScheduledTask | null = null;
  private isRunning = false;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Uruchamia scheduler - co 2 godziny + 30s po starcie
   */
  start(): void {
    if (this.task) {
      logger.warn('[DeliveryAlertScheduler] Already started, ignoring');
      return;
    }

    // Co 2 godziny (Europe/Warsaw)
    this.task = cron.schedule(
      '0 */2 * * *',
      () => {
        this.checkNearestDeliveries().catch((error) => {
          logger.error('[DeliveryAlertScheduler] Error in scheduled check:', error);
        });
      },
      {
        timezone: 'Europe/Warsaw',
      }
    );

    // Uruchom sprawdzenie 30 sekund po starcie (żeby WebSocket był gotowy)
    this.startupTimer = setTimeout(() => {
      this.checkNearestDeliveries().catch((error) => {
        logger.error('[DeliveryAlertScheduler] Error in startup check:', error);
      });
    }, 30000);

    logger.info('[DeliveryAlertScheduler] Started - every 2h + startup check in 30s');
  }

  /**
   * Zatrzymuje scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    logger.info('[DeliveryAlertScheduler] Stopped');
  }

  /**
   * Sprawdza 3 najbliższe dostawy pod kątem szyb i etykiet
   */
  async checkNearestDeliveries(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[DeliveryAlertScheduler] Check already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Pobierz 3 najbliższe dostawy (nie wysłane/zakończone)
      const deliveries = await prisma.delivery.findMany({
        where: {
          deliveryDate: { gte: today },
          status: { notIn: ['shipped', 'delivered', 'completed'] },
          deletedAt: null,
        },
        orderBy: { deliveryDate: 'asc' },
        take: 3,
        select: {
          id: true,
          deliveryNumber: true,
          deliveryDate: true,
        },
      });

      logger.info(
        `[DeliveryAlertScheduler] Checking ${deliveries.length} nearest deliveries`
      );

      if (deliveries.length === 0) {
        logger.info('[DeliveryAlertScheduler] No upcoming deliveries found');
        return;
      }

      const labelModule = new LabelCheckModule(prisma);
      const glassModule = new GlassDeliveryCheck(prisma);

      const deliveriesWithIssues: DeliveryIssue[] = [];

      for (const delivery of deliveries) {
        try {
          const [labelResult, glassResult] = await Promise.all([
            labelModule.check(delivery.id),
            glassModule.check(delivery.id),
          ]);

          const issues: string[] = [];

          // Tylko negatywne wyniki (blocking lub warning, NIE ok)
          if (labelResult.status !== 'ok') {
            issues.push(`Etykiety: ${labelResult.message}`);
          }
          if (glassResult.status !== 'ok') {
            // Usuń techniczny fragment DATES: z wiadomości
            const cleanMessage = glassResult.message.replace(/\s*\|\s*DATES:.*$/, '');
            issues.push(`Szyby: ${cleanMessage}`);
          }

          if (issues.length > 0) {
            deliveriesWithIssues.push({
              deliveryId: delivery.id,
              deliveryNumber: delivery.deliveryNumber,
              deliveryDate: delivery.deliveryDate.toISOString(),
              issues,
            });
          }
        } catch (error) {
          logger.error(
            `[DeliveryAlertScheduler] Error checking delivery ${delivery.id}:`,
            error
          );
        }
      }

      // Wyślij event przez WebSocket (nawet pusty - żeby wyczyścić stare alerty)
      const payload: ReadinessAlertPayload = {
        type: 'readiness_issues',
        deliveries: deliveriesWithIssues,
        timestamp: new Date().toISOString(),
      };

      eventEmitter.emitDataChange({
        type: 'deliveryAlert',
        data: payload as unknown as Record<string, unknown>,
        timestamp: new Date(),
      });

      if (deliveriesWithIssues.length > 0) {
        logger.warn(
          `[DeliveryAlertScheduler] ${deliveriesWithIssues.length} deliveries have readiness issues`,
          {
            deliveries: deliveriesWithIssues.map((d) => ({
              id: d.deliveryId,
              number: d.deliveryNumber,
              issues: d.issues,
            })),
          }
        );
      } else {
        logger.info('[DeliveryAlertScheduler] All nearest deliveries OK - no issues');
      }

      const duration = Date.now() - startTime;
      logger.info(`[DeliveryAlertScheduler] Check completed in ${duration}ms`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ręczne wywołanie sprawdzenia (do testów)
   */
  async manualTrigger(): Promise<void> {
    logger.info('[DeliveryAlertScheduler] Manual trigger initiated');
    await this.checkNearestDeliveries();
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
