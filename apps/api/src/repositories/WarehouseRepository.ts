/**
 * Warehouse Repository - Database access layer
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { profileBasicSelect } from '../utils/prisma-selects.js';
import { PaginationParams, PaginatedResponse } from '../validators/common';
import { OptimisticLockError } from '../utils/optimistic-locking.js';
import { logger } from '../utils/logger.js';

export class WarehouseRepository {
  constructor(private prisma: PrismaClient) {}

  async getStock(profileId?: number, colorId?: number, pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    const where: Prisma.WarehouseStockWhereInput = {
      deletedAt: null, // Exclude soft-deleted stock records
    };
    if (profileId) where.profileId = profileId;
    if (colorId) where.colorId = colorId;

    // Get total count for pagination
    const total = await this.prisma.warehouseStock.count({ where });

    // Get paginated data
    const data = await this.prisma.warehouseStock.findMany({
      where,
      select: {
        id: true,
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
      orderBy: [{ profile: { number: 'asc' } }, { color: { code: 'asc' } }],
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 50,
    });

    return {
      data,
      total,
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 50,
    };
  }

  /**
   * Update warehouse stock with optimistic locking
   *
   * @param id - Stock record ID
   * @param currentStockBeams - New stock value
   * @param expectedVersion - Expected version for optimistic lock (optional)
   * @throws OptimisticLockError if version mismatch detected
   */
  async updateStock(
    id: number,
    currentStockBeams: number,
    expectedVersion?: number
  ) {
    // If version checking is enabled
    if (expectedVersion !== undefined) {
      const result = await this.prisma.warehouseStock.updateMany({
        where: {
          id,
          version: expectedVersion, // Only update if version matches
        },
        data: {
          currentStockBeams,
          version: { increment: 1 }, // Increment version
        },
      });

      // Check if update succeeded
      if (result.count === 0) {
        // Fetch current record to get actual version
        const current = await this.prisma.warehouseStock.findUnique({
          where: { id },
          select: { version: true },
        });

        logger.warn('Optimistic lock conflict detected', {
          stockId: id,
          expectedVersion,
          currentVersion: current?.version,
        });

        throw new OptimisticLockError(
          `Stock record was modified by another process`,
          current?.version ?? -1
        );
      }

      // Return updated record
      return this.prisma.warehouseStock.findUnique({ where: { id } });
    }

    // Fallback: simple update without version check
    return this.prisma.warehouseStock.update({
      where: { id },
      data: {
        currentStockBeams,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Get stock by profile and color with version for optimistic locking
   */
  async getStockByProfileColor(profileId: number, colorId: number) {
    return this.prisma.warehouseStock.findUnique({
      where: {
        profileId_colorId: {
          profileId,
          colorId,
        },
      },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        version: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
    });
  }

  /**
   * Get all stocks for a specific color
   */
  async getStocksByColor(colorId: number) {
    return this.prisma.warehouseStock.findMany({
      where: {
        colorId,
        deletedAt: null, // Exclude soft-deleted stock records
      },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        version: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
      orderBy: { profile: { number: 'asc' } },
    });
  }

  /**
   * Get aggregated demands by color using Prisma groupBy
   */
  async getDemandsByColor(colorId: number) {
    return this.prisma.orderRequirement.groupBy({
      by: ['profileId'],
      where: {
        colorId,
        order: {
          status: { in: ['new', 'in_progress'] },
        },
      },
      _sum: {
        beamsCount: true,
      },
    });
  }

  /**
   * Get warehouse orders for a specific color
   */
  async getWarehouseOrdersByColor(colorId: number) {
    return this.prisma.warehouseOrder.findMany({
      where: { colorId, status: { not: 'archived' } },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        orderedBeams: true,
        createdAt: true,
        status: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get color information by ID
   */
  async getColorInfo(colorId: number) {
    return this.prisma.color.findUnique({
      where: { id: colorId },
      select: {
        id: true,
        code: true,
        name: true,
        hexColor: true,
      },
    });
  }

  /**
   * Get warehouse settings
   */
  async getSettings() {
    return this.prisma.setting.findUnique({
      where: { key: 'criticalStockLevel' },
      select: {
        value: true,
      },
    });
  }

  /**
   * Get all stocks with demands using optimized raw SQL query
   * This method calculates shortages for all profile-color combinations
   */
  async getAllStocksWithDemands() {
    const result = await this.prisma.$queryRaw<
      Array<{
        profileId: number;
        colorId: number;
        currentStockBeams: number;
        totalDemand: number | null;
        shortage: number;
        profileNumber: string;
        profileName: string;
        colorCode: string;
        colorName: string;
        hexColor: string | null;
      }>
    >`
      SELECT
        ws.profile_id as profileId,
        ws.color_id as colorId,
        ws.current_stock_beams as currentStockBeams,
        COALESCE(SUM(r.beams_count), 0) as totalDemand,
        COALESCE(SUM(r.beams_count), 0) - ws.current_stock_beams as shortage,
        p.number as profileNumber,
        p.name as profileName,
        c.code as colorCode,
        c.name as colorName,
        c.hex_color as hexColor
      FROM warehouse_stock ws
      INNER JOIN profiles p ON ws.profile_id = p.id
      INNER JOIN colors c ON ws.color_id = c.id
      LEFT JOIN order_requirements r ON r.profile_id = ws.profile_id
        AND r.color_id = ws.color_id
        AND r.order_id IN (
          SELECT id FROM orders
          WHERE status IN ('new', 'in_progress')
        )
      WHERE ws.deleted_at IS NULL
      GROUP BY ws.profile_id, ws.color_id, ws.current_stock_beams,
               p.number, p.name, c.code, c.name, c.hex_color
      HAVING COALESCE(SUM(r.beams_count), 0) > ws.current_stock_beams
      ORDER BY shortage DESC, p.number ASC, c.code ASC
    `;

    return result.map((row) => ({
      ...row,
      totalDemand: row.totalDemand || 0,
    }));
  }

  /**
   * Get all warehouse orders
   */
  async getAllWarehouseOrders() {
    return this.prisma.warehouseOrder.findMany({
      where: { status: { not: 'archived' } },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        orderedBeams: true,
        createdAt: true,
        status: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update stock for a profile-color combination in a transaction
   * Creates history record for the change
   */
  async updateStockTransaction(
    colorId: number,
    profileId: number,
    stockBeams: number,
    userId: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Find or create stock record
      const existingStock = await tx.warehouseStock.findUnique({
        where: {
          profileId_colorId: {
            profileId,
            colorId,
          },
        },
      });

      let stock;
      if (existingStock) {
        stock = await tx.warehouseStock.update({
          where: { id: existingStock.id },
          data: {
            currentStockBeams: stockBeams,
            version: { increment: 1 },
          },
        });
      } else {
        stock = await tx.warehouseStock.create({
          data: {
            profileId,
            colorId,
            currentStockBeams: stockBeams,
          },
        });
      }

      // Create history record
      await tx.warehouseHistory.create({
        data: {
          profileId,
          colorId,
          changeType: 'manual_adjustment',
          previousStock: existingStock?.currentStockBeams ?? 0,
          currentStock: stockBeams,
          calculatedStock: stockBeams,
          actualStock: stockBeams,
          difference: 0,
          recordedById: userId,
        },
      });

      return stock;
    });
  }

  /**
   * Perform monthly update with multiple stock changes in a transaction
   * Creates inventory history and warehouse orders
   */
  async performMonthlyUpdate(
    colorId: number,
    updates: Array<{
      profileId: number;
      currentStock: number;
      usedBeams: number;
      orderedBeams: number;
    }>,
    userId: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const update of updates) {
        const { profileId, currentStock, usedBeams: _usedBeams, orderedBeams } = update;

        // Get existing stock
        const existingStock = await tx.warehouseStock.findUnique({
          where: {
            profileId_colorId: {
              profileId,
              colorId,
            },
          },
        });

        if (!existingStock) {
          continue;
        }

        const previousStock = existingStock.currentStockBeams;

        // Update stock
        const stock = await tx.warehouseStock.update({
          where: { id: existingStock.id },
          data: {
            currentStockBeams: currentStock,
            version: { increment: 1 },
          },
        });

        // Create warehouse history
        await tx.warehouseHistory.create({
          data: {
            profileId,
            colorId,
            previousStock,
            currentStock,
            calculatedStock: currentStock,
            actualStock: currentStock,
            difference: currentStock - previousStock,
            changeType: 'monthly_update',
            recordedById: userId,
          },
        });

        // Create warehouse order if beams were ordered
        if (orderedBeams > 0) {
          // Set expected delivery date to 14 days from now
          const expectedDeliveryDate = new Date();
          expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 14);

          await tx.warehouseOrder.create({
            data: {
              profileId,
              colorId,
              orderedBeams,
              expectedDeliveryDate,
            },
          });
        }

        results.push(stock);
      }

      return results;
    });
  }

  /**
   * Get warehouse stock history for a specific color
   */
  async getHistoryByColor(colorId: number, limit = 100) {
    return this.prisma.warehouseHistory.findMany({
      where: { colorId },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        changeType: true,
        previousStock: true,
        currentStock: true,
        calculatedStock: true,
        actualStock: true,
        difference: true,
        recordedAt: true,
        recordedById: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all warehouse stock history
   */
  async getAllHistory(limit = 100) {
    return this.prisma.warehouseHistory.findMany({
      select: {
        id: true,
        profileId: true,
        colorId: true,
        changeType: true,
        previousStock: true,
        currentStock: true,
        calculatedStock: true,
        actualStock: true,
        difference: true,
        recordedAt: true,
        recordedById: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get latest warehouse history records for a color (used for rollback)
   */
  async getLatestInventoryHistory(colorId: number, limit = 50) {
    return this.prisma.warehouseHistory.findMany({
      where: {
        colorId,
        changeType: 'monthly_update',
      },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        previousStock: true,
        currentStock: true,
        calculatedStock: true,
        actualStock: true,
        difference: true,
        recordedAt: true,
        recordedById: true,
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: { id: true, code: true, name: true, hexColor: true },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get archived warehouse orders within a time window
   */
  async getArchivedOrdersInTimeWindow(
    colorId: number,
    startDate: Date,
    endDate: Date
  ) {
    return this.prisma.warehouseOrder.findMany({
      where: {
        colorId,
        status: 'archived',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        orderedBeams: true,
        createdAt: true,
        status: true,
      },
    });
  }

  /**
   * Perform rollback operation - restore previous stock state and unarchive orders
   */
  async performRollback(
    colorId: number,
    historyRecords: Array<{ id: number; profileId: number; previousStock: number }>,
    orderIds: number[],
    userId: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];

      // Restore stock for each profile
      for (const record of historyRecords) {
        const currentStock = await tx.warehouseStock.findUnique({
          where: {
            profileId_colorId: {
              profileId: record.profileId,
              colorId,
            },
          },
        });

        const stock = await tx.warehouseStock.update({
          where: {
            profileId_colorId: {
              profileId: record.profileId,
              colorId,
            },
          },
          data: {
            currentStockBeams: record.previousStock,
            version: { increment: 1 },
          },
        });

        // Create history record for rollback
        await tx.warehouseHistory.create({
          data: {
            profileId: record.profileId,
            colorId,
            changeType: 'rollback',
            previousStock: currentStock?.currentStockBeams ?? 0,
            currentStock: record.previousStock,
            calculatedStock: record.previousStock,
            actualStock: record.previousStock,
            difference: 0,
            recordedById: userId,
          },
        });

        results.push(stock);
      }

      // Delete warehouse history records
      await tx.warehouseHistory.deleteMany({
        where: {
          id: { in: historyRecords.map((r) => r.id) },
        },
      });

      // Unarchive warehouse orders
      if (orderIds.length > 0) {
        await tx.warehouseOrder.updateMany({
          where: { id: { in: orderIds } },
          data: { status: 'pending' },
        });
      }

      return results;
    });
  }

  /**
   * Get monthly usage data for calculating average consumption
   */
  async getMonthlyUsageData(colorId: number, monthsBack = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    return this.prisma.warehouseHistory.findMany({
      where: {
        colorId,
        changeType: 'monthly_update',
        recordedAt: {
          gte: startDate,
        },
      },
      select: {
        profileId: true,
        difference: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: 'desc' },
    });
  }

  /**
   * Get completed orders for a specific month (used in monthly finalization)
   */
  async getCompletedOrdersInMonth(month: Date, _preview = false) {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    return this.prisma.order.findMany({
      where: {
        status: 'completed',
        completedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        completedAt: true,
        requirements: {
          select: {
            profileId: true,
            colorId: true,
            beamsCount: true,
            profile: {
              select: profileBasicSelect,
            },
            color: {
              select: { id: true, code: true, name: true, hexColor: true },
            },
          },
        },
      },
    });
  }

  /**
   * Archive warehouse orders by IDs
   */
  async archiveOrders(orderIds: number[]) {
    return this.prisma.warehouseOrder.updateMany({
      where: { id: { in: orderIds } },
      data: { status: 'archived' },
    });
  }
}
