/**
 * PendingOrderPrice Cleanup Scheduler
 *
 * Runs automatic cleanup daily at 2:00 AM (Europe/Warsaw timezone)
 * This time is chosen to minimize impact on business operations
 */

import cron, { ScheduledTask } from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { PendingOrderPriceCleanupService } from './pendingOrderPriceCleanupService.js';
import { logger } from '../utils/logger.js';
import { CLEANUP_CONFIG } from '../config/cleanup.js';

export class PendingOrderPriceCleanupScheduler {
  private prisma: PrismaClient;
  private cleanupService: PendingOrderPriceCleanupService;
  private task: ScheduledTask | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    // Używamy centralnej konfiguracji z config/cleanup.ts
    this.cleanupService = new PendingOrderPriceCleanupService(prisma, CLEANUP_CONFIG);
  }

  /**
   * Start scheduled cleanup task
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[PendingPriceCleanupScheduler] Already running');
      return;
    }

    logger.info('[PendingPriceCleanupScheduler] Starting scheduler...');

    // Schedule for 2:00 AM daily (Europe/Warsaw timezone)
    this.task = cron.schedule('0 2 * * *', () => this.runCleanup(), {
      timezone: 'Europe/Warsaw',
    });

    this.isRunning = true;

    logger.info('[PendingPriceCleanupScheduler] Scheduler started. Cleanup scheduled for 2:00 AM daily (Europe/Warsaw)');
  }

  /**
   * Stop scheduled task
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[PendingPriceCleanupScheduler] Not running');
      return;
    }

    logger.info('[PendingPriceCleanupScheduler] Stopping scheduler...');

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.isRunning = false;

    logger.info('[PendingPriceCleanupScheduler] Scheduler stopped');
  }

  /**
   * Run cleanup task
   */
  private async runCleanup(): Promise<void> {
    logger.info('[PendingPriceCleanupScheduler] Running scheduled cleanup...');

    try {
      const result = await this.cleanupService.runCleanup();

      if (result.success) {
        logger.info(
          '[PendingPriceCleanupScheduler] Scheduled cleanup completed. ' +
            `Total affected: ${result.totalAffected}, ` +
            `Pending expired: ${result.pendingExpired}, ` +
            `Applied deleted: ${result.appliedDeleted}, ` +
            `Expired deleted: ${result.expiredDeleted}`
        );
      } else {
        logger.error('[PendingPriceCleanupScheduler] Scheduled cleanup failed', {
          errors: result.errors,
        });
      }
    } catch (error) {
      logger.error('[PendingPriceCleanupScheduler] Scheduled cleanup error:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; scheduledTime: string | null } {
    return {
      isRunning: this.isRunning,
      scheduledTime: this.isRunning ? '2:00 AM (Europe/Warsaw)' : null,
    };
  }

  /**
   * Manually trigger cleanup (for testing or manual operations)
   */
  async manualTrigger(): Promise<void> {
    logger.info('[PendingPriceCleanupScheduler] Manual cleanup triggered');
    return this.runCleanup();
  }
}

// Singleton instance for global access
let schedulerInstance: PendingOrderPriceCleanupScheduler | null = null;

export function getPendingPriceCleanupScheduler(prisma: PrismaClient): PendingOrderPriceCleanupScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new PendingOrderPriceCleanupScheduler(prisma);
  }
  return schedulerInstance;
}

export function startPendingPriceCleanupScheduler(prisma: PrismaClient): void {
  const scheduler = getPendingPriceCleanupScheduler(prisma);
  scheduler.start();
}

export function stopPendingPriceCleanupScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
