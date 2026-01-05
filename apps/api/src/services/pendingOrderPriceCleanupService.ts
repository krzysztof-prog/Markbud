/**
 * PendingOrderPrice Cleanup Service - Business logic layer
 *
 * Automatic cleanup policy:
 * - Pending records older than 30 days → mark as expired (don't delete immediately)
 * - Applied records older than 7 days → delete (already processed)
 * - Expired records → delete immediately
 */

import { PrismaClient } from '@prisma/client';
import { PendingOrderPriceRepository } from '../repositories/PendingOrderPriceRepository.js';
import { logger } from '../utils/logger.js';

export interface CleanupConfig {
  pendingMaxAgeDays: number; // Age at which pending records become expired
  appliedMaxAgeDays: number; // Age at which applied records are deleted
  deleteExpired: boolean; // Whether to delete expired records immediately
}

export interface CleanupResult {
  success: boolean;
  timestamp: Date;
  pendingExpired: number; // Records marked as expired
  appliedDeleted: number; // Applied records deleted
  expiredDeleted: number; // Expired records deleted
  totalAffected: number;
  errors?: string[];
}

export class PendingOrderPriceCleanupService {
  private repository: PendingOrderPriceRepository;
  private config: CleanupConfig;

  constructor(
    private prisma: PrismaClient,
    config?: Partial<CleanupConfig>
  ) {
    this.repository = new PendingOrderPriceRepository(prisma);
    this.config = {
      pendingMaxAgeDays: config?.pendingMaxAgeDays ?? 30,
      appliedMaxAgeDays: config?.appliedMaxAgeDays ?? 7,
      deleteExpired: config?.deleteExpired ?? true,
    };
  }

  /**
   * Run complete cleanup process
   */
  async runCleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    logger.info('[PendingOrderPriceCleanup] Starting cleanup process...', {
      config: this.config,
    });

    const result: CleanupResult = {
      success: true,
      timestamp: new Date(),
      pendingExpired: 0,
      appliedDeleted: 0,
      expiredDeleted: 0,
      totalAffected: 0,
      errors: [],
    };

    try {
      // Step 1: Mark old pending records as expired
      const pendingResult = await this.expireOldPending();
      result.pendingExpired = pendingResult.count;

      // Step 2: Delete old applied records
      const appliedResult = await this.deleteOldApplied();
      result.appliedDeleted = appliedResult.count;

      // Step 3: Delete expired records (if enabled)
      if (this.config.deleteExpired) {
        const expiredResult = await this.deleteExpired();
        result.expiredDeleted = expiredResult.count;
      }

      result.totalAffected = result.pendingExpired + result.appliedDeleted + result.expiredDeleted;

      const duration = Date.now() - startTime;
      logger.info('[PendingOrderPriceCleanup] Cleanup completed successfully', {
        duration: `${duration}ms`,
        result,
      });

      return result;
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors = [errorMessage];

      logger.error('[PendingOrderPriceCleanup] Cleanup failed', {
        error: errorMessage,
      });

      return result;
    }
  }

  /**
   * Mark old pending records as expired
   */
  private async expireOldPending(): Promise<{ count: number; records: any[] }> {
    logger.info(`[PendingOrderPriceCleanup] Finding pending records older than ${this.config.pendingMaxAgeDays} days...`);

    const oldRecords = await this.repository.findOldPending(this.config.pendingMaxAgeDays);

    if (oldRecords.length === 0) {
      logger.info('[PendingOrderPriceCleanup] No old pending records to expire');
      return { count: 0, records: [] };
    }

    logger.info(`[PendingOrderPriceCleanup] Found ${oldRecords.length} old pending records to expire`, {
      records: oldRecords.map(r => ({
        orderNumber: r.orderNumber,
        created: r.createdAt,
        ageInDays: Math.floor((Date.now() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    });

    const ids = oldRecords.map(r => r.id);
    await this.repository.markAsExpired(ids);

    logger.info(`[PendingOrderPriceCleanup] Marked ${oldRecords.length} pending records as expired`);

    return { count: oldRecords.length, records: oldRecords };
  }

  /**
   * Delete old applied records
   */
  private async deleteOldApplied(): Promise<{ count: number; records: any[] }> {
    logger.info(`[PendingOrderPriceCleanup] Finding applied records older than ${this.config.appliedMaxAgeDays} days...`);

    const oldRecords = await this.repository.findOldApplied(this.config.appliedMaxAgeDays);

    if (oldRecords.length === 0) {
      logger.info('[PendingOrderPriceCleanup] No old applied records to delete');
      return { count: 0, records: [] };
    }

    logger.info(`[PendingOrderPriceCleanup] Found ${oldRecords.length} old applied records to delete`, {
      records: oldRecords.map(r => ({
        orderNumber: r.orderNumber,
        appliedAt: r.appliedAt,
        orderId: r.appliedToOrderId,
      })),
    });

    const ids = oldRecords.map(r => r.id);
    const deleteResult = await this.repository.deleteManyByIds(ids);

    logger.info(`[PendingOrderPriceCleanup] Deleted ${deleteResult.count} applied records`);

    return { count: deleteResult.count, records: oldRecords };
  }

  /**
   * Delete expired records
   */
  private async deleteExpired(): Promise<{ count: number; records: any[] }> {
    logger.info('[PendingOrderPriceCleanup] Finding expired records to delete...');

    const expiredRecords = await this.repository.findExpired();

    if (expiredRecords.length === 0) {
      logger.info('[PendingOrderPriceCleanup] No expired records to delete');
      return { count: 0, records: [] };
    }

    logger.info(`[PendingOrderPriceCleanup] Found ${expiredRecords.length} expired records to delete`);

    const ids = expiredRecords.map(r => r.id);
    const deleteResult = await this.repository.deleteManyByIds(ids);

    logger.info(`[PendingOrderPriceCleanup] Deleted ${deleteResult.count} expired records`);

    return { count: deleteResult.count, records: expiredRecords };
  }

  /**
   * Get cleanup statistics
   */
  async getStatistics() {
    return this.repository.getStatistics();
  }

  /**
   * Get all pending prices (for manual review)
   */
  async getAllPendingPrices(status?: string) {
    return this.repository.findAll(status);
  }

  /**
   * Get configuration
   */
  getConfig(): CleanupConfig {
    return { ...this.config };
  }
}
