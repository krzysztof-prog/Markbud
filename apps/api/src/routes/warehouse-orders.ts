import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index.js';


export const warehouseOrderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/warehouse-orders - pobierz wszystkie zamówienia (z filtrowaniem)
  fastify.get<{
    Querystring: {
      colorId?: string;
      profileId?: string;
      status?: string;
    };
  }>('/', async (request, reply) => {
    const { colorId, profileId, status } = request.query;

    const where: Prisma.WarehouseOrderWhereInput = {};
    if (colorId) {
      const parsedColorId = Number(colorId);
      if (isNaN(parsedColorId)) {
        return reply.status(400).send({ error: 'Invalid colorId parameter' });
      }
      where.colorId = parsedColorId;
    }
    if (profileId) {
      const parsedProfileId = Number(profileId);
      if (isNaN(parsedProfileId)) {
        return reply.status(400).send({ error: 'Invalid profileId parameter' });
      }
      where.profileId = parsedProfileId;
    }
    if (status) where.status = status;

    const orders = await prisma.warehouseOrder.findMany({
      where,
      select: {
        id: true,
        profileId: true,
        colorId: true,
        orderedBeams: true,
        expectedDeliveryDate: true,
        status: true,
        notes: true,
        createdAt: true,
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
            type: true,
          },
        },
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
      select: {
        id: true,
        profileId: true,
        colorId: true,
        orderedBeams: true,
        expectedDeliveryDate: true,
        status: true,
        notes: true,
        createdAt: true,
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
            type: true,
          },
        },
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

    const parsedProfileId = Number(profileId);
    const parsedColorId = Number(colorId);
    const parsedOrderedBeams = Number(orderedBeams);

    if (isNaN(parsedProfileId) || isNaN(parsedColorId) || isNaN(parsedOrderedBeams)) {
      return reply.status(400).send({ error: 'Invalid numeric values in request body' });
    }

    if (parsedOrderedBeams <= 0) {
      return reply.status(400).send({ error: 'orderedBeams must be greater than 0' });
    }

    const order = await prisma.warehouseOrder.create({
      data: {
        profileId: parsedProfileId,
        colorId: parsedColorId,
        orderedBeams: parsedOrderedBeams,
        expectedDeliveryDate: new Date(expectedDeliveryDate),
        notes: notes || null,
        status: 'pending',
      },
      select: {
        id: true,
        profileId: true,
        colorId: true,
        orderedBeams: true,
        expectedDeliveryDate: true,
        status: true,
        notes: true,
        createdAt: true,
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
            type: true,
          },
        },
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

    // Wykonaj aktualizację w transakcji
    const order = await prisma.$transaction(async (tx) => {
      const data: Prisma.WarehouseOrderUpdateInput = {};
      if (orderedBeams !== undefined) data.orderedBeams = Number(orderedBeams);
      if (expectedDeliveryDate !== undefined)
        data.expectedDeliveryDate = new Date(expectedDeliveryDate);
      if (status !== undefined) data.status = status;
      if (notes !== undefined) data.notes = notes;

      // Sprawdź czy trzeba zaktualizować magazyn
      const statusChanged = status !== undefined && status !== existingOrder.status;
      const beamsChanged = orderedBeams !== undefined && orderedBeams !== existingOrder.orderedBeams;
      const isCurrentlyReceived = existingOrder.status === 'received';
      const willBeReceived = status === 'received' || (status === undefined && isCurrentlyReceived);

      // Obsługa zmian wpływających na magazyn
      if ((statusChanged || beamsChanged) && (isCurrentlyReceived || willBeReceived)) {
        const warehouseStock = await tx.warehouseStock.findUnique({
          where: {
            profileId_colorId: {
              profileId: existingOrder.profileId,
              colorId: existingOrder.colorId,
            },
          },
        });

        const wasPreviouslyReceived = existingOrder.status === 'received';
        const isNowReceived = status === 'received' || (status === undefined && isCurrentlyReceived);

        // Oblicz różnicę w belach
        let stockDelta = 0;

        // Przypadek 1: Zmiana statusu z 'received' na inny - ODEJMIJ stare bele
        if (wasPreviouslyReceived && !isNowReceived) {
          stockDelta -= existingOrder.orderedBeams;
        }
        // Przypadek 2: Zmiana statusu na 'received' - DODAJ nowe bele
        else if (!wasPreviouslyReceived && isNowReceived) {
          const newBeamsCount = orderedBeams !== undefined ? Number(orderedBeams) : existingOrder.orderedBeams;
          stockDelta += newBeamsCount;
        }
        // Przypadek 3: Status pozostaje 'received', ale zmienia się liczba bel
        else if (wasPreviouslyReceived && isNowReceived && beamsChanged) {
          stockDelta -= existingOrder.orderedBeams; // Odejmij stare
          stockDelta += Number(orderedBeams); // Dodaj nowe
        }

        // Zaktualizuj magazyn jeśli jest różnica
        if (stockDelta !== 0) {
          if (warehouseStock) {
            await tx.warehouseStock.update({
              where: { id: warehouseStock.id },
              data: {
                currentStockBeams: warehouseStock.currentStockBeams + stockDelta,
              },
            });
          } else if (stockDelta > 0) {
            // Utwórz nowy rekord tylko jeśli dodajemy bele
            await tx.warehouseStock.create({
              data: {
                profileId: existingOrder.profileId,
                colorId: existingOrder.colorId,
                currentStockBeams: stockDelta,
              },
            });
          }
        }
      }

      // Zaktualizuj zamówienie
      const updatedOrder = await tx.warehouseOrder.update({
        where: { id: Number(id) },
        data,
        select: {
          id: true,
          profileId: true,
          colorId: true,
          orderedBeams: true,
          expectedDeliveryDate: true,
          status: true,
          notes: true,
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
              type: true,
            },
          },
        },
      });

      return updatedOrder;
    });

    return order;
  });

  // DELETE /api/warehouse-orders/:id - usuń zamówienie
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    // Pobierz zamówienie przed usunięciem
    const existingOrder = await prisma.warehouseOrder.findUnique({
      where: { id: Number(id) },
    });

    if (!existingOrder) {
      return reply.status(404).send({ error: 'Zamówienie nie znalezione' });
    }

    // Wykonaj usunięcie w transakcji
    await prisma.$transaction(async (tx) => {
      // Jeśli zamówienie było odebrane, odejmij bele z magazynu
      if (existingOrder.status === 'received') {
        const warehouseStock = await tx.warehouseStock.findUnique({
          where: {
            profileId_colorId: {
              profileId: existingOrder.profileId,
              colorId: existingOrder.colorId,
            },
          },
        });

        if (warehouseStock) {
          await tx.warehouseStock.update({
            where: { id: warehouseStock.id },
            data: {
              currentStockBeams: warehouseStock.currentStockBeams - existingOrder.orderedBeams,
            },
          });
        }
      }

      // Usuń zamówienie
      await tx.warehouseOrder.delete({
        where: { id: Number(id) },
      });
    });

    return reply.status(204).send();
  });
};
