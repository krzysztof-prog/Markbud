/**
 * WarehouseInventoryService - Handles monthly inventory operations
 */

import { WarehouseRepository } from '../../repositories/WarehouseRepository.js';
import { isWithin24Hours } from '../../utils/warehouse-utils.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { prisma } from '../../index.js';
import type { MonthlyUpdateInput, MonthlyUpdateResult } from './types.js';

export class WarehouseInventoryService {
  constructor(private repository: WarehouseRepository) {}

  /**
   * Perform monthly inventory update for a color
   *
   * Updates stock values based on physical inventory count and automatically
   * archives completed orders for this color.
   *
   * @param colorId - Color ID
   * @param updates - Array of profile stock updates
   * @param userId - User ID performing the update (optional)
   * @returns Update results and archived orders count
   * @throws ValidationError if any update has invalid data
   */
  async performMonthlyUpdate(
    colorId: number,
    updates: MonthlyUpdateInput[],
    userId?: number
  ): Promise<{ updates: MonthlyUpdateResult[]; archivedOrdersCount: number }> {
    // Validate all updates
    for (const update of updates) {
      if (update.actualStock < 0) {
        throw new ValidationError(
          `Stan magazynu nie może być ujemny (profil ${update.profileId})`
        );
      }

      if (!Number.isFinite(update.actualStock)) {
        throw new ValidationError(
          `Stan magazynu musi być liczbą skończoną (profil ${update.profileId})`
        );
      }
    }

    const results: MonthlyUpdateResult[] = [];

    // Process each update in a transaction
    for (const update of updates) {
      const result = await prisma.$transaction(async (tx) => {
        // Get current stock (calculated) in transaction
        const currentStock = await tx.warehouseStock.findUnique({
          where: {
            profileId_colorId: {
              profileId: update.profileId,
              colorId,
            },
          },
        });

        const calculatedStock = currentStock?.currentStockBeams || 0;
        const difference = update.actualStock - calculatedStock;

        // Save to history
        await tx.warehouseHistory.create({
          data: {
            profileId: update.profileId,
            colorId,
            calculatedStock,
            actualStock: update.actualStock,
            difference,
            changeType: 'monthly_inventory',
            recordedById: userId ?? null,
          },
        });

        // Update stock
        await tx.warehouseStock.update({
          where: {
            profileId_colorId: {
              profileId: update.profileId,
              colorId,
            },
          },
          data: {
            currentStockBeams: update.actualStock,
            initialStockBeams: calculatedStock,
            version: { increment: 1 },
          },
        });

        return {
          profileId: update.profileId,
          calculatedStock,
          actualStock: update.actualStock,
          difference,
        };
      });

      results.push(result);
    }

    // Automatically archive completed orders for this color
    const archivedOrders = await prisma.order.updateMany({
      where: {
        status: 'completed',
        archivedAt: null,
        requirements: {
          some: { colorId },
        },
      },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    return {
      updates: results,
      archivedOrdersCount: archivedOrders.count,
    };
  }

  /**
   * Rollback the last inventory for a specific color
   *
   * Reverts stock values to pre-inventory state and restores archived orders.
   * Only allows rollback if inventory is less than 24 hours old.
   *
   * @param colorId - Color ID to rollback inventory for
   * @param userId - User ID performing the rollback (optional)
   * @returns Rollback results including restored records and orders
   * @throws NotFoundError if no inventory history exists
   * @throws ValidationError if inventory is older than 24 hours
   */
  async rollbackInventory(colorId: number, userId?: number) {
    // Fetch last inventory records for this color
    const lastInventoryRecords = await prisma.warehouseHistory.findMany({
      where: {
        colorId,
        changeType: 'monthly_inventory',
      },
      orderBy: { recordedAt: 'desc' },
      take: 100, // Assume max 100 profiles per inventory
    });

    if (lastInventoryRecords.length === 0) {
      throw new NotFoundError('Brak historii inwentaryzacji do cofnięcia');
    }

    // Get the latest inventory date
    const latestDate = lastInventoryRecords[0].recordedAt;

    // Check if inventory is not older than 24 hours
    if (!isWithin24Hours(latestDate)) {
      const hoursSince = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60);
      throw new ValidationError(
        `Nie można cofnąć inwentaryzacji starszej niż 24h (${hoursSince.toFixed(1)}h temu)`
      );
    }

    // Find all records from the same inventory session (within 1 minute)
    const inventoryToRollback = lastInventoryRecords.filter((record) => {
      const timeDiff = Math.abs(latestDate.getTime() - record.recordedAt.getTime());
      return timeDiff < 60000; // Within 1 minute = same inventory
    });

    // Rollback in transaction
    const result = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const record of inventoryToRollback) {
        // Restore stock to calculated value (pre-inventory)
        await tx.warehouseStock.update({
          where: {
            profileId_colorId: {
              profileId: record.profileId,
              colorId: record.colorId,
            },
          },
          data: {
            currentStockBeams: record.calculatedStock,
            version: { increment: 1 },
          },
        });

        // Delete history entry
        await tx.warehouseHistory.delete({
          where: { id: record.id },
        });

        results.push({
          profileId: record.profileId,
          restoredStock: record.calculatedStock,
          removedActualStock: record.actualStock,
        });
      }

      // Find and restore archived orders from the same time
      const archivedOrders = await tx.order.findMany({
        where: {
          status: 'archived',
          archivedAt: {
            gte: new Date(latestDate.getTime() - 60000), // 1 minute before
            lte: new Date(latestDate.getTime() + 60000), // 1 minute after
          },
          requirements: {
            some: { colorId },
          },
        },
      });

      // Restore status to 'completed' for archived orders
      if (archivedOrders.length > 0) {
        await tx.order.updateMany({
          where: {
            id: { in: archivedOrders.map((o) => o.id) },
          },
          data: {
            status: 'completed',
            archivedAt: null,
          },
        });
      }

      return {
        rolledBackRecords: results,
        restoredOrdersCount: archivedOrders.length,
        inventoryDate: latestDate,
      };
    });

    return {
      success: true,
      message: `Cofnięto inwentaryzację z ${result.inventoryDate.toISOString()}`,
      ...result,
    };
  }

  /**
   * Finalize month - Preview or archive completed orders for a specific month
   *
   * @param month - Month in format "YYYY-MM"
   * @param archive - If true, actually archive orders; if false, return preview
   * @returns Preview or execution results
   */
  async finalizeMonth(month: string, archive: boolean = false) {
    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    if (!archive) {
      // Return preview only
      const ordersToArchive = await prisma.order.findMany({
        where: {
          status: 'completed',
          deliveryDate: {
            gte: startDate,
            lt: endDate,
          },
          archivedAt: null,
        },
        select: {
          id: true,
          orderNumber: true,
          deliveryDate: true,
        },
      });

      return {
        preview: true,
        ordersCount: ordersToArchive.length,
        orderNumbers: ordersToArchive.map((o) => o.orderNumber),
        month,
      };
    }

    // Archive orders
    const ordersToArchive = await prisma.order.findMany({
      where: {
        status: 'completed',
        deliveryDate: {
          gte: startDate,
          lt: endDate,
        },
        archivedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (ordersToArchive.length === 0) {
      return {
        success: true,
        message: `Brak zleceń do archiwizacji za ${month}`,
        archivedCount: 0,
        archivedOrderNumbers: [],
      };
    }

    await prisma.order.updateMany({
      where: {
        id: { in: ordersToArchive.map((o) => o.id) },
      },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Zarchiwizowano ${ordersToArchive.length} zleceń za ${month}`,
      archivedCount: ordersToArchive.length,
      archivedOrderNumbers: ordersToArchive.map((o) => o.orderNumber),
    };
  }
}
