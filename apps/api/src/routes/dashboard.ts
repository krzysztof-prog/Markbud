import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/dashboard - dane głównego dashboardu
  fastify.get('/', async () => {
    // Aktywne zlecenia (nie zarchiwizowane)
    const activeOrdersCount = await prisma.order.count({
      where: { archivedAt: null },
    });

    // Nadchodzące dostawy (w ciągu 7 dni)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingDeliveries = await prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: now,
          lte: weekFromNow,
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

    // Oczekujące importy
    const pendingImports = await prisma.fileImport.findMany({
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
      take: 10,
    });

    // Braki materiałowe
    const shortages = await getShortages();

    // Ostatnie zlecenia
    const recentOrders = await prisma.order.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        valuePln: true,
      },
    });

    return {
      stats: {
        activeOrders: activeOrdersCount,
        upcomingDeliveriesCount: upcomingDeliveries.length,
        pendingImportsCount: pendingImports.length,
        shortagesCount: shortages.length,
      },
      upcomingDeliveries: upcomingDeliveries.map((d) => ({
        id: d.id,
        deliveryDate: d.deliveryDate.toISOString(),
        status: d.status,
        ordersCount: d._count.deliveryOrders,
        weekNumber: getWeekNumber(d.deliveryDate),
      })),
      pendingImports,
      shortages: shortages.slice(0, 5), // Top 5 braków
      recentOrders,
    };
  });

  // GET /api/dashboard/alerts - alerty
  fastify.get('/alerts', async () => {
    const alerts = [];

    // Braki materiałowe
    const shortages = await getShortages();
    for (const shortage of shortages) {
      if (shortage) {
        alerts.push({
          type: 'shortage',
          priority: shortage.priority,
          message: `Brak profilu ${shortage.profileNumber} w kolorze ${shortage.colorName}`,
          details: `Brakuje ${shortage.shortage} bel`,
          data: shortage,
        });
      }
    }

    // Oczekujące importy
    const pendingImports = await prisma.fileImport.count({
      where: { status: 'pending' },
    });
    if (pendingImports > 0) {
      alerts.push({
        type: 'import',
        priority: 'medium',
        message: `${pendingImports} plik(ów) oczekuje na import`,
        details: 'Sprawdź zakładkę importów',
      });
    }

    // Dostawy na dziś
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayDeliveries = await prisma.delivery.count({
      where: {
        deliveryDate: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['planned', 'in_preparation'] },
      },
    });

    if (todayDeliveries > 0) {
      alerts.push({
        type: 'delivery',
        priority: 'high',
        message: `${todayDeliveries} dostawa(y) zaplanowana na dziś`,
        details: 'Sprawdź kalendarz dostaw',
      });
    }

    // Sortuj po priorytecie
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort(
      (a, b) =>
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
    );

    return alerts;
  });

  // GET /api/dashboard/stats/weekly - statystyki tygodniowe dla najbliższych 8 tygodni
  fastify.get('/stats/weekly', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Znajdź poniedziałek bieżącego tygodnia
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + daysToMonday);

    // Pobierz dostawy dla najbliższych 8 tygodni (56 dni)
    const endDate = new Date(startOfWeek);
    endDate.setDate(startOfWeek.getDate() + 56);

    // OPTIMIZED: Single raw SQL query z GROUP BY zamiast deep nesting
    const weekStats = await prisma.$queryRaw<Array<{
      deliveryDate: Date;
      deliveriesCount: bigint;
      ordersCount: bigint;
      windowsCount: bigint;
    }>>`
      SELECT
        DATE(d.delivery_date) as "deliveryDate",
        COUNT(DISTINCT d.id) as "deliveriesCount",
        COUNT(DISTINCT do.order_id) as "ordersCount",
        COALESCE(SUM(ow.quantity), 0) as "windowsCount"
      FROM deliveries d
      LEFT JOIN delivery_orders do ON do.delivery_id = d.id
      LEFT JOIN order_windows ow ON ow.order_id = do.order_id
      WHERE d.delivery_date >= ${startOfWeek}
        AND d.delivery_date < ${endDate}
      GROUP BY DATE(d.delivery_date)
      ORDER BY d.delivery_date ASC
    `;

    // Grupuj po tygodniach w JavaScript (szybkie, bo już zagregowane)
    const weeks: any[] = [];
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() + (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Znajdź dostawy w tym tygodniu (z już zagregowanych danych)
      const weekData = weekStats.filter((stat) => {
        const date = new Date(stat.deliveryDate);
        return date >= weekStart && date <= weekEnd;
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
  });

  // GET /api/dashboard/stats/monthly - statystyki miesięczne
  fastify.get<{
    Querystring: { month?: string; year?: string };
  }>('/stats/monthly', async (request) => {
    const { month, year } = request.query;

    const now = new Date();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth();
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    // Zlecenia w danym miesiącu
    const orders = await prisma.order.findMany({
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

    // Oblicz statystyki
    let totalOrders = orders.length;
    let totalWindows = 0;
    let totalValuePln = 0;
    let totalValueEur = 0;

    for (const order of orders) {
      totalWindows += order.windows.reduce((sum, w) => sum + w.quantity, 0);
      totalValuePln += parseFloat(order.valuePln?.toString() || '0');
      totalValueEur += parseFloat(order.valueEur?.toString() || '0');
    }

    // Dostawy w danym miesiącu
    const deliveries = await prisma.delivery.count({
      where: {
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      month: targetMonth + 1,
      year: targetYear,
      totalOrders,
      totalWindows,
      totalValuePln,
      totalValueEur,
      totalDeliveries: deliveries,
    };
  });
};

// Helper function to get ISO week number from date
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNum;
}

// Interface for raw SQL shortage result
interface ShortageResult {
  profileId: number;
  profileNumber: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  currentStock: number;
  demand: number;
  afterDemand: number;
  shortage: number;
}

// Helper function do pobierania braków - OPTIMIZED (single raw SQL query)
async function getShortages() {
  // Single query z LEFT JOIN zamiast 2 osobnych queries + O(n) mapping
  const shortages = await prisma.$queryRaw<ShortageResult[]>`
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

  // Mapowanie do formatu API (bardzo szybkie, już zagregowane dane)
  return shortages.map((s) => ({
    profileId: s.profileId,
    profileNumber: s.profileNumber,
    colorId: s.colorId,
    colorCode: s.colorCode,
    colorName: s.colorName,
    currentStock: s.currentStock,
    demand: Number(s.demand),
    shortage: Number(s.shortage),
    priority: calculatePriority(Number(s.afterDemand)),
  }));
}

// Helper function for calculating priority
function calculatePriority(afterDemand: number): 'critical' | 'high' | 'medium' {
  if (afterDemand < -10) return 'critical';
  if (afterDemand < -5) return 'high';
  return 'medium';
}
