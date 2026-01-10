import cron, { ScheduledTask } from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { SchucoService } from './schucoService.js';
import { logger } from '../../utils/logger.js';

/**
 * Schuco Scheduler - automatyczne pobieranie danych 3 razy dziennie
 * Harmonogram: 8:00, 12:00, 15:00
 */
export class SchucoScheduler {
  private prisma: PrismaClient;
  private schucoService: SchucoService;
  private tasks: ScheduledTask[] = [];
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.schucoService = new SchucoService(prisma);
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

    this.tasks = [task8am, task12pm, task3pm];
    this.isRunning = true;

    logger.info('[SchucoScheduler] Scheduler started. Tasks scheduled for 8:00, 12:00, 15:00 (Europe/Warsaw)');
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
   * Run fetch task
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
      } else {
        logger.error(`[SchucoScheduler] Scheduled fetch failed (${scheduledTime}): ${result.errorMessage}`);
      }
    } catch (error) {
      logger.error(`[SchucoScheduler] Scheduled fetch error (${scheduledTime}):`, error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; scheduledTimes: string[] } {
    return {
      isRunning: this.isRunning,
      scheduledTimes: this.isRunning ? ['8:00', '12:00', '15:00'] : [],
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
