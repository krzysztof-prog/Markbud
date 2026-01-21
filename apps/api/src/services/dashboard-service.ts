import { PrismaClient } from '@prisma/client';
import { DashboardRepository } from '../repositories/DashboardRepository.js';
import {
  getWeekNumber,
  getDateRangeFromNow,
  startOfDay,
  endOfDay,
  startOfWeek,
  getWeekRangeByIndex,
  isDateInRange,
  getMonthStart,
  getMonthEnd,
} from '../utils/date-helpers.js';
import { groszeToPln, centyToEur, type Grosze, type Centy } from '../utils/money.js';
import type {
  DashboardData,
  Alert,
  AlertsResponse,
  WeeklyStatsResponse,
  WeekStat,
  MonthlyStatsResponse,
  MonthlyStatsQuery,
  ShortageResult,
} from '../validators/dashboard.js';

/**
 * DashboardService - Business logic for dashboard statistics
 *
 * Responsibilities:
 * - Aggregate data from repository
 * - Calculate statistics and metrics
 * - Format data for API responses
 * - Apply business rules and priorities
 */
export class DashboardService {
  private repository: DashboardRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new DashboardRepository(prisma);
  }

  /**
   * Get main dashboard data
   * Returns: stats, upcoming deliveries, pending imports, shortages, recent orders
   */
  async getDashboardData(): Promise<DashboardData> {
    // Execute parallel queries for optimal performance
    const [
      activeOrdersCount,
      upcomingDeliveriesData,
      pendingImportsData,
      shortagesData,
      recentOrdersData,
    ] = await Promise.all([
      this.repository.countActiveOrders(),
      this.repository.getUpcomingDeliveries(...this.getUpcomingDeliveriesRange()),
      this.repository.getPendingImports(10),
      this.repository.getShortages(),
      this.repository.getRecentOrders(5),
    ]);

    // Format upcoming deliveries with week numbers
    const upcomingDeliveries = upcomingDeliveriesData.map((d) => ({
      id: d.id,
      deliveryDate: d.deliveryDate.toISOString(),
      status: d.status as 'planned' | 'in_preparation' | 'ready' | 'shipped' | 'delivered',
      ordersCount: d._count.deliveryOrders,
      weekNumber: getWeekNumber(d.deliveryDate),
    }));

    // Process shortages (add priority)
    const shortages = this.processShortages(shortagesData).slice(0, 5); // Top 5

    // Map pendingImports to include fileName alias for frontend compatibility
    const pendingImports = pendingImportsData.map((imp) => ({
      ...imp,
      fileName: imp.filename, // Frontend uses fileName (camelCase)
    }));

    return {
      stats: {
        activeOrders: activeOrdersCount,
        upcomingDeliveriesCount: upcomingDeliveries.length,
        pendingImportsCount: pendingImportsData.length,
        shortagesCount: shortagesData.length,
      },
      upcomingDeliveries,
      pendingImports,
      shortages,
      recentOrders: recentOrdersData,
    };
  }

  /**
   * Get dashboard alerts
   * Returns: shortage alerts, import alerts, delivery alerts (sorted by priority)
   */
  async getAlerts(): Promise<AlertsResponse> {
    const alerts: Alert[] = [];
    let alertIdCounter = 1;

    // Execute parallel queries
    const [shortagesData, pendingImportsByType, todayDeliveriesCount] = await Promise.all([
      this.repository.getShortages(),
      this.repository.countPendingImportsByType(),
      this.repository.countTodayDeliveries(...this.getTodayRange()),
    ]);

    // Add shortage alerts
    const shortages = this.processShortages(shortagesData);
    for (const shortage of shortages) {
      alerts.push({
        id: alertIdCounter++,
        type: 'shortage',
        priority: shortage.priority,
        message: `Brak profilu ${shortage.profileNumber} w kolorze ${shortage.colorName}`,
        details: `Brakuje ${shortage.shortage} bel`,
        timestamp: new Date().toISOString(),
        data: shortage,
      });
    }

    // Add pending CSV imports alert (uzyte_bele)
    if (pendingImportsByType.csv > 0) {
      alerts.push({
        id: alertIdCounter++,
        type: 'import',
        priority: 'medium',
        message: `${pendingImportsByType.csv} plik(ów) CSV oczekuje na import`,
        details: 'Sprawdź zakładkę importów - sekcja CSV',
        timestamp: new Date().toISOString(),
      });
    }

    // Add pending PDF imports alert (ceny_pdf)
    if (pendingImportsByType.pdf > 0) {
      alerts.push({
        id: alertIdCounter++,
        type: 'import',
        priority: 'low',
        message: `${pendingImportsByType.pdf} cennik(ów) PDF oczekuje na import`,
        details: 'Sprawdź zakładkę importów - sekcja PDF',
        timestamp: new Date().toISOString(),
      });
    }

    // Add today's deliveries alert
    if (todayDeliveriesCount > 0) {
      alerts.push({
        id: alertIdCounter++,
        type: 'delivery',
        priority: 'high',
        message: `${todayDeliveriesCount} dostawa(y) zaplanowana na dziś`,
        details: 'Sprawdź kalendarz dostaw',
        timestamp: new Date().toISOString(),
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort(
      (a, b) =>
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
    );

    return alerts;
  }

  /**
   * Get weekly statistics for the next 8 weeks
   */
  async getWeeklyStats(): Promise<WeeklyStatsResponse> {
    const today = startOfDay(new Date());
    const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday

    // Get data for 8 weeks (56 days)
    const endDate = new Date(startOfWeekDate);
    endDate.setDate(startOfWeekDate.getDate() + 56);

    // Get aggregated data from repository
    const weekStatsRaw = await this.repository.getWeeklyStats(startOfWeekDate, endDate);

    // Group by weeks in JavaScript (fast, data already aggregated)
    const weeks: WeekStat[] = [];
    for (let i = 0; i < 8; i++) {
      const { start: weekStart, end: weekEnd } = getWeekRangeByIndex(startOfWeekDate, i);

      // Find deliveries in this week
      const weekData = weekStatsRaw.filter((stat) => {
        if (!stat.deliveryDate) return false;
        // deliveryDate format: "YYYY-MM-DD" (from SQL DATE() function in repository)
        // SQL DATE() always returns "YYYY-MM-DD" without time component
        // Append UTC midnight time to create valid ISO 8601 date string
        const dateStr = stat.deliveryDate + 'T00:00:00.000Z';
        const date = new Date(dateStr);
        return isDateInRange(date, weekStart, weekEnd);
      });

      const windows = weekData.reduce((sum, s) => sum + Number(s.windowsCount), 0);
      const deliveries = weekData.reduce((sum, s) => sum + Number(s.deliveriesCount), 0);

      weeks.push({
        weekNumber: i + 1,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        deliveriesCount: deliveries,
        ordersCount: weekData.reduce((sum, s) => sum + Number(s.ordersCount), 0),
        windows,
        sashes: windows, // Assumption: 1 window = 1 sash
        glasses: windows, // Assumption: 1 window = 1 glass
      });
    }

    return { weeks };
  }

  /**
   * Get monthly statistics
   * @param query - Optional month/year parameters
   */
  async getMonthlyStats(query: MonthlyStatsQuery): Promise<MonthlyStatsResponse> {
    const month = query.month ? parseInt(query.month) : undefined;
    const year = query.year ? parseInt(query.year) : undefined;

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const startDate = getMonthStart(targetMonth, targetYear);
    const endDate = getMonthEnd(targetMonth, targetYear);

    // Execute parallel queries
    const [orders, deliveriesCount] = await Promise.all([
      this.repository.getOrdersInRange(startDate, endDate),
      this.repository.countDeliveriesInRange(startDate, endDate),
    ]);

    // Calculate statistics
    const totalOrders = orders.length;
    let totalWindows = 0;
    let totalValuePln = 0;
    let totalValueEur = 0;

    for (const order of orders) {
      totalWindows += order.windows.reduce((sum, w) => sum + w.quantity, 0);
      totalValuePln += order.valuePln ? groszeToPln(order.valuePln as Grosze) : 0;
      totalValueEur += order.valueEur ? centyToEur(order.valueEur as Centy) : 0;
    }

    return {
      month: targetMonth,
      year: targetYear,
      totalOrders,
      totalWindows,
      totalValuePln,
      totalValueEur,
      totalDeliveries: deliveriesCount,
    };
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Get date range for upcoming deliveries (7 days from now)
   */
  private getUpcomingDeliveriesRange(): [Date, Date] {
    const { start, end } = getDateRangeFromNow(7);
    return [start, end];
  }

  /**
   * Get date range for today
   */
  private getTodayRange(): [Date, Date] {
    const today = new Date();
    return [startOfDay(today), endOfDay(today)];
  }

  /**
   * Process shortages: add priority and format data
   */
  private processShortages(shortages: ShortageResult[]) {
    return shortages.map((s) => ({
      profileId: s.profileId,
      profileNumber: s.profileNumber,
      colorId: s.colorId,
      colorCode: s.colorCode,
      colorName: s.colorName,
      currentStock: s.currentStock,
      demand: Number(s.demand),
      shortage: Number(s.shortage),
      priority: this.calculatePriority(Number(s.afterDemand)),
    }));
  }

  /**
   * Calculate priority based on shortage severity
   * @param afterDemand - Stock after demand (negative = shortage)
   */
  private calculatePriority(afterDemand: number): 'critical' | 'high' | 'medium' {
    if (afterDemand < -10) return 'critical';
    if (afterDemand < -5) return 'high';
    return 'medium';
  }
}
