import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';

export const warehouseOrderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/warehouse-orders - pobierz wszystkie zamówienia (z filtrowaniem)
  fastify.get<{
    Querystring: {
      colorId?: string;
      profileId?: string;
      status?: string;
    };
  }>('/', async (request) => {
    const { colorId, profileId, status } = request.query;

    const where: any = {};
    if (colorId) where.colorId = Number(colorId);
    if (profileId) where.profileId = Number(profileId);
    if (status) where.status = status;

    const orders = await prisma.warehouseOrder.findMany({
      where,
      include: {
        profile: true,
        color: true,
      },
      orderBy: {
        expectedDeliveryDate: 'asc',
      },
    });

    return orders;
  });

  // GET /api/warehouse-orders/:id - pobierz jedno zamówienie
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.warehouseOrder.findUnique({
      where: { id: Number(id) },
      include: {
        profile: true,
        color: true,
      },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zamówienie nie znalezione' });
    }

    return order;
  });

  // POST /api/warehouse-orders - utwórz nowe zamówienie
  fastify.post<{
    Body: {
      profileId: number;
      colorId: number;
      orderedBeams: number;
      expectedDeliveryDate: string;
      notes?: string;
    };
  }>('/', async (request, reply) => {
    const { profileId, colorId, orderedBeams, expectedDeliveryDate, notes } = request.body;

    if (!profileId || !colorId || !orderedBeams || !expectedDeliveryDate) {
      return reply.status(400).send({
        error: 'Wymagane pola: profileId, colorId, orderedBeams, expectedDeliveryDate',
      });
    }

    const order = await prisma.warehouseOrder.create({
      data: {
        profileId: Number(profileId),
        colorId: Number(colorId),
        orderedBeams: Number(orderedBeams),
        expectedDeliveryDate: new Date(expectedDeliveryDate),
        notes: notes || null,
        status: 'pending',
      },
      include: {
        profile: true,
        color: true,
      },
    });

    return reply.status(201).send(order);
  });

  // PUT /api/warehouse-orders/:id - aktualizuj zamówienie
  fastify.put<{
    Params: { id: string };
    Body: {
      orderedBeams?: number;
      expectedDeliveryDate?: string;
      status?: string;
      notes?: string;
    };
  }>('/:id', async (request) => {
    const { id } = request.params;
    const { orderedBeams, expectedDeliveryDate, status, notes } = request.body;

    // Pobierz istniejące zamówienie
    const existingOrder = await prisma.warehouseOrder.findUnique({
      where: { id: Number(id) },
    });

    if (!existingOrder) {
      throw new Error('Zamówienie nie znalezione');
    }

    const data: any = {};
    if (orderedBeams !== undefined) data.orderedBeams = Number(orderedBeams);
    if (expectedDeliveryDate !== undefined)
      data.expectedDeliveryDate = new Date(expectedDeliveryDate);
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;

    // Jeśli status zmienia się na 'received', zaktualizuj stan magazynu
    if (status === 'received' && existingOrder.status !== 'received') {
      // Znajdź lub utwórz rekord stanu magazynowego
      const warehouseStock = await prisma.warehouseStock.findUnique({
        where: {
          profileId_colorId: {
            profileId: existingOrder.profileId,
            colorId: existingOrder.colorId,
          },
        },
      });

      if (warehouseStock) {
        // Dodaj otrzymane bele do stanu magazynowego
        await prisma.warehouseStock.update({
          where: { id: warehouseStock.id },
          data: {
            currentStockBeams: warehouseStock.currentStockBeams + existingOrder.orderedBeams,
          },
        });
      } else {
        // Utwórz nowy rekord stanu magazynowego
        await prisma.warehouseStock.create({
          data: {
            profileId: existingOrder.profileId,
            colorId: existingOrder.colorId,
            currentStockBeams: existingOrder.orderedBeams,
          },
        });
      }
    }

    const order = await prisma.warehouseOrder.update({
      where: { id: Number(id) },
      data,
      include: {
        profile: true,
        color: true,
      },
    });

    return order;
  });

  // DELETE /api/warehouse-orders/:id - usuń zamówienie
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.warehouseOrder.delete({
      where: { id: Number(id) },
    });

    return reply.status(204).send();
  });
};
