/**
 * WarehouseShortageService - Handles shortage calculations
 */

import { WarehouseRepository } from '../../repositories/WarehouseRepository.js';
import { groupBy, calculateShortagePriority } from '../../utils/warehouse-utils.js';
import { prisma } from '../../index.js';
import type { Shortage } from './types.js';

export class WarehouseShortageService {
  constructor(private repository: WarehouseRepository) {}

  /**
   * Get all material shortages across all stocks
   *
   * Calculates shortages by comparing current stock with demand,
   * prioritizes by severity, and includes warehouse order information.
   *
   * @returns Array of shortages sorted by severity (highest shortage first)
   */
  async getAllShortages(): Promise<Shortage[]> {
    // Fetch all warehouse stocks
    const stocks = await prisma.warehouseStock.findMany({
      select: {
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        profile: {
          select: { id: true, number: true },
        },
        color: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Fetch demands from active orders
    const demands = await prisma.orderRequirement.groupBy({
      by: ['profileId', 'colorId'],
      where: {
        order: {
          archivedAt: null,
          status: { notIn: ['archived', 'completed'] },
        },
      },
      _sum: {
        beamsCount: true,
      },
    });

    // Build demand map
    const demandMap = new Map(
      demands.map((d) => [`${d.profileId}-${d.colorId}`, d._sum.beamsCount || 0])
    );

    // Fetch pending warehouse orders
    const warehouseOrders = await prisma.warehouseOrder.findMany({
      where: {
        status: 'pending',
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });

    // Group warehouse orders by profile-color key
    const ordersMap = groupBy(warehouseOrders, (order) => `${order.profileId}-${order.colorId}`);

    // Calculate shortages
    const shortages = stocks
      .map((stock) => {
        const key = `${stock.profileId}-${stock.colorId}` as `${number}-${number}`;
        const demand = demandMap.get(key) || 0;
        const afterDemand = stock.currentStockBeams - demand;
        const orders = ordersMap.get(key) || [];
        const totalOrderedBeams = orders.reduce((sum, o) => sum + o.orderedBeams, 0);
        const nearestDeliveryDate = orders.length > 0 ? orders[0].expectedDeliveryDate : null;

        // Only include if there's a shortage
        if (afterDemand < 0) {
          return {
            profileId: stock.profileId,
            profileNumber: stock.profile.number,
            colorId: stock.colorId,
            colorCode: stock.color.code,
            colorName: stock.color.name,
            currentStock: stock.currentStockBeams,
            demand,
            shortage: Math.abs(afterDemand),
            orderedBeams: totalOrderedBeams,
            expectedDeliveryDate: nearestDeliveryDate,
            priority: calculateShortagePriority(afterDemand),
          };
        }
        return null;
      })
      .filter((item): item is Shortage => item !== null)
      .sort((a, b) => b.shortage - a.shortage);

    return shortages;
  }
}
