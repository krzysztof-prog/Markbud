import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { deliveryTotalsService } from '../services/deliveryTotalsService.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { DeliveryService } from '../services/deliveryService.js';
import {
  emitDeliveryCreated,
  emitDeliveryUpdated,
  emitDeliveryDeleted,
  emitOrderUpdated,
} from '../services/event-emitter.js';
import {
  createDeliverySchema,
  updateDeliverySchema,
  deliveryQuerySchema,
  deliveryParamsSchema,
  addOrderSchema,
  moveOrderSchema,
  reorderSchema,
  addItemSchema,
  completeDeliverySchema,
} from '../validators/delivery.js';
import { NotFoundError } from '../utils/errors.js';

export const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize service layer for endpoints requiring business logic and event emission
  const deliveryRepository = new DeliveryRepository(prisma);
  const deliveryService = new DeliveryService(deliveryRepository);

  // GET /api/deliveries - lista dostaw
  fastify.get<{
    Querystring: {
      from?: string;
      to?: string;
      status?: string;
    };
  }>('/', async (request) => {
    const validated = deliveryQuerySchema.parse(request.query);
    const { from, to, status } = validated;

    const where: any = {};

    if (from || to) {
      where.deliveryDate = {};
      if (from) where.deliveryDate.gte = new Date(from);
      if (to) where.deliveryDate.lte = new Date(to);
    }

    if (status) {
      where.status = status;
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        deliveryOrders: {
          select: {
            deliveryId: true,
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                valueEur: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { deliveryOrders: true },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });

    // Pobierz totals dla wszystkich dostaw jednym zapytaniem
    const deliveryIds = deliveries.map(d => d.id);
    const totalsMap = new Map();

    if (deliveryIds.length > 0) {
      // Pobierz liczbę zleceń per dostawa
      const orderCounts = await prisma.deliveryOrder.groupBy({
        by: ['deliveryId'],
        where: { deliveryId: { in: deliveryIds } },
        _count: true,
      });

      // Oblicz sumy wartości z danych już pobranych w deliveries
      for (const count of orderCounts) {
        const delivery = deliveries.find(d => d.id === count.deliveryId);
        let totalValuePln = 0;
        let totalValueEur = 0;

        if (delivery?.deliveryOrders) {
          for (const dOrder of delivery.deliveryOrders) {
            totalValuePln += parseFloat(dOrder.order.valuePln?.toString() || '0');
            totalValueEur += parseFloat(dOrder.order.valueEur?.toString() || '0');
          }
        }

        totalsMap.set(count.deliveryId, {
          totalOrders: count._count,
          totalValuePln,
          totalValueEur,
        });
      }
    }

    // Mapuj totals do każdej dostawy
    const deliveriesWithTotals = deliveries.map((delivery) => ({
      ...delivery,
      ...totalsMap.get(delivery.id) || { totalOrders: 0, totalValuePln: 0, totalValueEur: 0 },
    }));

    return deliveriesWithTotals;
  });

  // GET /api/deliveries/calendar - dane do kalendarza
  fastify.get<{
    Querystring: {
      month: string;
      year: string;
    };
  }>('/calendar', async (request, reply) => {
    const { month, year } = request.query;

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return reply.status(400).send({ error: 'Nieprawidłowy rok lub miesiąc' });
    }

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    const deliveries = await prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        deliveryOrders: {
          select: {
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalWindows: true,
                totalSashes: true,
                totalGlasses: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        deliveryItems: {
          select: {
            id: true,
            itemType: true,
            description: true,
            quantity: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });

    // Zlecenia bez przypisanej dostawy
    const unassignedOrders = await prisma.order.findMany({
      where: {
        archivedAt: null,
        status: { notIn: ['archived'] },
        deliveryOrders: {
          none: {},
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryDate: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
      },
      orderBy: { orderNumber: 'asc' },
    });

    return {
      deliveries,
      unassignedOrders,
    };
  });

  // GET /api/deliveries/:id - szczegóły dostawy
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        deliveryOrders: {
          select: {
            deliveryId: true,
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                valueEur: true,
                status: true,
                windows: {
                  select: {
                    id: true,
                    widthMm: true,
                    heightMm: true,
                    quantity: true,
                  },
                },
                requirements: {
                  select: {
                    id: true,
                    profileId: true,
                    colorId: true,
                    beamsCount: true,
                    meters: true,
                    profile: {
                      select: { id: true, number: true, name: true },
                    },
                    color: {
                      select: { id: true, code: true, name: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        deliveryItems: {
          select: {
            id: true,
            deliveryId: true,
            itemType: true,
            description: true,
            quantity: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    // Dodaj obliczone totals
    const totals = await deliveryTotalsService.getDeliveryTotals(delivery.id);

    return {
      ...delivery,
      ...totals,
    };
  });

  // POST /api/deliveries - utwórz dostawę
  fastify.post<{
    Body: {
      deliveryDate: string;
      deliveryNumber?: string;
      notes?: string;
    };
  }>('/', async (request, reply) => {
    const validated = createDeliverySchema.parse(request.body);
    const { deliveryDate, deliveryNumber, notes } = validated;

    const delivery = await prisma.delivery.create({
      data: {
        deliveryDate: new Date(deliveryDate),
        deliveryNumber,
        notes,
      },
    });

    // Emit event
    emitDeliveryCreated(delivery);

    return reply.status(201).send(delivery);
  });

  // PUT /api/deliveries/:id - aktualizuj dostawę
  fastify.put<{
    Params: { id: string };
    Body: {
      deliveryDate?: string;
      status?: string;
      notes?: string;
    };
  }>('/:id', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);
    const validated = updateDeliverySchema.parse(request.body);
    const { deliveryDate, status, notes } = validated;

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        status,
        notes,
      },
    });

    // Emit event
    emitDeliveryUpdated(delivery);

    return delivery;
  });

  // DELETE /api/deliveries/:id - usuń dostawę
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    await prisma.delivery.delete({
      where: { id: deliveryId },
    });

    // Emit event
    emitDeliveryDeleted(deliveryId);

    return reply.status(204).send();
  });

  // POST /api/deliveries/:id/orders - dodaj zlecenie do dostawy
  fastify.post<{
    Params: { id: string };
    Body: { orderId: number };
  }>('/:id/orders', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { orderId } = addOrderSchema.parse(request.body);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    // Pobierz aktualną maksymalną pozycję
    const maxPosition = await prisma.deliveryOrder.aggregate({
      where: { deliveryId },
      _max: { position: true },
    });

    const newPosition = (maxPosition._max.position || 0) + 1;

    const deliveryOrder = await prisma.deliveryOrder.create({
      data: {
        deliveryId,
        orderId,
        position: newPosition,
      },
      select: {
        deliveryId: true,
        orderId: true,
        position: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            valuePln: true,
          },
        },
      },
    });

    // Emit events
    emitDeliveryUpdated({ id: deliveryId });
    emitOrderUpdated({ id: orderId });

    return reply.status(201).send(deliveryOrder);
  });

  // DELETE /api/deliveries/:id/orders/:orderId - usuń zlecenie z dostawy
  fastify.delete<{
    Params: { id: string; orderId: string };
  }>('/:id/orders/:orderId', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);
    const orderId = parseInt(request.params.orderId, 10);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId) || isNaN(orderId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID or order ID' });
    }

    await prisma.deliveryOrder.delete({
      where: {
        deliveryId_orderId: {
          deliveryId,
          orderId,
        },
      },
    });

    // Emit events
    emitDeliveryUpdated({ id: deliveryId });
    emitOrderUpdated({ id: orderId });

    return reply.status(204).send();
  });

  // PUT /api/deliveries/:id/orders/reorder - zmień kolejność zleceń
  fastify.put<{
    Params: { id: string };
    Body: { orderIds: number[] };
  }>('/:id/orders/reorder', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { orderIds } = reorderSchema.parse(request.body);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    // Zaktualizuj pozycje
    const updates = orderIds.map((orderId, index) =>
      prisma.deliveryOrder.update({
        where: {
          deliveryId_orderId: {
            deliveryId,
            orderId,
          },
        },
        data: { position: index + 1 },
      })
    );

    try {
      await prisma.$transaction(updates);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to reorder delivery orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // POST /api/deliveries/:id/move-order - przenieś zlecenie między dostawami
  fastify.post<{
    Params: { id: string };
    Body: {
      orderId: number;
      targetDeliveryId: number;
    };
  }>('/:id/move-order', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { orderId, targetDeliveryId } = moveOrderSchema.parse(request.body);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    // Delegate to service layer for proper event emission and transactional handling
    // Service handles: transaction, WebSocket events (emitDeliveryUpdated, emitOrderUpdated), business logic
    const deliveryOrder = await deliveryService.moveOrderBetweenDeliveries(
      deliveryId,
      targetDeliveryId,
      orderId
    );

    return reply.send(deliveryOrder);
  });

  // GET /api/deliveries/:id/protocol - wygeneruj protokół odbioru
  fastify.get<{ Params: { id: string } }>('/:id/protocol', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        deliveryDate: true,
        deliveryOrders: {
          select: {
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                windows: {
                  select: {
                    id: true,
                    quantity: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    // Oblicz statystyki
    let totalWindows = 0;
    let totalValue = 0;

    const orders = delivery.deliveryOrders.map((do_) => {
      const windowsCount = do_.order.windows.reduce((sum, w) => sum + w.quantity, 0);
      totalWindows += windowsCount;

      const value = parseFloat(do_.order.valuePln?.toString() || '0');
      totalValue += value;

      return {
        orderNumber: do_.order.orderNumber,
        windowsCount,
        value,
        isReclamation: false, // TODO: dodać pole reklamacji do Order
      };
    });

    // Pobierz obliczony totalPallets z sługi
    const totalPallets = await deliveryTotalsService.getTotalPallets(deliveryId);

    const protocol = {
      deliveryId: deliveryId,
      deliveryDate: delivery.deliveryDate,
      orders,
      totalWindows,
      totalPallets,
      totalValue,
      generatedAt: new Date(),
    };

    return protocol;
  });

  // POST /api/deliveries/:id/items - dodaj dodatkowy artykuł do dostawy
  fastify.post<{
    Params: { id: string };
    Body: {
      itemType: string;
      description: string;
      quantity: number;
    };
  }>('/:id/items', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { itemType, description, quantity } = addItemSchema.parse(request.body);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    const item = await prisma.deliveryItem.create({
      data: {
        deliveryId,
        itemType,
        description,
        quantity,
      },
    });

    // Emit event
    emitDeliveryUpdated({ id: deliveryId });

    return reply.status(201).send(item);
  });

  // DELETE /api/deliveries/:id/items/:itemId - usuń dodatkowy artykuł
  fastify.delete<{
    Params: { id: string; itemId: string };
  }>('/:id/items/:itemId', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);
    const itemId = parseInt(request.params.itemId, 10);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId) || isNaN(itemId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID or item ID' });
    }

    await prisma.deliveryItem.delete({
      where: { id: itemId },
    });

    // Emit event
    emitDeliveryUpdated({ id: deliveryId });

    return reply.status(204).send();
  });

  // POST /api/deliveries/:id/complete - oznacz zlecenia jako zakończone
  fastify.post<{
    Params: { id: string };
    Body: {
      productionDate: string;
    };
  }>('/:id/complete', async (request, reply) => {
    const { id } = deliveryParamsSchema.parse(request.params);
    const { productionDate } = completeDeliverySchema.parse(request.body);

    const deliveryId = parseInt(id, 10);
    if (isNaN(deliveryId)) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        deliveryOrders: {
          select: {
            orderId: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    // Zaktualizuj wszystkie zlecenia z tej dostawy
    const orderIds = delivery.deliveryOrders.map((d) => d.orderId);

    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data: {
        productionDate: new Date(productionDate),
        status: 'completed',
      },
    });

    // Emit events for delivery and all orders
    emitDeliveryUpdated({ id: deliveryId });
    orderIds.forEach((orderId) => {
      emitOrderUpdated({ id: orderId });
    });

    return { success: true, updatedOrders: orderIds.length };
  });

  // GET /api/deliveries/profile-requirements - pobierz sumy profili pogrupowane po dostawach
  fastify.get('/profile-requirements', async (request) => {
    const { from } = request.query as { from?: string };

    // Przygotuj warunek filtrowania po dacie
    const whereCondition: any = {};
    if (from) {
      whereCondition.deliveryDate = {
        gte: new Date(from),
      };
    }

    // Pobierz wszystkie dostawy z ich zleceniami
    const deliveries = await prisma.delivery.findMany({
      where: whereCondition,
      select: {
        id: true,
        deliveryDate: true,
        deliveryOrders: {
          select: {
            order: {
              select: {
                id: true,
                requirements: {
                  select: {
                    profileId: true,
                    colorId: true,
                    beamsCount: true,
                    meters: true,
                    color: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Agreguj profile requirements po dostawach
    const result: Array<{
      deliveryId: number;
      deliveryDate: string;
      profileId: number;
      colorCode: string;
      totalBeams: number;
    }> = [];

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
          console.error(`Invalid profile ID: ${profileIdStr}`);
          return;
        }

        // Dodaj belki z metrów: suma metrów / 6m, zaokrąglona w górę
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
  });

  // GET /api/deliveries/stats/profiles - statystyki użycia profili miesięcznie
  fastify.get<{
    Querystring: {
      months?: string; // liczba miesięcy wstecz (domyślnie 6)
    };
  }>('/stats/profiles', async (request, reply) => {
    const monthsBack = parseInt(request.query.months || '6', 10);

    if (isNaN(monthsBack) || monthsBack < 1 || monthsBack > 60) {
      return reply.status(400).send({ error: 'Invalid months parameter (must be between 1 and 60)' });
    }

    const today = new Date();

    // Przygotuj zakresy dat dla każdego miesiąca
    const monthRanges = [];
    for (let i = 0; i < monthsBack; i++) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      monthRanges.push({
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear(),
        startDate: monthStart,
        endDate: monthEnd,
      });
    }

    // Pobierz dostawy dla każdego miesiąca
    const stats = await Promise.all(
      monthRanges.map(async (range) => {
        const deliveries = await prisma.delivery.findMany({
          where: {
            deliveryDate: {
              gte: range.startDate,
              lte: range.endDate,
            },
          },
          include: {
            deliveryOrders: {
              include: {
                order: {
                  include: {
                    requirements: {
                      include: {
                        profile: {
                          select: {
                            id: true,
                            number: true,
                            name: true,
                          },
                        },
                        color: {
                          select: {
                            id: true,
                            code: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Grupuj profile według profilu i koloru
        const profileUsage = new Map<string, {
          profileId: number;
          profileNumber: string;
          profileName: string;
          colorId: number;
          colorCode: string;
          colorName: string;
          totalBeams: number;
          totalMeters: number;
          deliveryCount: number;
        }>();

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
          profiles: Array.from(profileUsage.values()).sort(
            (a, b) => b.totalBeams - a.totalBeams
          ),
        };
      })
    );

    return {
      stats: stats.reverse(), // Od najstarszego do najnowszego
    };
  });
};
