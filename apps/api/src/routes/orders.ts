import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { createReadStream, existsSync } from 'fs';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderService } from '../services/orderService.js';
import { OrderHandler } from '../handlers/orderHandler.js';
import { parseIntParam } from '../utils/errors.js';
import { verifyAuth } from '../middleware/auth.js';
import type { BulkUpdateStatusInput, ForProductionQuery, MonthlyProductionQuery } from '../validators/order.js';
import {
  emitOrderUpdated,
} from '../services/event-emitter.js';
import { plnToGrosze, eurToCenty } from '../utils/money.js';
import { ReadinessOrchestrator } from '../services/readinessOrchestrator.js';


export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new OrderRepository(prisma);
  const service = new OrderService(repository);
  const handler = new OrderHandler(service);

  // Routes delegated to handler - all require authentication
  fastify.get<{ Querystring: { status?: string; archived?: string; colorId?: string; skip?: number; take?: number } }>('/', {
    preHandler: verifyAuth,
  }, handler.getAll.bind(handler));

  // GET /api/orders/search - Zoptymalizowane wyszukiwanie dla GlobalSearch
  // WAŻNE: Musi być PRZED /:id żeby nie było traktowane jako ID
  fastify.get<{ Querystring: { q: string; includeArchived?: string } }>('/search', {
    preHandler: verifyAuth,
    schema: {
      description: 'Search orders - optimized for GlobalSearch',
      tags: ['orders'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 2, description: 'Search query (min 2 chars)' },
          includeArchived: { type: 'string', enum: ['true', 'false'], default: 'true' },
        },
      },
    },
  }, handler.search.bind(handler));

  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, handler.getById.bind(handler));

  fastify.get<{ Params: { orderNumber: string } }>('/by-number/:orderNumber', {
    preHandler: verifyAuth,
  }, handler.getByNumber.bind(handler));

  fastify.post<{ Body: { orderNumber: string; status?: string; valuePln?: number; valueEur?: number; deliveryDate?: string; customerId?: number } }>('/', {
    preHandler: verifyAuth,
  }, handler.create.bind(handler));

  fastify.put<{ Params: { id: string }; Body: { status?: string; valuePln?: number; valueEur?: number; deliveryDate?: string; notes?: string } }>('/:id', {
    preHandler: verifyAuth,
  }, handler.update.bind(handler));

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, handler.delete.bind(handler));

  fastify.post<{ Params: { id: string } }>('/:id/archive', {
    preHandler: verifyAuth,
  }, handler.archive.bind(handler));

  fastify.post<{ Params: { id: string } }>('/:id/unarchive', {
    preHandler: verifyAuth,
  }, handler.unarchive.bind(handler));

  fastify.post<{ Body: BulkUpdateStatusInput }>('/bulk-update-status', {
    preHandler: verifyAuth,
  }, handler.bulkUpdateStatus.bind(handler));

  fastify.get<{ Querystring: ForProductionQuery }>('/for-production', {
    preHandler: verifyAuth,
  }, handler.getForProduction.bind(handler));

  // GET /api/orders/monthly-production - Get orders completed in a specific month
  fastify.get<{ Querystring: MonthlyProductionQuery }>('/monthly-production', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get orders completed in a specific month/year for production reports',
      tags: ['orders'],
      querystring: {
        type: 'object',
        required: ['year', 'month'],
        properties: {
          year: { type: 'string', pattern: '^\\d{4}$', description: 'Year (YYYY format)' },
          month: { type: 'string', pattern: '^(0?[1-9]|1[0-2])$', description: 'Month (1-12)' },
        },
      },
    },
  }, handler.getMonthlyProduction.bind(handler));

  // PATCH /api/orders/:id - partial update (inline - not covered by handler)
  fastify.patch<{
    Params: { id: string };
    Body: {
      valuePln?: string | null;
      valueEur?: string | null;
      deadline?: string | null;
      status?: string | null;
    };
  }>('/:id', {
    preHandler: verifyAuth,
  }, async (request) => {
    const { id } = request.params;
    const { valuePln, valueEur, deadline, status } = request.body;

    const updateData: Prisma.OrderUpdateInput = {};

    if (valuePln !== undefined) {
      // Convert PLN string (e.g., "123.45") to grosze (12345)
      updateData.valuePln = valuePln !== null ? plnToGrosze(Number(valuePln)) : null;
    }
    if (valueEur !== undefined) {
      // Convert EUR string (e.g., "123.45") to cents (12345)
      updateData.valueEur = valueEur !== null ? eurToCenty(Number(valueEur)) : null;
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
  fastify.get<{ Params: { id: string } }>('/:id/has-pdf', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
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
          contains: `"orderId":${order.id}`,
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
  fastify.get<{ Params: { id: string } }>('/:id/pdf', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
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
          contains: `"orderId":${order.id}`,
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
    {
      preHandler: verifyAuth,
    },
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
  fastify.get('/requirements/totals', {
    preHandler: verifyAuth,
  }, async () => {
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

  // P1-R4: GET /api/orders/:id/readiness - get production readiness checklist (System Brain)
  fastify.get<{ Params: { id: string } }>('/:id/readiness', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get production readiness checklist for an order (System Brain)',
      tags: ['orders', 'readiness'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Order ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean', description: 'Whether order is ready for production' },
            blocking: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  requirement: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                  actionRequired: { type: 'string' },
                },
              },
            },
            warnings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  requirement: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                  actionRequired: { type: 'string' },
                },
              },
            },
            checklist: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  checked: { type: 'boolean' },
                  blocking: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const orchestrator = new ReadinessOrchestrator(prisma);
    const result = await orchestrator.canStartProduction(parseIntParam(id, 'id'));
    return reply.send(result);
  });

  // P1-2: PATCH /api/orders/:id/variant-type - set variant type for order
  fastify.patch<{
    Params: { id: string };
    Body: { variantType: 'correction' | 'additional_file' };
  }>('/:id/variant-type', {
    preHandler: verifyAuth,
    schema: {
      description: 'Set variant type for an order (correction or additional_file)',
      tags: ['orders'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Order ID' },
        },
      },
      body: {
        type: 'object',
        required: ['variantType'],
        properties: {
          variantType: {
            type: 'string',
            enum: ['correction', 'additional_file'],
            description: 'correction = must be in same delivery, additional_file = can be in different delivery',
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { variantType } = request.body;

    const order = await prisma.order.update({
      where: { id: parseIntParam(id, 'id') },
      data: { variantType },
    });

    emitOrderUpdated(order);

    return reply.send({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        variantType: order.variantType,
      },
    });
  });
};
