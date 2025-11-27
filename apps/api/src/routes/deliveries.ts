import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';

export const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/deliveries - lista dostaw
  fastify.get<{
    Querystring: {
      from?: string;
      to?: string;
      status?: string;
    };
  }>('/', async (request) => {
    const { from, to, status } = request.query;

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
      include: {
        deliveryOrders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                valueEur: true,
                requirements: true,
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

    return deliveries;
  });

  // GET /api/deliveries/calendar - dane do kalendarza
  fastify.get<{
    Querystring: {
      month: string;
      year: string;
    };
  }>('/calendar', async (request) => {
    const { month, year } = request.query;

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const deliveries = await prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        deliveryOrders: {
          include: {
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
    const { id } = request.params;

    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(id) },
      include: {
        deliveryOrders: {
          include: {
            order: {
              include: {
                windows: true,
                requirements: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        deliveryItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!delivery) {
      return reply.status(404).send({ error: 'Dostawa nie znaleziona' });
    }

    return delivery;
  });

  // POST /api/deliveries - utwórz dostawę
  fastify.post<{
    Body: {
      deliveryDate: string;
      deliveryNumber?: string;
      notes?: string;
    };
  }>('/', async (request, reply) => {
    const { deliveryDate, deliveryNumber, notes } = request.body;

    const delivery = await prisma.delivery.create({
      data: {
        deliveryDate: new Date(deliveryDate),
        deliveryNumber,
        notes,
      },
    });

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
  }>('/:id', async (request) => {
    const { id } = request.params;
    const { deliveryDate, status, notes } = request.body;

    const delivery = await prisma.delivery.update({
      where: { id: parseInt(id) },
      data: {
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        status,
        notes,
      },
    });

    return delivery;
  });

  // DELETE /api/deliveries/:id - usuń dostawę
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.delivery.delete({
      where: { id: parseInt(id) },
    });

    return reply.status(204).send();
  });

  // POST /api/deliveries/:id/orders - dodaj zlecenie do dostawy
  fastify.post<{
    Params: { id: string };
    Body: { orderId: number };
  }>('/:id/orders', async (request, reply) => {
    const { id } = request.params;
    const { orderId } = request.body;

    // Pobierz aktualną maksymalną pozycję
    const maxPosition = await prisma.deliveryOrder.aggregate({
      where: { deliveryId: parseInt(id) },
      _max: { position: true },
    });

    const newPosition = (maxPosition._max.position || 0) + 1;

    const deliveryOrder = await prisma.deliveryOrder.create({
      data: {
        deliveryId: parseInt(id),
        orderId,
        position: newPosition,
      },
      include: {
        order: true,
      },
    });

    return reply.status(201).send(deliveryOrder);
  });

  // DELETE /api/deliveries/:id/orders/:orderId - usuń zlecenie z dostawy
  fastify.delete<{
    Params: { id: string; orderId: string };
  }>('/:id/orders/:orderId', async (request, reply) => {
    const { id, orderId } = request.params;

    await prisma.deliveryOrder.delete({
      where: {
        deliveryId_orderId: {
          deliveryId: parseInt(id),
          orderId: parseInt(orderId),
        },
      },
    });

    return reply.status(204).send();
  });

  // PUT /api/deliveries/:id/orders/reorder - zmień kolejność zleceń
  fastify.put<{
    Params: { id: string };
    Body: { orderIds: number[] };
  }>('/:id/orders/reorder', async (request) => {
    const { id } = request.params;
    const { orderIds } = request.body;

    // Zaktualizuj pozycje
    const updates = orderIds.map((orderId, index) =>
      prisma.deliveryOrder.update({
        where: {
          deliveryId_orderId: {
            deliveryId: parseInt(id),
            orderId,
          },
        },
        data: { position: index + 1 },
      })
    );

    await prisma.$transaction(updates);

    return { success: true };
  });

  // POST /api/deliveries/:id/move-order - przenieś zlecenie między dostawami
  fastify.post<{
    Params: { id: string };
    Body: {
      orderId: number;
      targetDeliveryId: number;
    };
  }>('/:id/move-order', async (request) => {
    const { id } = request.params;
    const { orderId, targetDeliveryId } = request.body;

    // Usuń z obecnej dostawy
    await prisma.deliveryOrder.delete({
      where: {
        deliveryId_orderId: {
          deliveryId: parseInt(id),
          orderId,
        },
      },
    });

    // Pobierz maksymalną pozycję w docelowej dostawie
    const maxPosition = await prisma.deliveryOrder.aggregate({
      where: { deliveryId: targetDeliveryId },
      _max: { position: true },
    });

    // Dodaj do docelowej dostawy
    const deliveryOrder = await prisma.deliveryOrder.create({
      data: {
        deliveryId: targetDeliveryId,
        orderId,
        position: (maxPosition._max.position || 0) + 1,
      },
    });

    return deliveryOrder;
  });

  // GET /api/deliveries/:id/protocol - wygeneruj protokół odbioru
  fastify.get<{ Params: { id: string } }>('/:id/protocol', async (request, reply) => {
    const { id } = request.params;

    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(id) },
      include: {
        deliveryOrders: {
          include: {
            order: {
              include: {
                windows: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!delivery) {
      return reply.status(404).send({ error: 'Dostawa nie znaleziona' });
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

    const protocol = {
      deliveryId: delivery.id,
      deliveryDate: delivery.deliveryDate,
      orders,
      totalWindows,
      totalPallets: delivery.totalPallets || 0,
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
    const { id } = request.params;
    const { itemType, description, quantity } = request.body;

    const item = await prisma.deliveryItem.create({
      data: {
        deliveryId: parseInt(id),
        itemType,
        description,
        quantity,
      },
    });

    return reply.status(201).send(item);
  });

  // DELETE /api/deliveries/:id/items/:itemId - usuń dodatkowy artykuł
  fastify.delete<{
    Params: { id: string; itemId: string };
  }>('/:id/items/:itemId', async (request, reply) => {
    const { itemId } = request.params;

    await prisma.deliveryItem.delete({
      where: { id: parseInt(itemId) },
    });

    return reply.status(204).send();
  });

  // POST /api/deliveries/:id/complete - oznacz zlecenia jako zakończone
  fastify.post<{
    Params: { id: string };
    Body: {
      productionDate: string;
    };
  }>('/:id/complete', async (request, reply) => {
    const { id } = request.params;
    const { productionDate } = request.body;

    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(id) },
      include: {
        deliveryOrders: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!delivery) {
      return reply.status(404).send({ error: 'Dostawa nie znaleziona' });
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

    return { success: true, updatedOrders: orderIds.length };
  });
};
