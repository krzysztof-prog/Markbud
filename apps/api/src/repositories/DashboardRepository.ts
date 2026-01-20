import { PrismaClient } from '@prisma/client';
import type { ShortageResult, WeekStatRaw } from '../validators/dashboard.js';

/**
 * DashboardRepository - Data access layer for dashboard statistics
 *
 * Responsibilities:
 * - Raw database queries with optimal performance
 * - Direct Prisma access
 * - Returns unprocessed/raw data for service layer
 */
export class DashboardRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Count active orders (not archived)
   */
  async countActiveOrders(): Promise<number> {
    return this.prisma.order.count({
      where: { archivedAt: null },
    });
  }

  /**
   * Get upcoming deliveries within date range
   * @param startDate - Start of date range
   * @param endDate - End of date range
   */
  async getUpcomingDeliveries(startDate: Date, endDate: Date) {
    return this.prisma.delivery.findMany({
      where: {
        deletedAt: null, // Filtruj tylko aktywne dostawy (soft delete)
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['planned', 'in_preparation', 'ready'] },
      },
      select: {
        id: true,
        deliveryDate: true,
        status: true,
        _count: {
          select: { deliveryOrders: true },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });
  }

  /**
   * Get pending file imports (up to limit)
   * @param limit - Maximum number of imports to return (default: 10)
   */
  async getPendingImports(limit = 10) {
    return this.prisma.fileImport.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        filename: true,
        fileType: true,
        status: true,
        createdAt: true,
        errorMessage: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Count pending imports
   */
  async countPendingImports(): Promise<number> {
    return this.prisma.fileImport.count({
      where: { status: 'pending' },
    });
  }

  /**
   * Count pending imports by type (CSV vs PDF)
   * Returns separate counts for CSV types (uzyte_bele, uzyte_bele_prywatne) and PDF (ceny_pdf)
   */
  async countPendingImportsByType(): Promise<{ csv: number; pdf: number }> {
    const [csvCount, pdfCount] = await Promise.all([
      this.prisma.fileImport.count({
        where: {
          status: 'pending',
          fileType: { in: ['uzyte_bele', 'uzyte_bele_prywatne'] },
        },
      }),
      this.prisma.fileImport.count({
        where: { status: 'pending', fileType: 'ceny_pdf' },
      }),
    ]);
    return { csv: csvCount, pdf: pdfCount };
  }

  /**
   * Get recent orders (not archived, ordered by creation date)
   * @param limit - Maximum number of orders to return (default: 5)
   */
  async getRecentOrders(limit = 5) {
    return this.prisma.order.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        valuePln: true,
      },
    });
  }

  /**
   * Get material shortages using optimized raw SQL query
   * Returns profiles where current stock < demand
   */
  async getShortages(): Promise<ShortageResult[]> {
    // Single query with LEFT JOIN for optimal performance
    // Groups by profile+color and calculates shortage
    // Filtruje tylko aktywne stany magazynowe (bez soft-deleted)
    const shortages = await this.prisma.$queryRaw<ShortageResult[]>`
      SELECT
        ws.profile_id as "profileId",
        p.number as "profileNumber",
        ws.color_id as "colorId",
        c.code as "colorCode",
        c.name as "colorName",
        ws.current_stock_beams as "currentStock",
        COALESCE(SUM(req.beams_count), 0) as demand,
        (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) as "afterDemand",
        ABS(ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) as shortage
      FROM warehouse_stock ws
      INNER JOIN profiles p ON p.id = ws.profile_id
      INNER JOIN colors c ON c.id = ws.color_id
      LEFT JOIN order_requirements req ON
        req.profile_id = ws.profile_id
        AND req.color_id = ws.color_id
      LEFT JOIN orders o ON o.id = req.order_id
        AND o.archived_at IS NULL
        AND o.status NOT IN ('archived', 'completed')
      WHERE ws.deleted_at IS NULL
      GROUP BY
        ws.profile_id,
        ws.color_id,
        ws.current_stock_beams,
        p.number,
        c.code,
        c.name
      HAVING (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) < 0
      ORDER BY shortage DESC
    `;

    return shortages;
  }

  /**
   * Count deliveries for today
   * @param startOfDay - Start of today (00:00:00)
   * @param endOfDay - End of today (23:59:59.999)
   */
  async countTodayDeliveries(startOfDay: Date, endOfDay: Date): Promise<number> {
    return this.prisma.delivery.count({
      where: {
        deletedAt: null, // Filtruj tylko aktywne dostawy (soft delete)
        deliveryDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: { in: ['planned', 'in_preparation'] },
      },
    });
  }

  /**
   * Get weekly statistics using optimized raw SQL query
   * Groups deliveries, orders, and windows by delivery date
   *
   * @param startDate - Start of date range
   * @param endDate - End of date range
   */
  async getWeeklyStats(startDate: Date, endDate: Date): Promise<WeekStatRaw[]> {
    // Note: delivery_date is stored as INTEGER (unix timestamp in milliseconds)
    // Filtruje tylko aktywne dostawy (bez soft-deleted)
    const weekStats = await this.prisma.$queryRaw<WeekStatRaw[]>`
      SELECT
        DATE(datetime(d.delivery_date/1000, 'unixepoch')) as "deliveryDate",
        COUNT(DISTINCT d.id) as "deliveriesCount",
        COUNT(DISTINCT do.order_id) as "ordersCount",
        COALESCE(SUM(ow.quantity), 0) as "windowsCount"
      FROM deliveries d
      LEFT JOIN delivery_orders do ON do.delivery_id = d.id
      LEFT JOIN order_windows ow ON ow.order_id = do.order_id
      WHERE d.delivery_date >= ${startDate}
        AND d.delivery_date < ${endDate}
        AND d.deleted_at IS NULL
      GROUP BY DATE(datetime(d.delivery_date/1000, 'unixepoch'))
      ORDER BY d.delivery_date ASC
    `;

    return weekStats;
  }

  /**
   * Get orders created within date range with window counts
   * @param startDate - Start of date range
   * @param endDate - End of date range
   */
  async getOrdersInRange(startDate: Date, endDate: Date) {
    return this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        valuePln: true,
        valueEur: true,
        windows: {
          select: { quantity: true },
        },
      },
    });
  }

  /**
   * Count deliveries within date range
   * @param startDate - Start of date range
   * @param endDate - End of date range
   */
  async countDeliveriesInRange(startDate: Date, endDate: Date): Promise<number> {
    return this.prisma.delivery.count({
      where: {
        deletedAt: null, // Filtruj tylko aktywne dostawy (soft delete)
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }
}
