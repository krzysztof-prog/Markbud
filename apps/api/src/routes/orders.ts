import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { createReadStream, existsSync } from 'fs';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderService } from '../services/orderService.js';
import { OrderHandler } from '../handlers/orderHandler.js';
import { parseIntParam } from '../utils/errors.js';
import {
  emitOrderUpdated,
} from '../services/event-emitter.js';

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new OrderRepository(prisma);
  const service = new OrderService(repository);
  const handler = new OrderHandler(service);

  // Routes delegated to handler
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.get('/by-number/:orderNumber', handler.getByNumber.bind(handler));
  fastify.post('/', handler.create.bind(handler));
  fastify.put('/:id', handler.update.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
  fastify.post('/:id/archive', handler.archive.bind(handler));
  fastify.post('/:id/unarchive', handler.unarchive.bind(handler));

  // PATCH /api/orders/:id - partial update (inline - not covered by handler)
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

    emitOrderUpdated(order);

    return order;
  });

  // GET /api/orders/:id/has-pdf - check if PDF exists for order
  fastify.get<{ Params: { id: string } }>('/:id/has-pdf', async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.order.findUnique({
      where: { id: parseIntParam(id, 'id') },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
    }

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

    return reply.send({
      hasPdf: !!pdfImport && existsSync(pdfImport.filepath),
      filename: pdfImport?.filename || null
    });
  });

  // GET /api/orders/:id/pdf - download PDF file for order (inline - specific logic)
  fastify.get<{ Params: { id: string } }>('/:id/pdf', async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.order.findUnique({
      where: { id: parseIntParam(id, 'id') },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Zlecenie nie znalezione' });
    }

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

    if (!existsSync(pdfImport.filepath)) {
      return reply.status(404).send({ error: 'Plik PDF nie został znaleziony na dysku' });
    }

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `inline; filename="${pdfImport.filename}"`);

    const stream = createReadStream(pdfImport.filepath);
    return reply.send(stream);
  });

  // GET /api/orders/table/:colorId - orders table for given color (inline - specific logic)
  fastify.get<{ Params: { colorId: string } }>(
    '/table/:colorId',
    async (request) => {
      const { colorId } = request.params;

      const parsedColorId = parseIntParam(colorId, 'colorId');

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

  // GET /api/orders/requirements/totals - get totals for each profile (inline - specific logic)
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
