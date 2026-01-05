/**
 * OkucDemandRepository - Data access layer for demand management
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export class OkucDemandRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find all demands with optional filters
   */
  async findAll(filters?: {
    articleId?: number;
    orderId?: number;
    status?: string;
    source?: string;
    expectedWeek?: string;
    fromWeek?: string;
    toWeek?: string;
    isManualEdit?: boolean;
  }) {
    const where: Prisma.OkucDemandWhereInput = {};

    if (filters?.articleId) {
      where.articleId = filters.articleId;
    }

    if (filters?.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.source) {
      where.source = filters.source;
    }

    if (filters?.expectedWeek) {
      where.expectedWeek = filters.expectedWeek;
    }

    if (filters?.fromWeek || filters?.toWeek) {
      where.expectedWeek = {};

      if (filters.fromWeek) {
        where.expectedWeek.gte = filters.fromWeek;
      }

      if (filters.toWeek) {
        where.expectedWeek.lte = filters.toWeek;
      }
    }

    if (filters?.isManualEdit !== undefined) {
      where.isManualEdit = filters.isManualEdit;
    }

    const demands = await this.prisma.okucDemand.findMany({
      where,
      include: {
        article: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: [
        { expectedWeek: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    logger.debug('Found demands', { count: demands.length, filters });
    return demands;
  }

  /**
   * Find demand by ID
   */
  async findById(id: number) {
    const demand = await this.prisma.okucDemand.findUnique({
      where: { id },
      include: {
        article: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    if (!demand) {
      logger.warn('Demand not found', { id });
    }

    return demand;
  }

  /**
   * Get demand summary grouped by week
   */
  async getSummaryByWeek(filters?: {
    fromWeek?: string;
    toWeek?: string;
  }) {
    const where: Prisma.OkucDemandWhereInput = {};

    if (filters?.fromWeek || filters?.toWeek) {
      where.expectedWeek = {};

      if (filters.fromWeek) {
        where.expectedWeek.gte = filters.fromWeek;
      }

      if (filters.toWeek) {
        where.expectedWeek.lte = filters.toWeek;
      }
    }

    const demands = await this.prisma.okucDemand.groupBy({
      by: ['expectedWeek', 'articleId', 'status'],
      where,
      _sum: {
        quantity: true,
      },
      orderBy: {
        expectedWeek: 'asc',
      },
    });

    // Group by week and article for easier frontend consumption
    const summary = demands.reduce((acc, item) => {
      const week = item.expectedWeek;
      const articleId = item.articleId;
      const status = item.status;

      if (!acc[week]) {
        acc[week] = {};
      }

      if (!acc[week][articleId]) {
        acc[week][articleId] = {
          articleId,
          byStatus: {},
          total: 0,
        };
      }

      const quantity = item._sum.quantity || 0;
      acc[week][articleId].byStatus[status] = quantity;
      acc[week][articleId].total += quantity;

      return acc;
    }, {} as Record<string, Record<number, { articleId: number; byStatus: Record<string, number>; total: number }>>);

    logger.debug('Generated demand summary', { weeks: Object.keys(summary).length });
    return summary;
  }

  /**
   * Create a new demand
   */
  async create(data: {
    demandId?: string;
    articleId: number;
    orderId?: number;
    expectedWeek: string;
    quantity: number;
    status?: string;
    source?: string;
  }) {
    const demand = await this.prisma.okucDemand.create({
      data: {
        demandId: data.demandId,
        articleId: data.articleId,
        orderId: data.orderId,
        expectedWeek: data.expectedWeek,
        quantity: data.quantity,
        status: data.status || 'pending',
        source: data.source || 'manual',
      },
      include: {
        article: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    logger.info('Created demand', {
      id: demand.id,
      articleId: demand.articleId,
      expectedWeek: demand.expectedWeek,
      quantity: demand.quantity,
    });

    return demand;
  }

  /**
   * Update existing demand
   */
  async update(
    id: number,
    data: {
      quantity?: number;
      status?: string;
      expectedWeek?: string;
      editReason: string;
      lastEditById?: number;
    }
  ) {
    const updateData: Prisma.OkucDemandUpdateInput = {};

    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.expectedWeek !== undefined) updateData.expectedWeek = data.expectedWeek;

    // Always mark as manual edit when updating
    updateData.isManualEdit = true;
    updateData.editedAt = new Date();
    updateData.editedById = data.lastEditById;
    updateData.editReason = data.editReason;

    const demand = await this.prisma.okucDemand.update({
      where: { id },
      data: updateData,
      include: {
        article: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    logger.info('Updated demand', { id, changes: data });
    return demand;
  }

  /**
   * Delete demand
   */
  async delete(id: number) {
    const demand = await this.prisma.okucDemand.delete({
      where: { id },
    });

    logger.info('Deleted demand', { id, articleId: demand.articleId });
    return demand;
  }
}
