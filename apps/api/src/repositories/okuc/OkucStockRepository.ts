/**
 * OkucStockRepository - Data access layer for stock/inventory management
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export class OkucStockRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find all stock with optional filters
   */
  async findAll(filters?: {
    articleId?: number;
    warehouseType?: string;
    subWarehouse?: string;
    belowMin?: boolean;
  }) {
    const where: Prisma.OkucStockWhereInput = {};

    if (filters?.articleId) {
      where.articleId = filters.articleId;
    }

    if (filters?.warehouseType) {
      where.warehouseType = filters.warehouseType;
    }

    if (filters?.subWarehouse) {
      where.subWarehouse = filters.subWarehouse;
    }

    if (filters?.belowMin) {
      where.AND = [
        { minStock: { not: null } },
        { currentQuantity: { lt: this.prisma.okucStock.fields.minStock } },
      ];
    }

    const stocks = await this.prisma.okucStock.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            articleId: true,
            name: true,
            description: true,
            orderUnit: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { warehouseType: 'asc' },
        { subWarehouse: 'asc' },
        { article: { articleId: 'asc' } },
      ],
    });

    logger.debug('Found stock', { count: stocks.length, filters });
    return stocks;
  }

  /**
   * Find stock by ID
   */
  async findById(id: number) {
    const stock = await this.prisma.okucStock.findUnique({
      where: { id },
      include: {
        article: {
          select: {
            id: true,
            articleId: true,
            name: true,
            description: true,
            orderUnit: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (stock) {
      logger.debug('Found stock by ID', { id });
    } else {
      logger.debug('Stock not found', { id });
    }

    return stock;
  }

  /**
   * Find stock by article ID and warehouse
   */
  async findByArticle(articleId: number, warehouseType: string, subWarehouse?: string | null) {
    const stock = await this.prisma.okucStock.findUnique({
      where: {
        articleId_warehouseType_subWarehouse: {
          articleId,
          warehouseType,
          subWarehouse: (subWarehouse ?? null) as any,
        },
      },
      include: {
        article: {
          select: {
            id: true,
            articleId: true,
            name: true,
            description: true,
            orderUnit: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (stock) {
      logger.debug('Found stock by article', { articleId, warehouseType, subWarehouse });
    } else {
      logger.debug('Stock not found by article', { articleId, warehouseType, subWarehouse });
    }

    return stock;
  }

  /**
   * Update stock (with optimistic locking)
   */
  async update(id: number, data: Partial<Prisma.OkucStockUncheckedUpdateInput>, userId: number) {
    try {
      const stock = await this.prisma.okucStock.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
          version: { increment: 1 },
        } as Prisma.OkucStockUncheckedUpdateInput,
        include: {
          article: {
            select: {
              id: true,
              articleId: true,
              name: true,
              description: true,
              orderUnit: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Updated stock', { id, articleId: stock.articleId, version: stock.version });
      return stock;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        logger.debug('Stock not found for update or version mismatch', { id });
        return null;
      }
      throw error;
    }
  }

  /**
   * Adjust stock quantity (add/subtract)
   */
  async adjustQuantity(stockId: number, quantity: number, version: number, userId: number) {
    try {
      const stock = await this.prisma.okucStock.update({
        where: {
          id: stockId,
          version,
        },
        data: {
          currentQuantity: { increment: quantity },
          updatedById: userId,
          version: { increment: 1 },
        },
        include: {
          article: {
            select: {
              id: true,
              articleId: true,
              name: true,
              description: true,
              orderUnit: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Adjusted stock quantity', {
        stockId,
        articleId: stock.articleId,
        adjustment: quantity,
        newQuantity: stock.currentQuantity,
        version: stock.version,
      });
      return stock;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        logger.debug('Stock not found for adjustment or version mismatch', { stockId, version });
        return null;
      }
      throw error;
    }
  }

  /**
   * Get stock summary grouped by warehouse
   */
  async getSummary(warehouseType?: string) {
    const where: Prisma.OkucStockWhereInput = {};

    if (warehouseType) {
      where.warehouseType = warehouseType;
    }

    const stocks = await this.prisma.okucStock.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            articleId: true,
            name: true,
            orderUnit: true,
          },
        },
      },
    });

    // Group by warehouse
    const summary = stocks.reduce((acc, stock) => {
      const key = `${stock.warehouseType}-${stock.subWarehouse || 'main'}`;
      if (!acc[key]) {
        acc[key] = {
          warehouseType: stock.warehouseType,
          subWarehouse: stock.subWarehouse,
          totalArticles: 0,
          totalQuantity: 0,
          belowMinCount: 0,
        };
      }

      acc[key].totalArticles += 1;
      acc[key].totalQuantity += stock.currentQuantity;

      if (stock.minStock && stock.currentQuantity < stock.minStock) {
        acc[key].belowMinCount += 1;
      }

      return acc;
    }, {} as Record<string, any>);

    logger.debug('Generated stock summary', { warehouseType, count: Object.keys(summary).length });
    return Object.values(summary);
  }

  /**
   * Find stock items below minimum level
   */
  async findBelowMinimum(warehouseType?: string) {
    const where: Prisma.OkucStockWhereInput = {
      minStock: { not: null },
    };

    if (warehouseType) {
      where.warehouseType = warehouseType;
    }

    const stocks = await this.prisma.okucStock.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            articleId: true,
            name: true,
            description: true,
            orderUnit: true,
            leadTimeDays: true,
            safetyDays: true,
          },
        },
      },
      orderBy: [
        { warehouseType: 'asc' },
        { subWarehouse: 'asc' },
      ],
    });

    // Filter to only include items below minimum
    const belowMin = stocks.filter(stock =>
      stock.minStock !== null && stock.currentQuantity < stock.minStock
    );

    logger.debug('Found stock below minimum', { warehouseType, count: belowMin.length });
    return belowMin;
  }

  /**
   * Create or update stock (upsert)
   */
  async upsert(
    articleId: number,
    warehouseType: string,
    subWarehouse: string | null,
    data: Partial<Prisma.OkucStockUncheckedUpdateInput>,
    userId: number
  ) {
    const stock = await this.prisma.okucStock.upsert({
      where: {
        articleId_warehouseType_subWarehouse: {
          articleId,
          warehouseType,
          subWarehouse: (subWarehouse ?? null) as any,
        },
      },
      create: {
        articleId,
        warehouseType,
        subWarehouse: subWarehouse ?? null,
        currentQuantity: (data.currentQuantity as number) || 0,
        reservedQty: (data.reservedQty as number) || 0,
        minStock: (data.minStock as number) || null,
        maxStock: (data.maxStock as number) || null,
        updatedById: userId,
      },
      update: {
        ...data,
        updatedById: userId,
        version: { increment: 1 },
      } as Prisma.OkucStockUncheckedUpdateInput,
      include: {
        article: {
          select: {
            id: true,
            articleId: true,
            name: true,
            description: true,
            orderUnit: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info('Upserted stock', {
      articleId,
      warehouseType,
      subWarehouse,
      stockId: stock.id,
      version: stock.version,
    });
    return stock;
  }

  /**
   * Get stock history for an article
   */
  async getHistory(filters?: {
    articleId?: number;
    warehouseType?: string;
    subWarehouse?: string;
    eventType?: string;
    isManualEdit?: boolean;
    fromDate?: Date;
    toDate?: Date;
    recordedById?: number;
  }) {
    const where: Prisma.OkucHistoryWhereInput = {};

    if (filters?.articleId) {
      where.articleId = filters.articleId;
    }

    if (filters?.warehouseType) {
      where.warehouseType = filters.warehouseType;
    }

    if (filters?.subWarehouse) {
      where.subWarehouse = filters.subWarehouse;
    }

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.isManualEdit !== undefined) {
      where.isManualEdit = filters.isManualEdit;
    }

    if (filters?.recordedById) {
      where.recordedById = filters.recordedById;
    }

    if (filters?.fromDate || filters?.toDate) {
      where.recordedAt = {};
      if (filters.fromDate) {
        where.recordedAt.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.recordedAt.lte = filters.toDate;
      }
    }

    const history = await this.prisma.okucHistory.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            articleId: true,
            name: true,
            orderUnit: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        editedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: 100, // Limit to 100 most recent entries
    });

    logger.debug('Found stock history', { count: history.length, filters });
    return history;
  }
}
