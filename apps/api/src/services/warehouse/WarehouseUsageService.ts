/**
 * WarehouseUsageService - Handles usage statistics and history
 */

import { WarehouseRepository } from '../../repositories/WarehouseRepository.js';
import { prisma } from '../../index.js';
import type { MonthlyUsage } from './types.js';

export class WarehouseUsageService {
  constructor(private repository: WarehouseRepository) {}

  /**
   * Get monthly average usage for profiles in a specific color
   *
   * Calculates average beams per month based on completed/archived orders
   * over the specified number of months.
   *
   * @param colorId - Color ID
   * @param monthsBack - Number of months to look back (default: 6)
   * @returns Array of monthly usage data per profile
   */
  async getMonthlyUsage(colorId: number, monthsBack: number = 6): Promise<MonthlyUsage[]> {
    // Calculate start date
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Fetch requirements from completed orders
    const requirements = await prisma.orderRequirement.findMany({
      where: {
        colorId,
        order: {
          status: { in: ['completed', 'archived'] },
          deliveryDate: {
            gte: startDate,
          },
        },
      },
      select: {
        profileId: true,
        beamsCount: true,
        orderId: true,
      },
    });

    // Fetch orders with delivery dates
    const orderIds = [...new Set(requirements.map((r) => r.orderId))];
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, deliveryDate: true },
    });

    const orderDateMap = new Map(orders.map((o) => [o.id, o.deliveryDate]));

    // Fetch profiles
    const profileIds = [...new Set(requirements.map((r) => r.profileId))];
    const profiles = await prisma.profile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, number: true, name: true },
    });

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // Group by profileId and month
    const profileMonthlyData = new Map<
      number,
      {
        profileNumber: string;
        profileName: string;
        monthlyUsage: Map<string, number>;
      }
    >();

    requirements.forEach((req) => {
      const deliveryDate = orderDateMap.get(req.orderId);
      if (!deliveryDate) return;

      const month = deliveryDate.toISOString().slice(0, 7); // "YYYY-MM"
      const profile = profileMap.get(req.profileId);
      if (!profile) return;

      if (!profileMonthlyData.has(req.profileId)) {
        profileMonthlyData.set(req.profileId, {
          profileNumber: profile.number,
          profileName: profile.name || '',
          monthlyUsage: new Map(),
        });
      }

      const profileData = profileMonthlyData.get(req.profileId)!;
      const currentUsage = profileData.monthlyUsage.get(month) || 0;
      profileData.monthlyUsage.set(month, currentUsage + req.beamsCount);
    });

    // Calculate averages for each profile
    const averages: MonthlyUsage[] = Array.from(profileMonthlyData.entries()).map(
      ([profileId, data]) => {
        const monthlyData = Array.from(data.monthlyUsage.entries())
          .map(([month, beams]) => ({ month, beams }))
          .sort((a, b) => b.month.localeCompare(a.month));

        const totalBeams = monthlyData.reduce((sum, m) => sum + m.beams, 0);
        const averageBeamsPerMonth =
          monthlyData.length > 0 ? totalBeams / monthsBack : 0;

        return {
          profileId,
          profileNumber: data.profileNumber,
          profileName: data.profileName,
          averageBeamsPerMonth: Math.round(averageBeamsPerMonth * 10) / 10,
          monthlyData,
          totalBeams,
          monthsWithData: monthlyData.length,
        };
      }
    );

    return averages;
  }

  /**
   * Get warehouse history for a specific color or all colors
   *
   * @param colorId - Optional color ID to filter by
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Array of history records sorted by date (newest first)
   */
  async getHistoryByColor(colorId?: number, limit: number = 100) {
    // Filtruj tylko profile AKROBUD
    const where = colorId
      ? { colorId, profile: { isAkrobud: true } }
      : { profile: { isAkrobud: true } };

    const history = await prisma.warehouseHistory.findMany({
      where,
      select: {
        id: true,
        profileId: true,
        colorId: true,
        calculatedStock: true,
        actualStock: true,
        difference: true,
        recordedAt: true,
        changeType: true,
        profile: {
          select: { id: true, number: true, name: true },
        },
        color: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return history;
  }

  /**
   * Get all warehouse history (alias for getHistoryByColor without colorId)
   *
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Array of history records sorted by date (newest first)
   */
  async getAllHistory(limit: number = 100) {
    return this.getHistoryByColor(undefined, limit);
  }
}
