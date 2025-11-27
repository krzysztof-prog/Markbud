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
        date: d.deliveryDate,
        status: d.status,
        ordersCount: d._count.deliveryOrders,
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

// Helper function do pobierania braków
async function getShortages() {
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

  const demandMap = new Map(
    demands.map((d) => [`${d.profileId}-${d.colorId}`, d._sum.beamsCount || 0])
  );

  const shortages = stocks
    .map((stock) => {
      const key = `${stock.profileId}-${stock.colorId}`;
      const demand = demandMap.get(key) || 0;
      const afterDemand = stock.currentStockBeams - demand;

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
          priority:
            afterDemand < -10 ? 'critical' : afterDemand < -5 ? 'high' : 'medium',
        };
      }
      return null;
    })
    .filter(Boolean);

  return shortages.sort((a, b) => (b?.shortage || 0) - (a?.shortage || 0));
}
