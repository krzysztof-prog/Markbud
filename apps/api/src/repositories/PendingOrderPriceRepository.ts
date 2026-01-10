/**
 * PendingOrderPrice Repository - Data access layer
 */

import { PrismaClient } from '@prisma/client';

export class PendingOrderPriceRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find pending prices older than specified days
   */
  async findOldPending(days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.prisma.pendingOrderPrice.findMany({
      where: {
        status: 'pending',
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        currency: true,
        valueNetto: true,
        filename: true,
        createdAt: true,
      },
    });
  }

  /**
   * Find applied prices older than specified days
   */
  async findOldApplied(days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.prisma.pendingOrderPrice.findMany({
      where: {
        status: 'applied',
        appliedAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        currency: true,
        valueNetto: true,
        filename: true,
        appliedAt: true,
        appliedToOrderId: true,
      },
    });
  }

  /**
   * Find all expired prices
   */
  async findExpired() {
    return this.prisma.pendingOrderPrice.findMany({
      where: {
        status: 'expired',
      },
      select: {
        id: true,
        orderNumber: true,
        currency: true,
        valueNetto: true,
        filename: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete pending prices by IDs
   */
  async deleteManyByIds(ids: number[]) {
    return this.prisma.pendingOrderPrice.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  /**
   * Mark old pending prices as expired
   */
  async markAsExpired(ids: number[]) {
    return this.prisma.pendingOrderPrice.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status: 'expired',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get cleanup statistics
   */
  async getStatistics() {
    const [total, pending, applied, expired] = await Promise.all([
      this.prisma.pendingOrderPrice.count(),
      this.prisma.pendingOrderPrice.count({ where: { status: 'pending' } }),
      this.prisma.pendingOrderPrice.count({ where: { status: 'applied' } }),
      this.prisma.pendingOrderPrice.count({ where: { status: 'expired' } }),
    ]);

    // Get oldest records per status
    const oldestPending = await this.prisma.pendingOrderPrice.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const oldestApplied = await this.prisma.pendingOrderPrice.findFirst({
      where: { status: 'applied' },
      orderBy: { appliedAt: 'asc' },
      select: { appliedAt: true },
    });

    const oldestExpired = await this.prisma.pendingOrderPrice.findFirst({
      where: { status: 'expired' },
      orderBy: { updatedAt: 'asc' },
      select: { updatedAt: true },
    });

    return {
      total,
      byStatus: {
        pending,
        applied,
        expired,
      },
      oldest: {
        pending: oldestPending?.createdAt || null,
        applied: oldestApplied?.appliedAt || null,
        expired: oldestExpired?.updatedAt || null,
      },
    };
  }

  /**
   * Get all pending prices with full details (for manual review)
   */
  async findAll(status?: string) {
    return this.prisma.pendingOrderPrice.findMany({
      where: status ? { status } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        fileImport: {
          select: {
            id: true,
            filename: true,
            status: true,
            processedAt: true,
          },
        },
      },
    });
  }
}
