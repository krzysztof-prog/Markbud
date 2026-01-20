import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderService } from '../services/orderService.js';
import { OrderHandler } from '../handlers/orderHandler.js';
import { OrderArchiveService } from '../services/orderArchiveService.js';
import { verifyAuth } from '../middleware/auth.js';
import type { BulkUpdateStatusInput, ForProductionQuery, MonthlyProductionQuery } from '../validators/order.js';


export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new OrderRepository(prisma);
  const service = new OrderService(repository);
  const handler = new OrderHandler(service);

  // Routes delegated to handler - all require authentication
  fastify.get<{ Querystring: { status?: string; archived?: string; colorId?: string; documentAuthorUserId?: string; skip?: number; take?: number } }>('/', {
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

  // GET /api/orders/completeness-stats - Statistics for operator dashboard
  // WAŻNE: Musi być PRZED /:id żeby nie było traktowane jako ID
  fastify.get<{ Querystring: { userId: string } }>('/completeness-stats', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get completeness statistics for operator dashboard',
      tags: ['orders'],
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'User ID to filter orders' },
        },
      },
    },
  }, handler.getCompletenessStats.bind(handler));

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

  // PATCH /api/orders/:id - partial update
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
  }, handler.patch.bind(handler));

  // GET /api/orders/:id/has-pdf - check if PDF exists for order
  fastify.get<{ Params: { id: string } }>('/:id/has-pdf', {
    preHandler: verifyAuth,
  }, handler.hasPdf.bind(handler));

  // GET /api/orders/:id/pdf - download PDF file for order
  fastify.get<{ Params: { id: string } }>('/:id/pdf', {
    preHandler: verifyAuth,
  }, handler.downloadPdf.bind(handler));

  // GET /api/orders/table/:colorId - orders table for given color
  fastify.get<{ Params: { colorId: string } }>('/table/:colorId', {
    preHandler: verifyAuth,
  }, handler.getTableByColor.bind(handler));

  // GET /api/orders/requirements/totals - get totals for each profile
  fastify.get('/requirements/totals', {
    preHandler: verifyAuth,
  }, handler.getRequirementsTotals.bind(handler));

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
  }, handler.getReadiness.bind(handler));

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
  }, handler.setVariantType.bind(handler));

  // ==========================================
  // Archive endpoints
  // ==========================================

  const archiveService = new OrderArchiveService(prisma);

  // GET /api/orders/archive/years - Pobierz dostępne lata w archiwum
  fastify.get('/archive/years', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get available years in archive with order counts',
      tags: ['orders', 'archive'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'number' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const stats = await archiveService.getArchiveYearStats();
    return reply.send(stats);
  });

  // GET /api/orders/archive/:year - Pobierz zlecenia z archiwum dla danego roku
  fastify.get<{
    Params: { year: string };
    Querystring: { limit?: string; offset?: string };
  }>('/archive/:year', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get archived orders for a specific year (by completedAt year)',
      tags: ['orders', 'archive'],
      params: {
        type: 'object',
        required: ['year'],
        properties: {
          year: { type: 'string', pattern: '^\\d{4}$', description: 'Year (YYYY format)' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', default: '50' },
          offset: { type: 'string', default: '0' },
        },
      },
    },
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    const limit = parseInt(request.query.limit || '50', 10);
    const offset = parseInt(request.query.offset || '0', 10);

    const result = await archiveService.getArchivedOrdersByYear(year, { limit, offset });
    return reply.send(result);
  });

  // POST /api/orders/archive/trigger - Ręczne uruchomienie archiwizacji (admin)
  fastify.post('/archive/trigger', {
    preHandler: verifyAuth,
    schema: {
      description: 'Manually trigger archive process (archives orders completed 60+ days ago)',
      tags: ['orders', 'archive'],
    },
  }, async (_request, reply) => {
    const result = await archiveService.archiveOldCompletedOrders();
    return reply.send(result);
  });
};
