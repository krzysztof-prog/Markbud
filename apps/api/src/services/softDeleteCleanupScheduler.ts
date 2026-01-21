/**
 * Soft Delete Cleanup Scheduler
 *
 * Uruchamia trwałe usuwanie soft-deleted rekordów raz w tygodniu w niedzielę o 3:00 w nocy.
 * Usuwa rekordy z deletedAt starszym niż 2 lata.
 *
 * NIE usuwa archiwum zleceń (archivedAt) - to jest zachowywane!
 */

import cron, { ScheduledTask } from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { SoftDeleteCleanupService } from './softDeleteCleanupService.js';
import { logger } from '../utils/logger.js';

export class SoftDeleteCleanupScheduler {
  private prisma: PrismaClient;
  private cleanupService: SoftDeleteCleanupService;
  private task: ScheduledTask | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.cleanupService = new SoftDeleteCleanupService(prisma);
  }

  /**
   * Uruchom scheduler
   * Cleanup uruchamiany w niedzielę o 3:00 w nocy
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[SoftDeleteCleanupScheduler] Scheduler już działa');
      return;
    }

    logger.info('[SoftDeleteCleanupScheduler] Uruchamianie schedulera...');

    // Cron: "0 3 * * 0" = niedziela o 3:00
    // Format: minute hour day-of-month month day-of-week
    // 0 = niedziela
    this.task = cron.schedule('0 3 * * 0', () => this.runCleanup(), {
      timezone: 'Europe/Warsaw',
    });

    this.isRunning = true;

    logger.info('[SoftDeleteCleanupScheduler] Scheduler uruchomiony. Cleanup w niedziele o 3:00 (Europe/Warsaw)');
  }

  /**
   * Zatrzymaj scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[SoftDeleteCleanupScheduler] Scheduler nie działa');
      return;
    }

    logger.info('[SoftDeleteCleanupScheduler] Zatrzymywanie schedulera...');

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.isRunning = false;

    logger.info('[SoftDeleteCleanupScheduler] Scheduler zatrzymany');
  }

  /**
   * Uruchom cleanup
   */
  private async runCleanup(): Promise<void> {
    logger.info('[SoftDeleteCleanupScheduler] Rozpoczynam zaplanowany cleanup soft-deleted rekordów...');

    try {
      const result = await this.cleanupService.cleanup(false); // false = nie dry run

      if (result.success) {
        if (result.totalDeleted > 0) {
          logger.info(
            `[SoftDeleteCleanupScheduler] Cleanup zakończony. Usunięto ${result.totalDeleted} rekordów`,
            { deletedCounts: result.deletedCounts }
          );
        } else {
          logger.debug('[SoftDeleteCleanupScheduler] Cleanup zakończony. Brak rekordów do usunięcia');
        }
      } else {
        logger.error('[SoftDeleteCleanupScheduler] Cleanup zakończony z błędami:', result.errors);
      }
    } catch (error) {
      logger.error('[SoftDeleteCleanupScheduler] Błąd podczas cleanup:', error);
    }
  }

  /**
   * Pobierz status schedulera
   */
  getStatus(): { isRunning: boolean; scheduledTime: string | null } {
    return {
      isRunning: this.isRunning,
      scheduledTime: this.isRunning ? 'Niedziela o 3:00 (Europe/Warsaw)' : null,
    };
  }

  /**
   * Ręczne uruchomienie cleanup (dry run - tylko pokazuje co zostanie usunięte)
   */
  async dryRun(): Promise<{
    stats: Array<{ model: string; toDeleteCount: number; oldestDeletedAt: Date | null }>;
    totalToDelete: number;
  }> {
    logger.info('[SoftDeleteCleanupScheduler] Dry run - sprawdzam co zostanie usunięte');
    const stats = await this.cleanupService.getCleanupStats();
    const totalToDelete = stats.reduce((sum, s) => sum + s.toDeleteCount, 0);
    return { stats, totalToDelete };
  }

  /**
   * Ręczne uruchomienie cleanup (faktyczne usuwanie)
   */
  async manualTrigger(): Promise<{
    totalDeleted: number;
    deletedCounts: Record<string, number>;
    errors: string[];
  }> {
    logger.info('[SoftDeleteCleanupScheduler] Ręczne uruchomienie cleanup');
    const result = await this.cleanupService.cleanup(false);
    return {
      totalDeleted: result.totalDeleted,
      deletedCounts: result.deletedCounts,
      errors: result.errors,
    };
  }
}

// Singleton instance
let schedulerInstance: SoftDeleteCleanupScheduler | null = null;

/**
 * Pobierz lub stwórz singleton instancję SoftDeleteCleanupScheduler
 */
export function getSoftDeleteCleanupScheduler(prisma: PrismaClient): SoftDeleteCleanupScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new SoftDeleteCleanupScheduler(prisma);
  }
  return schedulerInstance;
}

/**
 * Uruchom SoftDeleteCleanupScheduler
 */
export function startSoftDeleteCleanupScheduler(prisma: PrismaClient): void {
  const scheduler = getSoftDeleteCleanupScheduler(prisma);
  scheduler.start();
}

/**
 * Zatrzymaj SoftDeleteCleanupScheduler
 */
export function stopSoftDeleteCleanupScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
