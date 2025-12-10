import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { emitWarehouseStockUpdated } from '../services/event-emitter.js';

export const warehouseRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/warehouse/:colorId - tabela magazynowa dla koloru
  fastify.get<{ Params: { colorId: string } }>('/:colorId', async (request) => {
    const { colorId } = request.params;

    // Pobierz stany magazynowe dla tego koloru
    const stocks = await prisma.warehouseStock.findMany({
      where: { colorId: parseInt(colorId) },
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

    // Pobierz informacje o kolorze
    const colorInfo = await prisma.color.findUnique({
      where: { id: parseInt(colorId) },
      select: { id: true, code: true, name: true, hexColor: true, type: true },
    });

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
        initialStock: stock.initialStockBeams,
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

    return {
      color: colorInfo,
      data: tableData,
    };
  });

  // PUT /api/warehouse/:colorId/:profileId - aktualizuj stan magazynowy
  fastify.put<{
    Params: { colorId: string; profileId: string };
    Body: {
      currentStockBeams?: number;
    };
  }>('/:colorId/:profileId', async (request) => {
    const { colorId, profileId } = request.params;
    const { currentStockBeams } = request.body;

    const stock = await prisma.warehouseStock.update({
      where: {
        profileId_colorId: {
          profileId: parseInt(profileId),
          colorId: parseInt(colorId),
        },
      },
      data: {
        currentStockBeams,
      },
      select: {
        profileId: true,
        colorId: true,
        currentStockBeams: true,
        updatedAt: true,
        profile: {
          select: { id: true, number: true, name: true },
        },
        color: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Emit event
    emitWarehouseStockUpdated(stock);

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

    // Use transaction to prevent race conditions
    for (const update of updates) {
      const result = await prisma.$transaction(async (tx) => {
        // Pobierz aktualny stan (obliczony) w transakcji
        const currentStock = await tx.warehouseStock.findUnique({
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
        await tx.warehouseHistory.create({
          data: {
            profileId: update.profileId,
            colorId,
            calculatedStock,
            actualStock: update.actualStock,
            difference,
          },
        });

        // Zaktualizuj stan magazynowy
        await tx.warehouseStock.update({
          where: {
            profileId_colorId: {
              profileId: update.profileId,
              colorId,
            },
          },
          data: {
            currentStockBeams: update.actualStock,
            initialStockBeams: calculatedStock,
          },
        });

        return {
          profileId: update.profileId,
          calculatedStock,
          actualStock: update.actualStock,
          difference,
        };
      });

      results.push(result);
    }

    // Automatyczna archiwizacja zleceń completed dla tego koloru
    const archivedOrders = await prisma.order.updateMany({
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
      archivedOrdersCount: archivedOrders.count,
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

  // GET /api/warehouse/history - historia dla wszystkich kolorów
  fastify.get<{
    Querystring: { limit?: string };
  }>('/history', async (request) => {
    const { limit } = request.query;

    const history = await prisma.warehouseHistory.findMany({
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

  // POST /api/warehouse/rollback-inventory - cofnij ostatnią inwentaryzację
  fastify.post<{
    Body: {
      colorId: number;
    };
  }>('/rollback-inventory', async (request, reply) => {
    const { colorId } = request.body;

    // Pobierz ostatnie wpisy z historii dla tego koloru
    const lastInventoryRecords = await prisma.warehouseHistory.findMany({
      where: { colorId },
      orderBy: { recordedAt: 'desc' },
      take: 100, // Zakładamy że inwentaryzacja dotyczy max 100 profili
    });

    if (lastInventoryRecords.length === 0) {
      return reply.status(404).send({ error: 'Brak historii inwentaryzacji do cofnięcia' });
    }

    // Grupuj po dacie (z dokładnością do minuty) - wszystkie z tej samej inwentaryzacji
    const latestDate = lastInventoryRecords[0].recordedAt;

    // Sprawdź czy inwentaryzacja nie jest starsza niż 24h
    const hoursSinceInventory = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceInventory >= 24) {
      return reply.status(400).send({
        error: 'Nie można cofnąć inwentaryzacji starszej niż 24h',
        recordedAt: latestDate.toISOString(),
        hoursSince: hoursSinceInventory.toFixed(1)
      });
    }

    const inventoryToRollback = lastInventoryRecords.filter((record) => {
      const timeDiff = Math.abs(latestDate.getTime() - record.recordedAt.getTime());
      return timeDiff < 60000; // W ciągu 1 minuty = ta sama inwentaryzacja
    });

    // Cofnij każdy wpis w transakcji
    const result = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const record of inventoryToRollback) {
        // Przywróć stan magazynu do wartości obliczonej (przed inwentaryzacją)
        await tx.warehouseStock.update({
          where: {
            profileId_colorId: {
              profileId: record.profileId,
              colorId: record.colorId,
            },
          },
          data: {
            currentStockBeams: record.calculatedStock,
          },
        });

        // Usuń wpis z historii
        await tx.warehouseHistory.delete({
          where: { id: record.id },
        });

        results.push({
          profileId: record.profileId,
          restoredStock: record.calculatedStock,
          removedActualStock: record.actualStock,
        });
      }

      // Znajdź zlecenia zarchiwizowane w tym samym czasie i przywróć je
      const archivedOrders = await tx.order.findMany({
        where: {
          status: 'archived',
          archivedAt: {
            gte: new Date(latestDate.getTime() - 60000), // 1 minuta przed
            lte: new Date(latestDate.getTime() + 60000), // 1 minuta po
          },
          requirements: {
            some: { colorId },
          },
        },
      });

      // Przywróć status 'completed' dla zarchiwizowanych zleceń
      if (archivedOrders.length > 0) {
        await tx.order.updateMany({
          where: {
            id: { in: archivedOrders.map((o) => o.id) },
          },
          data: {
            status: 'completed',
            archivedAt: null,
          },
        });
      }

      return {
        rolledBackRecords: results,
        restoredOrdersCount: archivedOrders.length,
      };
    });

    return {
      success: true,
      message: `Cofnięto inwentaryzację z ${latestDate.toISOString()}`,
      ...result,
    };
  });

  // GET /api/warehouse/shortages - lista braków materiałowych
  fastify.get('/shortages', async () => {
    // Pobierz wszystkie stany magazynowe z zapotrzebowaniem
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

    // Pobierz zamówienia magazynowe dla każdego profilu/koloru
    const warehouseOrders = await prisma.warehouseOrder.findMany({
      where: {
        status: 'pending',
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });

    // Mapa zamówień po profileId-colorId
    const ordersMap = new Map<string, typeof warehouseOrders>();
    warehouseOrders.forEach((order) => {
      const key = `${order.profileId}-${order.colorId}`;
      if (!ordersMap.has(key)) {
        ordersMap.set(key, []);
      }
      ordersMap.get(key)!.push(order);
    });

    // Znajdź braki
    const shortages = stocks
      .map((stock) => {
        const key = `${stock.profileId}-${stock.colorId}`;
        const demand = demandMap.get(key) || 0;
        const afterDemand = stock.currentStockBeams - demand;
        const orders = ordersMap.get(key) || [];
        const totalOrderedBeams = orders.reduce((sum, o) => sum + o.orderedBeams, 0);
        const nearestDeliveryDate = orders.length > 0 ? orders[0].expectedDeliveryDate : null;

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
            priority: afterDemand < -10 ? 'critical' : afterDemand < -5 ? 'high' : 'medium',
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.shortage || 0) - (a?.shortage || 0));

    return shortages;
  });

  // GET /api/warehouse/:colorId/average - średnia miesięczna zużycia profili
  fastify.get<{
    Params: { colorId: string };
    Querystring: { months?: string };
  }>('/:colorId/average', async (request) => {
    const { colorId } = request.params;
    const months = parseInt(request.query.months || '6');

    // Oblicz datę sprzed X miesięcy
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Pobierz zapotrzebowania z ukończonych zleceń (używamy deliveryDate jako daty wykonania)
    const requirements = await prisma.orderRequirement.findMany({
      where: {
        colorId: parseInt(colorId),
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

    // Pobierz zlecenia z deliveryDate
    const orderIds = [...new Set(requirements.map((r) => r.orderId))];
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, deliveryDate: true },
    });

    const orderDateMap = new Map(orders.map((o) => [o.id, o.deliveryDate]));

    // Pobierz profile
    const profileIds = [...new Set(requirements.map((r) => r.profileId))];
    const profiles = await prisma.profile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, number: true, name: true },
    });

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // Grupuj po profileId i miesiącu
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

    // Oblicz średnią dla każdego profilu
    const averages = Array.from(profileMonthlyData.entries()).map(
      ([profileId, data]) => {
        const monthlyData = Array.from(data.monthlyUsage.entries())
          .map(([month, beams]) => ({ month, beams }))
          .sort((a, b) => b.month.localeCompare(a.month));

        const totalBeams = monthlyData.reduce((sum, m) => sum + m.beams, 0);
        const averageBeamsPerMonth =
          monthlyData.length > 0 ? totalBeams / months : 0;

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

    return { averages, requestedMonths: months };
  });

  // POST /api/warehouse/finalize-month - zakończenie remanentu miesiąca
  fastify.post<{
    Body: {
      month: string; // Format: "YYYY-MM"
      archive?: boolean;
    };
  }>('/finalize-month', async (request) => {
    const { month, archive } = request.body;

    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    if (!archive) {
      // Tylko zwróć preview
      const ordersToArchive = await prisma.order.findMany({
        where: {
          status: 'completed',
          deliveryDate: {
            gte: startDate,
            lt: endDate,
          },
          archivedAt: null,
        },
        select: {
          id: true,
          orderNumber: true,
          deliveryDate: true,
        },
      });

      return {
        preview: true,
        ordersCount: ordersToArchive.length,
        orderNumbers: ordersToArchive.map((o) => o.orderNumber),
        month,
      };
    }

    // Archiwizuj zlecenia
    const ordersToArchive = await prisma.order.findMany({
      where: {
        status: 'completed',
        deliveryDate: {
          gte: startDate,
          lt: endDate,
        },
        archivedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (ordersToArchive.length === 0) {
      return {
        success: true,
        message: `Brak zleceń do archiwizacji za ${month}`,
        archivedCount: 0,
        archivedOrderNumbers: [],
      };
    }

    await prisma.order.updateMany({
      where: {
        id: { in: ordersToArchive.map((o) => o.id) },
      },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Zarchiwizowano ${ordersToArchive.length} zleceń za ${month}`,
      archivedCount: ordersToArchive.length,
      archivedOrderNumbers: ordersToArchive.map((o) => o.orderNumber),
    };
  });
};
