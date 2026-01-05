/**
 * Import Lock Cleanup Scheduler
 *
 * Runs automatic cleanup of expired import locks every hour
 * This ensures locks don't remain indefinitely if process crashes or fails to release
 */

import cron, { ScheduledTask } from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { ImportLockService } from './importLockService.js';
import { logger } from '../utils/logger.js';

export class ImportLockCleanupScheduler {
  private prisma: PrismaClient;
  private lockService: ImportLockService;
  private task: ScheduledTask | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.lockService = new ImportLockService(prisma);
  }

  /**
   * Start scheduled cleanup task
   * Runs every hour at minute 0 (HH:00:00)
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[ImportLockCleanupScheduler] Already running');
      return;
    }

    logger.info('[ImportLockCleanupScheduler] Starting scheduler...');

    // Schedule for every hour at :00 minutes
    // Format: "minute hour day month dayOfWeek"
    // "0 * * * *" = every hour at minute 0
    this.task = cron.schedule('0 * * * *', () => this.runCleanup(), {
      timezone: 'Europe/Warsaw',
    });

    this.isRunning = true;

    logger.info(
      '[ImportLockCleanupScheduler] Scheduler started. Cleanup scheduled for every hour (Europe/Warsaw)'
    );
  }

  /**
   * Stop scheduled task
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[ImportLockCleanupScheduler] Not running');
      return;
    }

    logger.info('[ImportLockCleanupScheduler] Stopping scheduler...');

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.isRunning = false;

    logger.info('[ImportLockCleanupScheduler] Scheduler stopped');
  }

  /**
   * Run cleanup task
   * Removes expired import locks from database
   */
  private async runCleanup(): Promise<void> {
    logger.info('[ImportLockCleanupScheduler] Running scheduled cleanup...');

    try {
      const deletedCount = await this.lockService.cleanupExpiredLocks();

      if (deletedCount > 0) {
        logger.info(
          `[ImportLockCleanupScheduler] Scheduled cleanup completed. Removed ${deletedCount} expired lock(s)`
        );
      } else {
        logger.debug('[ImportLockCleanupScheduler] Scheduled cleanup completed. No expired locks found');
      }
    } catch (error) {
      logger.error('[ImportLockCleanupScheduler] Scheduled cleanup error:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; scheduledInterval: string | null } {
    return {
      isRunning: this.isRunning,
      scheduledInterval: this.isRunning ? 'Every hour at :00 minutes (Europe/Warsaw)' : null,
    };
  }

  /**
   * Manually trigger cleanup (for testing or manual operations)
   */
  async manualTrigger(): Promise<number> {
    logger.info('[ImportLockCleanupScheduler] Manual cleanup triggered');
    await this.runCleanup();

    // Return count of deleted locks
    const activeLocks = await this.lockService.getActiveLocks();
    return activeLocks.length;
  }
}

// Singleton instance for global access
let schedulerInstance: ImportLockCleanupScheduler | null = null;

/**
 * Get or create ImportLockCleanupScheduler singleton instance
 */
export function getImportLockCleanupScheduler(prisma: PrismaClient): ImportLockCleanupScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new ImportLockCleanupScheduler(prisma);
  }
  return schedulerInstance;
}

/**
 * Start the ImportLockCleanupScheduler
 */
export function startImportLockCleanupScheduler(prisma: PrismaClient): void {
  const scheduler = getImportLockCleanupScheduler(prisma);
  scheduler.start();
}

/**
 * Stop the ImportLockCleanupScheduler
 */
export function stopImportLockCleanupScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
