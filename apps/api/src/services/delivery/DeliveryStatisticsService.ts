/**
 * DeliveryStatisticsService - Analytics and statistics for deliveries
 *
 * Responsibilities:
 * - Calculate delivery statistics (windows, sashes, glasses)
 * - Aggregate profile usage data
 * - Generate weekday and monthly analytics
 */

import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import {
  parseDateSafe,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  POLISH_DAY_NAMES,
} from '../../utils/date-helpers.js';

export interface ProfileRequirement {
  deliveryId: number;
  deliveryDate: string;
  profileId: number;
  colorCode: string;
  totalBeams: number;
}

export interface WeekdayStat {
  weekday: number;
  weekdayName: string;
  deliveriesCount: number;
  totalWindows: number;
  totalSashes: number;
  totalGlasses: number;
  avgWindowsPerDelivery: number;
  avgSashesPerDelivery: number;
  avgGlassesPerDelivery: number;
}

export interface WeekdayStatsResult {
  stats: WeekdayStat[];
  periodStart: Date;
  periodEnd: Date;
}

export interface MonthlyWindowsStat {
  month: number;
  year: number;
  monthLabel: string;
  deliveriesCount: number;
  totalWindows: number;
  totalSashes: number;
  totalGlasses: number;
}

export interface MonthlyWindowsStatsResult {
  stats: MonthlyWindowsStat[];
}

export interface ProfileUsage {
  profileId: number;
  profileNumber: string;
  profileName: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  totalBeams: number;
  totalMeters: number;
  deliveryCount: number;
}

export interface MonthlyProfileStat {
  month: number;
  year: number;
  monthLabel: string;
  deliveriesCount: number;
  profiles: ProfileUsage[];
}

export interface MonthlyProfileStatsResult {
  stats: MonthlyProfileStat[];
}

interface MonthRange {
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
}

export class DeliveryStatisticsService {
  constructor(private repository: DeliveryRepository) {}

  /**
   * Get profile requirements aggregated by delivery
   *
   * @param fromDate - Optional start date filter (ISO string)
   * @returns Array of profile requirements per delivery
   */
  async getProfileRequirements(fromDate?: string): Promise<ProfileRequirement[]> {
    const deliveries = await this.repository.getDeliveriesWithRequirements(
      parseDateSafe(fromDate)
    );

    const result: ProfileRequirement[] = [];

    deliveries.forEach((delivery) => {
      const profileMap = new Map<string, { beams: number; meters: number }>();

      delivery.deliveryOrders.forEach((deliveryOrder) => {
        deliveryOrder.order.requirements.forEach((req) => {
          const key = `${req.profileId}-${req.color.code}`;
          const current = profileMap.get(key) || { beams: 0, meters: 0 };
          profileMap.set(key, {
            beams: current.beams + req.beamsCount,
            meters: current.meters + req.meters,
          });
        });
      });

      profileMap.forEach((data, key) => {
        const [profileIdStr, colorCode] = key.split('-');
        const profileIdNum = parseInt(profileIdStr, 10);

        if (isNaN(profileIdNum)) {
          return;
        }

        // Add beams from meters: sum meters / 6m, rounded up
        const beamsFromMeters = Math.ceil(data.meters / 6);
        const totalBeams = data.beams + beamsFromMeters;

        result.push({
          deliveryId: delivery.id,
          deliveryDate: delivery.deliveryDate.toISOString(),
          profileId: profileIdNum,
          colorCode,
          totalBeams,
        });
      });
    });

    return result;
  }

  /**
   * Get windows/sashes/glasses statistics by weekday
   *
   * @param monthsBack - Number of months to look back
   * @returns Statistics aggregated by weekday
   */
  async getWindowsStatsByWeekday(monthsBack: number): Promise<WeekdayStatsResult> {
    const today = new Date();
    const startDate = startOfMonth(subMonths(today, monthsBack));

    const deliveries = await this.repository.getDeliveriesWithWindows(startDate);

    // Initialize weekday stats (0 = Sunday, 6 = Saturday)
    const weekdayStats = this.initializeWeekdayStats();

    // Aggregate data
    deliveries.forEach((delivery) => {
      const weekday = getDay(delivery.deliveryDate);
      const stats = weekdayStats.get(weekday)!;

      stats.deliveriesCount += 1;

      delivery.deliveryOrders.forEach((dOrder) => {
        stats.totalWindows += dOrder.order.totalWindows || 0;
        stats.totalSashes += dOrder.order.totalSashes || 0;
        stats.totalGlasses += dOrder.order.totalGlasses || 0;
      });
    });

    const stats = this.formatWeekdayStats(weekdayStats);

    return {
      stats,
      periodStart: startDate,
      periodEnd: today,
    };
  }

  /**
   * Get monthly windows/sashes/glasses statistics
   *
   * @param monthsBack - Number of months to look back
   * @returns Statistics aggregated by month
   */
  async getMonthlyWindowsStats(monthsBack: number): Promise<MonthlyWindowsStatsResult> {
    const monthRanges = this.generateMonthRanges(monthsBack);

    const stats = await Promise.all(
      monthRanges.map((range) => this.calculateWindowsStatsForMonth(range))
    );

    return { stats: stats.reverse() };
  }

  /**
   * Get monthly profile usage statistics
   *
   * @param monthsBack - Number of months to look back
   * @returns Profile usage statistics aggregated by month
   */
  async getMonthlyProfileStats(monthsBack: number): Promise<MonthlyProfileStatsResult> {
    const monthRanges = this.generateMonthRanges(monthsBack);

    const stats = await Promise.all(
      monthRanges.map((range) => this.calculateProfileStatsForMonth(range))
    );

    return { stats: stats.reverse() };
  }

  // ===================
  // Private Helper Methods
  // ===================

  /**
   * Generate month ranges for statistics calculation
   */
  private generateMonthRanges(monthsBack: number): MonthRange[] {
    const today = new Date();
    const ranges: MonthRange[] = [];

    for (let i = 0; i < monthsBack; i++) {
      const targetMonth = subMonths(today, i);
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);

      ranges.push({
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear(),
        startDate: monthStart,
        endDate: monthEnd,
      });
    }

    return ranges;
  }

  /**
   * Initialize weekday statistics map with default values
   */
  private initializeWeekdayStats(): Map<
    number,
    {
      deliveriesCount: number;
      totalWindows: number;
      totalSashes: number;
      totalGlasses: number;
    }
  > {
    const stats = new Map<
      number,
      {
        deliveriesCount: number;
        totalWindows: number;
        totalSashes: number;
        totalGlasses: number;
      }
    >();

    for (let i = 0; i < 7; i++) {
      stats.set(i, {
        deliveriesCount: 0,
        totalWindows: 0,
        totalSashes: 0,
        totalGlasses: 0,
      });
    }

    return stats;
  }

  /**
   * Format weekday stats map into array with calculated averages
   */
  private formatWeekdayStats(
    weekdayStats: Map<
      number,
      {
        deliveriesCount: number;
        totalWindows: number;
        totalSashes: number;
        totalGlasses: number;
      }
    >
  ): WeekdayStat[] {
    return Array.from(weekdayStats.entries()).map(([weekday, data]) => ({
      weekday,
      weekdayName: POLISH_DAY_NAMES[weekday],
      ...data,
      avgWindowsPerDelivery:
        data.deliveriesCount > 0 ? data.totalWindows / data.deliveriesCount : 0,
      avgSashesPerDelivery:
        data.deliveriesCount > 0 ? data.totalSashes / data.deliveriesCount : 0,
      avgGlassesPerDelivery:
        data.deliveriesCount > 0 ? data.totalGlasses / data.deliveriesCount : 0,
    }));
  }

  /**
   * Calculate windows statistics for a single month
   */
  private async calculateWindowsStatsForMonth(range: MonthRange): Promise<MonthlyWindowsStat> {
    const deliveries = await this.repository.getDeliveriesWithWindows(
      range.startDate,
      range.endDate
    );

    let totalWindows = 0;
    let totalSashes = 0;
    let totalGlasses = 0;

    deliveries.forEach((delivery) => {
      delivery.deliveryOrders.forEach((dOrder) => {
        totalWindows += dOrder.order.totalWindows || 0;
        totalSashes += dOrder.order.totalSashes || 0;
        totalGlasses += dOrder.order.totalGlasses || 0;
      });
    });

    return {
      month: range.month,
      year: range.year,
      monthLabel: `${range.year}-${String(range.month).padStart(2, '0')}`,
      deliveriesCount: deliveries.length,
      totalWindows,
      totalSashes,
      totalGlasses,
    };
  }

  /**
   * Calculate profile usage statistics for a single month
   */
  private async calculateProfileStatsForMonth(range: MonthRange): Promise<MonthlyProfileStat> {
    const deliveries = await this.repository.getDeliveriesWithProfileStats(
      range.startDate,
      range.endDate
    );

    const profileUsage = new Map<string, ProfileUsage>();

    deliveries.forEach((delivery) => {
      delivery.deliveryOrders.forEach((dOrder) => {
        dOrder.order.requirements.forEach((req) => {
          const key = `${req.profileId}-${req.colorId}`;

          if (!profileUsage.has(key)) {
            profileUsage.set(key, {
              profileId: req.profileId,
              profileNumber: req.profile.number,
              profileName: req.profile.name,
              colorId: req.colorId,
              colorCode: req.color.code,
              colorName: req.color.name,
              totalBeams: 0,
              totalMeters: 0,
              deliveryCount: 0,
            });
          }

          const usage = profileUsage.get(key)!;
          usage.totalBeams += req.beamsCount;
          usage.totalMeters += req.meters;
          usage.deliveryCount += 1;
        });
      });
    });

    return {
      month: range.month,
      year: range.year,
      monthLabel: `${range.year}-${String(range.month).padStart(2, '0')}`,
      deliveriesCount: deliveries.length,
      profiles: Array.from(profileUsage.values()).sort((a, b) => b.totalBeams - a.totalBeams),
    };
  }
}
