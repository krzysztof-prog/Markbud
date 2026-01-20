/**
 * Order Archive Scheduler
 *
 * Uruchamia automatyczną archiwizację zleceń codziennie o 2:30 w nocy
 * Archiwizuje zlecenia wyprodukowane ponad 60 dni temu
 */

import cron, { ScheduledTask } from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { OrderArchiveService } from './orderArchiveService.js';
import { logger } from '../utils/logger.js';

export class OrderArchiveScheduler {
  private prisma: PrismaClient;
  private archiveService: OrderArchiveService;
  private task: ScheduledTask | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.archiveService = new OrderArchiveService(prisma);
  }

  /**
   * Uruchom scheduler
   * Archiwizacja uruchamiana codziennie o 2:30 w nocy (po innych schedulerach)
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[OrderArchiveScheduler] Scheduler już działa');
      return;
    }

    logger.info('[OrderArchiveScheduler] Uruchamianie schedulera...');

    // Cron: "30 2 * * *" = codziennie o 2:30
    this.task = cron.schedule('30 2 * * *', () => this.runArchive(), {
      timezone: 'Europe/Warsaw',
    });

    this.isRunning = true;

    logger.info('[OrderArchiveScheduler] Scheduler uruchomiony. Archiwizacja codziennie o 2:30 (Europe/Warsaw)');
  }

  /**
   * Zatrzymaj scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[OrderArchiveScheduler] Scheduler nie działa');
      return;
    }

    logger.info('[OrderArchiveScheduler] Zatrzymywanie schedulera...');

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.isRunning = false;

    logger.info('[OrderArchiveScheduler] Scheduler zatrzymany');
  }

  /**
   * Uruchom archiwizację
   */
  private async runArchive(): Promise<void> {
    logger.info('[OrderArchiveScheduler] Rozpoczynam zaplanowaną archiwizację...');

    try {
      const result = await this.archiveService.archiveOldCompletedOrders();

      if (result.success) {
        if (result.archivedCount > 0) {
          logger.info(
            `[OrderArchiveScheduler] Archiwizacja zakończona. Zarchiwizowano ${result.archivedCount} zleceń`
          );
        } else {
          logger.debug('[OrderArchiveScheduler] Archiwizacja zakończona. Brak zleceń do archiwizacji');
        }
      } else {
        logger.error('[OrderArchiveScheduler] Archiwizacja zakończona z błędami:', result.errors);
      }
    } catch (error) {
      logger.error('[OrderArchiveScheduler] Błąd podczas archiwizacji:', error);
    }
  }

  /**
   * Pobierz status schedulera
   */
  getStatus(): { isRunning: boolean; scheduledTime: string | null } {
    return {
      isRunning: this.isRunning,
      scheduledTime: this.isRunning ? 'Codziennie o 2:30 (Europe/Warsaw)' : null,
    };
  }

  /**
   * Ręczne uruchomienie archiwizacji (do testów lub ręcznych operacji)
   */
  async manualTrigger(): Promise<{ archivedCount: number; archivedOrderNumbers: string[] }> {
    logger.info('[OrderArchiveScheduler] Ręczne uruchomienie archiwizacji');
    const result = await this.archiveService.archiveOldCompletedOrders();
    return {
      archivedCount: result.archivedCount,
      archivedOrderNumbers: result.archivedOrderNumbers,
    };
  }
}

// Singleton instance
let schedulerInstance: OrderArchiveScheduler | null = null;

/**
 * Pobierz lub stwórz singleton instancję OrderArchiveScheduler
 */
export function getOrderArchiveScheduler(prisma: PrismaClient): OrderArchiveScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new OrderArchiveScheduler(prisma);
  }
  return schedulerInstance;
}

/**
 * Uruchom OrderArchiveScheduler
 */
export function startOrderArchiveScheduler(prisma: PrismaClient): void {
  const scheduler = getOrderArchiveScheduler(prisma);
  scheduler.start();
}

/**
 * Zatrzymaj OrderArchiveScheduler
 */
export function stopOrderArchiveScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
