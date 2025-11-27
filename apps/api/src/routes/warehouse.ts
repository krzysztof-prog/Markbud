import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';

export const warehouseRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/warehouse/:colorId - tabela magazynowa dla koloru
  fastify.get<{ Params: { colorId: string } }>('/:colorId', async (request) => {
    const { colorId } = request.params;

    // Pobierz stany magazynowe dla tego koloru
    const stocks = await prisma.warehouseStock.findMany({
      where: { colorId: parseInt(colorId) },
      select: {
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        orderedBeams: true,
        expectedDeliveryDate: true,
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

    // Pobierz zapotrzebowanie z aktywnych zleceń
    const demands = await prisma.orderRequirement.groupBy({
      by: ['profileId'],
      where: {
        colorId: parseInt(colorId),
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

    // Mapa zapotrzebowania
    const demandMap = new Map(
      demands.map((d) => [
        d.profileId,
        {
          beams: d._sum.beamsCount || 0,
          meters: parseFloat(d._sum.meters?.toString() || '0'),
        },
      ])
    );

    // Pobierz zamówienia magazynowe dla tego koloru (pending i received)
    const allWarehouseOrders = await prisma.warehouseOrder.findMany({
      where: {
        colorId: parseInt(colorId),
        status: { in: ['pending', 'received'] },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });

    // Rozdziel na pending i received
    const pendingOrders = allWarehouseOrders.filter((o) => o.status === 'pending');
    const receivedOrders = allWarehouseOrders.filter((o) => o.status === 'received');

    // Pogrupuj pending zamówienia według profileId
    const pendingOrdersMap = new Map<number, any[]>();
    pendingOrders.forEach((order) => {
      if (!pendingOrdersMap.has(order.profileId)) {
        pendingOrdersMap.set(order.profileId, []);
      }
      pendingOrdersMap.get(order.profileId)!.push(order);
    });

    // Pogrupuj received zamówienia według profileId
    const receivedOrdersMap = new Map<number, any[]>();
    receivedOrders.forEach((order) => {
      if (!receivedOrdersMap.has(order.profileId)) {
        receivedOrdersMap.set(order.profileId, []);
      }
      receivedOrdersMap.get(order.profileId)!.push(order);
    });

    // Pobierz próg niskiego stanu
    const lowThresholdSetting = await prisma.setting.findUnique({
      where: { key: 'lowStockThreshold' },
    });
    const lowThreshold = parseInt(lowThresholdSetting?.value || '10');

    // Przekształć na format tabeli
    const tableData = stocks.map((stock) => {
      const demand = demandMap.get(stock.profileId) || { beams: 0, meters: 0 };
      const afterDemand = stock.currentStockBeams - demand.beams;
      const pendingOrdersList = pendingOrdersMap.get(stock.profileId) || [];
      const receivedOrdersList = receivedOrdersMap.get(stock.profileId) || [];

      // Oblicz sumę zamówionych bel (tylko pending) i znajdź najbliższą datę
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
        demand: demand.beams,
        demandMeters: demand.meters,
        afterDemand,
        orderedBeams: totalOrderedBeams,
        expectedDeliveryDate: nearestDeliveryDate,
        pendingOrders: pendingOrdersList, // pending zamówienia
        receivedOrders: receivedOrdersList, // otrzymane zamówienia (historia)
        isLow: stock.currentStockBeams <= lowThreshold,
        isNegative: afterDemand < 0,
        updatedAt: stock.updatedAt,
      };
    });

    return tableData;
  });

  // PUT /api/warehouse/:colorId/:profileId - aktualizuj stan magazynowy
  fastify.put<{
    Params: { colorId: string; profileId: string };
    Body: {
      currentStockBeams?: number;
      orderedBeams?: number;
      expectedDeliveryDate?: string;
    };
  }>('/:colorId/:profileId', async (request) => {
    const { colorId, profileId } = request.params;
    const { currentStockBeams, orderedBeams, expectedDeliveryDate } = request.body;

    const stock = await prisma.warehouseStock.update({
      where: {
        profileId_colorId: {
          profileId: parseInt(profileId),
          colorId: parseInt(colorId),
        },
      },
      data: {
        currentStockBeams,
        orderedBeams,
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : undefined,
      },
      select: {
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        orderedBeams: true,
        expectedDeliveryDate: true,
        updatedAt: true,
        profile: {
          select: { id: true, number: true, name: true },
        },
        color: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return stock;
  });

  // POST /api/warehouse/monthly-update - aktualizacja miesięczna (stan z natury)
  fastify.post<{
    Body: {
      colorId: number;
      updates: Array<{
        profileId: number;
        actualStock: number;
      }>;
    };
  }>('/monthly-update', async (request) => {
    const { colorId, updates } = request.body;

    const results = [];

    for (const update of updates) {
      // Pobierz aktualny stan (obliczony)
      const currentStock = await prisma.warehouseStock.findUnique({
        where: {
          profileId_colorId: {
            profileId: update.profileId,
            colorId,
          },
        },
      });

      const calculatedStock = currentStock?.currentStockBeams || 0;
      const difference = update.actualStock - calculatedStock;

      // Zapisz w historii
      await prisma.warehouseHistory.create({
        data: {
          profileId: update.profileId,
          colorId,
          calculatedStock,
          actualStock: update.actualStock,
          difference,
        },
      });

      // Zaktualizuj stan magazynowy
      const updatedStock = await prisma.warehouseStock.update({
        where: {
          profileId_colorId: {
            profileId: update.profileId,
            colorId,
          },
        },
        data: {
          currentStockBeams: update.actualStock,
        },
      });

      results.push({
        profileId: update.profileId,
        calculatedStock,
        actualStock: update.actualStock,
        difference,
      });
    }

    // Archiwizuj zrealizowane zlecenia dla tego koloru
    const completedOrders = await prisma.order.updateMany({
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
      archivedOrdersCount: completedOrders.count,
    };
  });

  // GET /api/warehouse/history/:colorId - historia zmian magazynu
  fastify.get<{
    Params: { colorId: string };
    Querystring: { limit?: string };
  }>('/history/:colorId', async (request) => {
    const { colorId } = request.params;
    const { limit } = request.query;

    const history = await prisma.warehouseHistory.findMany({
      where: { colorId: parseInt(colorId) },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        calculatedStock: true,
        actualStock: true,
        difference: true,
        recordedAt: true,
        profile: {
          select: { id: true, number: true, name: true },
        },
        color: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit ? parseInt(limit) : 100,
    });

    return history;
  });

  // GET /api/warehouse/shortages - lista braków materiałowych
  fastify.get('/shortages', async () => {
    // Pobierz wszystkie stany magazynowe z zapotrzebowaniem
    const stocks = await prisma.warehouseStock.findMany({
      select: {
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        orderedBeams: true,
        expectedDeliveryDate: true,
        profile: {
          select: { id: true, number: true },
        },
        color: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Pobierz zapotrzebowanie z aktywnych zleceń
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

    // Mapa zapotrzebowania
    const demandMap = new Map(
      demands.map((d) => [`${d.profileId}-${d.colorId}`, d._sum.beamsCount || 0])
    );

    // Znajdź braki
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
            orderedBeams: stock.orderedBeams,
            expectedDeliveryDate: stock.expectedDeliveryDate,
            priority: afterDemand < -10 ? 'critical' : afterDemand < -5 ? 'high' : 'medium',
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.shortage || 0) - (a?.shortage || 0));

    return shortages;
  });
};
