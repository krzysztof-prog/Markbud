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

    const deliveries = await prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: startOfWeek,
          lt: endDate,
        },
      },
      include: {
        deliveryOrders: {
          include: {
            order: {
              include: {
                windows: {
                  select: { quantity: true },
                },
              },
            },
          },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });

    // Grupuj dostawy po tygodniach
    const weeks: any[] = [];
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() + (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Znajdź dostawy w tym tygodniu
      const weekDeliveries = deliveries.filter((d) => {
        const deliveryDate = new Date(d.deliveryDate);
        return deliveryDate >= weekStart && deliveryDate <= weekEnd;
      });

      // Oblicz statystyki dla tygodnia
      let windows = 0;
      let sashes = 0;
      let glasses = 0;

      weekDeliveries.forEach((delivery) => {
        delivery.deliveryOrders.forEach((dOrder: any) => {
          // Oblicz z relacji windows
          const orderWindows = dOrder.order.windows?.reduce(
            (sum: number, w: any) => sum + (w.quantity || 0),
            0
          ) || 0;

          windows += orderWindows;
          // Dla uproszczenia zakładamy, że każde okno to 1 skrzydło i 1 szyba
          // TODO: Dodać dokładniejsze obliczenia z modelu danych
          sashes += orderWindows;
          glasses += orderWindows;
        });
      });

      weeks.push({
        weekNumber: i + 1,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        deliveriesCount: weekDeliveries.length,
        windows,
        sashes,
        glasses,
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
