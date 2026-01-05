/**
 * WarehouseStockService - Handles stock data queries and updates
 */

import { WarehouseRepository } from '../../repositories/WarehouseRepository.js';
import { emitWarehouseStockUpdated } from '../event-emitter.js';
import { groupBy } from '../../utils/warehouse-utils.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { prisma } from '../../index.js';
import type { WarehouseRow } from './types.js';

export class WarehouseStockService {
  constructor(private repository: WarehouseRepository) {}

  /**
   * Get warehouse table data for a specific color
   *
   * @param colorId - Color ID to fetch warehouse data for
   * @returns Warehouse data with color info and formatted table rows
   * @throws NotFoundError if color does not exist
   */
  async getColorWarehouseData(colorId: number) {
    // Fetch stocks for this color
    const stocks = await prisma.warehouseStock.findMany({
      where: { colorId },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        initialStockBeams: true,
        updatedAt: true,
        profile: {
          select: { id: true, number: true },
        },
        color: {
          select: { id: true, code: true },
        },
      },
      orderBy: { profile: { number: 'asc' } },
    });

    // Fetch demands from active orders
    const demands = await prisma.orderRequirement.groupBy({
      by: ['profileId'],
      where: {
        colorId,
        order: {
          archivedAt: null,
          status: { notIn: ['archived', 'completed'] },
        },
      },
      _sum: {
        beamsCount: true,
        meters: true,
      },
    });

    // Build demand map
    const demandMap = new Map(
      demands.map((d) => [
        d.profileId,
        {
          beams: d._sum.beamsCount || 0,
          meters: parseFloat(d._sum.meters?.toString() || '0'),
        },
      ])
    );

    // Fetch warehouse orders (pending and received)
    const allWarehouseOrders = await prisma.warehouseOrder.findMany({
      where: {
        colorId,
        status: { in: ['pending', 'received'] },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });

    // Separate pending and received orders
    const pendingOrders = allWarehouseOrders.filter((o) => o.status === 'pending');
    const receivedOrders = allWarehouseOrders.filter((o) => o.status === 'received');

    // Group orders by profileId
    const pendingOrdersMap = groupBy(pendingOrders, (order) => order.profileId);
    const receivedOrdersMap = groupBy(receivedOrders, (order) => order.profileId);

    // Get low stock threshold
    const lowThreshold = await this.getLowStockThreshold();

    // Fetch color info
    const color = await prisma.color.findUnique({
      where: { id: colorId },
      select: { id: true, code: true, name: true, hexColor: true, type: true },
    });

    if (!color) {
      throw new NotFoundError('Color');
    }

    // Transform to table data
    const tableData: WarehouseRow[] = stocks.map((stock) => {
      const demand = demandMap.get(stock.profileId) || { beams: 0, meters: 0 };
      const afterDemand = stock.currentStockBeams - demand.beams;
      const pendingOrdersList = pendingOrdersMap.get(stock.profileId) || [];
      const receivedOrdersList = receivedOrdersMap.get(stock.profileId) || [];

      // Calculate total ordered beams and nearest delivery date
      const totalOrderedBeams = pendingOrdersList.reduce(
        (sum, order) => sum + order.orderedBeams,
        0
      );
      const nearestDeliveryDate =
        pendingOrdersList.length > 0 ? pendingOrdersList[0].expectedDeliveryDate : null;

      return {
        profileId: stock.profileId,
        profileNumber: stock.profile.number,
        currentStock: stock.currentStockBeams,
        initialStock: stock.initialStockBeams,
        demand: demand.beams,
        demandMeters: demand.meters,
        afterDemand,
        orderedBeams: totalOrderedBeams,
        expectedDeliveryDate: nearestDeliveryDate,
        pendingOrders: pendingOrdersList,
        receivedOrders: receivedOrdersList,
        isLow: stock.currentStockBeams <= lowThreshold,
        isNegative: afterDemand < 0,
        updatedAt: stock.updatedAt,
      };
    });

    return {
      color,
      data: tableData,
    };
  }

  /**
   * Update stock for a specific profile and color
   *
   * Uses optimistic locking with version field to prevent race conditions.
   * If another process updates the same record concurrently, the transaction
   * will be retried automatically.
   *
   * @param colorId - Color ID
   * @param profileId - Profile ID
   * @param currentStockBeams - New stock value
   * @param userId - User ID performing the update (optional)
   * @param expectedVersion - Expected version for optimistic locking (optional)
   * @returns Updated stock data
   * @throws NotFoundError if stock record doesn't exist
   * @throws ValidationError if stock value is invalid
   * @throws ConflictError if version mismatch (concurrent update detected)
   */
  async updateStock(
    colorId: number,
    profileId: number,
    currentStockBeams: number,
    userId?: number,
    expectedVersion?: number
  ) {
    // Validate input
    if (currentStockBeams < 0) {
      throw new ValidationError('Stan magazynu nie może być ujemny');
    }

    if (!Number.isFinite(currentStockBeams)) {
      throw new ValidationError('Stan magazynu musi być liczbą skończoną');
    }

    // Use transaction with optimistic locking to prevent race conditions
    const stock = await prisma.$transaction(async (tx) => {
      // First, read the current record to get the version
      const currentStock = await tx.warehouseStock.findUnique({
        where: {
          profileId_colorId: {
            profileId,
            colorId,
          },
        },
        select: {
          version: true,
        },
      });

      if (!currentStock) {
        throw new NotFoundError(`Stock record not found for profile ${profileId} and color ${colorId}`);
      }

      // If expectedVersion was provided, verify it matches
      if (expectedVersion !== undefined && currentStock.version !== expectedVersion) {
        throw new ValidationError(
          `Konflikt wersji: rekord został zmodyfikowany przez innego użytkownika. ` +
          `Odśwież dane i spróbuj ponownie.`
        );
      }

      // Update with version increment (optimistic locking)
      const updated = await tx.warehouseStock.update({
        where: {
          profileId_colorId: {
            profileId,
            colorId,
          },
          // Ensure version hasn't changed during transaction
          version: currentStock.version,
        },
        data: {
          currentStockBeams,
          version: { increment: 1 },
          updatedById: userId,
        },
        select: {
          profileId: true,
          colorId: true,
          currentStockBeams: true,
          updatedAt: true,
          version: true,
          profile: {
            select: { id: true, number: true, name: true },
          },
          color: {
            select: { id: true, code: true, name: true },
          },
        },
      });

      return updated;
    });

    // Emit event outside transaction
    emitWarehouseStockUpdated(stock);

    return stock;
  }

  /**
   * Get low stock threshold from settings
   *
   * @private
   * @returns Low stock threshold value (default: 10)
   */
  private async getLowStockThreshold(): Promise<number> {
    const setting = await prisma.setting.findUnique({
      where: { key: 'lowStockThreshold' },
    });
    return parseInt(setting?.value || '10', 10);
  }
}
