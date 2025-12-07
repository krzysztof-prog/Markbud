import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { orderTotalsService } from '../services/orderTotalsService.js';
import {
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderDeleted,
} from '../services/event-emitter.js';
import { parseIntParam } from '../utils/errors.js';

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/orders - lista zleceń
  fastify.get<{
    Querystring: {
      status?: string;
      archived?: string;
      colorId?: string;
    };
  }>('/', async (request) => {
    const { status, archived, colorId } = request.query;

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (archived === 'true') {
      where.archivedAt = { not: null };
    } else if (archived === 'false') {
      where.archivedAt = null;
    }

    // Jeśli podano colorId, filtruj zlecenia które mają zapotrzebowanie na ten kolor
    if (colorId) {
      where.requirements = {
        some: {
          colorId: parseIntParam(colorId, 'colorId'),
        },
      };
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        client: true,
        project: true,
        system: true,
        deadline: true,
        pvcDeliveryDate: true,
        glassDeliveryDate: true,
        valuePln: true,
        valueEur: true,
        invoiceNumber: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
        createdAt: true,
        archivedAt: true,
        windows: {
          select: {
            id: true,
            profileType: true,
            reference: true,
            quantity: true,
          },
        },
        _count: {
          select: { windows: true, requirements: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Pobierz totals dla wszystkich zleceń jednym zapytaniem
    const orderIds = orders.map(o => o.id);
    const totalsMap = new Map();

    if (orderIds.length > 0) {
      const allTotals = await prisma.orderRequirement.groupBy({
        by: ['orderId'],
        where: { orderId: { in: orderIds } },
        _count: true,
        _sum: { meters: true, beamsCount: true },
      });

      for (const total of allTotals) {
        totalsMap.set(total.orderId, {
          totalRequirements: total._count,
          totalMeters: total._sum.meters || 0,
          totalBeams: total._sum.beamsCount || 0,
        });
      }
    }

    // Mapuj totals do każdego zlecenia
    const ordersWithTotals = orders.map((order) => ({
      ...order,
      ...totalsMap.get(order.id) || { totalRequirements: 0, totalMeters: 0, totalBeams: 0 },
    }));

    return ordersWithTotals;
  });

  // GET /api/orders/:id - szczegóły zlecenia
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.order.findUnique({
      where: { id: parseIntParam(id, 'id') },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        client: true,
        project: true,
        system: true,
        deadline: true,
        pvcDeliveryDate: true,
        valuePln: true,
        valueEur: true,
        invoiceNumber: true,
        deliveryDate: true,
        productionDate: true,
        glassDeliveryDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        requirements: {
          select: {
            id: true,
            profileId: true,
            colorId: true,
            beamsCount: true,
            meters: true,
            restMm: true,
            profile: {
              select: { id: true, number: true, name: true, description: true },
            },
            color: {
              select: { id: true, code: true, name: true, hexColor: true },
            },
          },
        },
        windows: {
          select: {
            id: true,
            widthMm: true,
            heightMm: true,
            profileType: true,
            quantity: true,
            reference: true,
          },
        },
        deliveryOrders: {
          select: {
            id: true,
            deliveryId: true,
            delivery: {
              select: { id: true, deliveryDate: true, deliveryNumber: true, status: true },
            },
          },
        },
        orderNotes: {
          select: { id: true, content: true, createdAt: true },
        },
      },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
    }

    // Dodaj obliczone totals
    const totals = await orderTotalsService.getOrderTotals(order.id);

    return {
      ...order,
      ...totals,
    };
  });

  // GET /api/orders/by-number/:orderNumber - znajdź po numerze
  fastify.get<{ Params: { orderNumber: string } }>(
    '/by-number/:orderNumber',
    async (request, reply) => {
      const { orderNumber } = request.params;

      const order = await prisma.order.findUnique({
        where: { orderNumber },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          client: true,
          project: true,
          system: true,
          deadline: true,
          pvcDeliveryDate: true,
          valuePln: true,
          valueEur: true,
          invoiceNumber: true,
          deliveryDate: true,
          productionDate: true,
          glassDeliveryDate: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          archivedAt: true,
          requirements: {
            select: {
              id: true,
              profileId: true,
              colorId: true,
              beamsCount: true,
              meters: true,
              restMm: true,
              profile: {
                select: { id: true, number: true, name: true },
              },
              color: {
                select: { id: true, code: true, name: true, hexColor: true },
              },
            },
          },
          windows: {
            select: {
              id: true,
              widthMm: true,
              heightMm: true,
              profileType: true,
              quantity: true,
              reference: true,
            },
          },
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
      }

      // Dodaj obliczone totals
      const totals = await orderTotalsService.getOrderTotals(order.id);

      return {
        ...order,
        ...totals,
      };
    }
  );

  // POST /api/orders - utwórz zlecenie
  fastify.post<{
    Body: {
      orderNumber: string;
      client?: string;
      project?: string;
      system?: string;
      deadline?: string;
      pvcDeliveryDate?: string;
      valuePln?: number;
      valueEur?: number;
      invoiceNumber?: string;
      deliveryDate?: string;
      glassDeliveryDate?: string;
      notes?: string;
    };
  }>('/', async (request, reply) => {
    const {
      orderNumber,
      client,
      project,
      system,
      deadline,
      pvcDeliveryDate,
      valuePln,
      valueEur,
      invoiceNumber,
      deliveryDate,
      glassDeliveryDate,
      notes,
    } = request.body;

    const existing = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Zlecenie o tym numerze już istnieje' });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        client,
        project,
        system,
        deadline: deadline ? new Date(deadline) : undefined,
        pvcDeliveryDate: pvcDeliveryDate ? new Date(pvcDeliveryDate) : undefined,
        valuePln,
        valueEur,
        invoiceNumber,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        glassDeliveryDate: glassDeliveryDate ? new Date(glassDeliveryDate) : undefined,
        notes,
      },
    });

    // Emit event
    emitOrderCreated(order);

    return reply.status(201).send(order);
  });

  // PATCH /api/orders/:id - częściowa aktualizacja zlecenia (edytowalne pola)
  fastify.patch<{
    Params: { id: string };
    Body: {
      valuePln?: string | null;
      valueEur?: string | null;
      deadline?: string | null;
      status?: string | null;
    };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { valuePln, valueEur, deadline, status } = request.body;

    // Przygotuj dane do aktualizacji - tylko pola które zostały przesłane
    const updateData: Prisma.OrderUpdateInput = {};

    if (valuePln !== undefined) {
      updateData.valuePln = valuePln !== null ? parseFloat(valuePln) : null;
    }
    if (valueEur !== undefined) {
      updateData.valueEur = valueEur !== null ? parseFloat(valueEur) : null;
    }
    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null;
    }
    if (status !== undefined) {
      updateData.status = status ?? undefined;
    }

    const order = await prisma.order.update({
      where: { id: parseIntParam(id, 'id') },
      data: updateData,
    });

    // Emit event
    emitOrderUpdated(order);

    return order;
  });

  // PUT /api/orders/:id - aktualizuj zlecenie
  fastify.put<{
    Params: { id: string };
    Body: {
      status?: string;
      client?: string;
      project?: string;
      system?: string;
      deadline?: string;
      pvcDeliveryDate?: string;
      valuePln?: number;
      valueEur?: number;
      invoiceNumber?: string;
      deliveryDate?: string;
      glassDeliveryDate?: string;
      notes?: string;
    };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const {
      status,
      client,
      project,
      system,
      deadline,
      pvcDeliveryDate,
      valuePln,
      valueEur,
      invoiceNumber,
      deliveryDate,
      glassDeliveryDate,
      notes,
    } = request.body;

    const order = await prisma.order.update({
      where: { id: parseIntParam(id, 'id') },
      data: {
        status,
        client,
        project,
        system,
        deadline: deadline ? new Date(deadline) : undefined,
        pvcDeliveryDate: pvcDeliveryDate ? new Date(pvcDeliveryDate) : undefined,
        valuePln,
        valueEur,
        invoiceNumber,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        glassDeliveryDate: glassDeliveryDate ? new Date(glassDeliveryDate) : undefined,
        notes,
      },
    });

    // Emit event
    emitOrderUpdated(order);

    // Dodaj obliczone totals
    const totals = await orderTotalsService.getOrderTotals(order.id);

    return {
      ...order,
      ...totals,
    };
  });

  // POST /api/orders/:id/archive - archiwizuj zlecenie
  fastify.post<{ Params: { id: string } }>('/:id/archive', async (request) => {
    const { id } = request.params;

    const order = await prisma.order.update({
      where: { id: parseIntParam(id, 'id') },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    // Emit event
    emitOrderUpdated(order);

    return order;
  });

  // POST /api/orders/:id/unarchive - przywróć z archiwum
  fastify.post<{ Params: { id: string } }>('/:id/unarchive', async (request) => {
    const { id } = request.params;

    const order = await prisma.order.update({
      where: { id: parseIntParam(id, 'id') },
      data: {
        status: 'completed',
        archivedAt: null,
      },
    });

    // Emit event
    emitOrderUpdated(order);

    return order;
  });

  // GET /api/orders/:id/pdf - pobierz plik PDF z ceną dla zlecenia
  fastify.get<{ Params: { id: string } }>('/:id/pdf', async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.order.findUnique({
      where: { id: parseIntParam(id, 'id') },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
    }

    // Znajdź zaimportowany plik PDF dla tego zlecenia
    const pdfImport = await prisma.fileImport.findFirst({
      where: {
        fileType: 'ceny_pdf',
        status: 'completed',
        metadata: {
          contains: JSON.stringify({ orderId: order.id }),
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    if (!pdfImport) {
      return reply.status(404).send({ error: 'Nie znaleziono pliku PDF dla tego zlecenia' });
    }

    // Sprawdź czy plik istnieje
    if (!existsSync(pdfImport.filepath)) {
      return reply.status(404).send({ error: 'Plik PDF nie został znaleziony na dysku' });
    }

    // Ustaw nagłówki dla PDF
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `inline; filename="${pdfImport.filename}"`);

    // Wyślij plik jako stream
    const stream = createReadStream(pdfImport.filepath);
    return reply.send(stream);
  });

  // DELETE /api/orders/:id - usuń zlecenie
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.order.delete({
      where: { id: parseIntParam(id, 'id') },
    });

    // Emit event
    emitOrderDeleted(parseIntParam(id, 'id'));

    return reply.status(204).send();
  });

  // GET /api/orders/table/:colorId - tabela zleceń dla danego koloru
  fastify.get<{ Params: { colorId: string } }>(
    '/table/:colorId',
    async (request) => {
      const { colorId } = request.params;

      const parsedColorId = parseIntParam(colorId, 'colorId');

      // Pobierz profile widoczne dla tego koloru
      const visibleProfiles = await prisma.profileColor.findMany({
        where: {
          colorId: parsedColorId,
          isVisible: true,
        },
        select: {
          profileId: true,
          colorId: true,
          isVisible: true,
          profile: {
            select: {
              id: true,
              number: true,
              name: true,
            },
          },
        },
        orderBy: { profile: { number: 'asc' } },
      });

      // Pobierz zlecenia z zapotrzebowaniem na ten kolor (nie zarchiwizowane)
      const orders = await prisma.order.findMany({
        where: {
          archivedAt: null,
          requirements: {
            some: {
              colorId: parsedColorId,
            },
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          requirements: {
            where: {
              colorId: parsedColorId,
            },
            select: {
              id: true,
              profileId: true,
              colorId: true,
              beamsCount: true,
              meters: true,
              profile: {
                select: {
                  id: true,
                  number: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { orderNumber: 'asc' },
      });

      // Przekształć na format tabeli
      const tableData = orders.map((order) => {
        const requirements: Record<string, { beams: number; meters: number }> = {};

        for (const req of order.requirements) {
          requirements[req.profile.number] = {
            beams: req.beamsCount,
            meters: parseFloat(req.meters.toString()),
          };
        }

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          requirements,
        };
      });

      // Oblicz sumy dla każdego profilu
      const totals: Record<string, { beams: number; meters: number }> = {};
      for (const profile of visibleProfiles) {
        totals[profile.profile.number] = { beams: 0, meters: 0 };
      }

      for (const row of tableData) {
        for (const [profileNumber, data] of Object.entries(row.requirements)) {
          if (totals[profileNumber]) {
            totals[profileNumber].beams += data.beams;
            totals[profileNumber].meters += data.meters;
          }
        }
      }

      return {
        profiles: visibleProfiles.map((pc) => pc.profile),
        orders: tableData,
        totals,
      };
    }
  );

  // GET /api/orders/requirements/totals - pobierz sumy zapotrzebowań dla każdego profilu
  fastify.get('/requirements/totals', async () => {
    const requirements = await prisma.orderRequirement.findMany({
      select: {
        profileId: true,
        colorId: true,
        beamsCount: true,
        meters: true,
        profile: {
          select: { id: true, number: true, articleNumber: true },
        },
        color: {
          select: { id: true, code: true },
        },
      },
    });

    // Pogrupuj po profileId i zsumuj ilości bel
    const totals: Record<string, { profileId: number; profileNumber: string; profileArticleNumber: string | null; colorId: number; colorCode: string; totalBeams: number; totalMeters: number }> = {};

    for (const req of requirements) {
      const key = `${req.profileId}-${req.colorId}`;
      if (!totals[key]) {
        totals[key] = {
          profileId: req.profileId,
          profileNumber: req.profile.number,
          profileArticleNumber: req.profile.articleNumber,
          colorId: req.colorId,
          colorCode: req.color.code,
          totalBeams: 0,
          totalMeters: 0,
        };
      }
      totals[key].totalBeams += req.beamsCount;
      totals[key].totalMeters += req.meters;
    }

    return Object.values(totals);
  });
};
