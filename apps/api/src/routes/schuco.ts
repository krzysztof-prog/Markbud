import { FastifyInstance } from 'fastify';
import { SchucoHandler } from '../handlers/schucoHandler.js';
import { SchucoService } from '../services/schuco/schucoService.js';
import { verifyAuth } from '../middleware/auth.js';


export default async function schucoRoutes(fastify: FastifyInstance) {
  const schucoService = new SchucoService(fastify.prisma);
  const schucoHandler = new SchucoHandler(schucoService);

  // GET /api/schuco/deliveries - Get deliveries with pagination
  fastify.get('/deliveries', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get Schuco deliveries with pagination',
      tags: ['schuco'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1 },
          pageSize: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  orderDate: { type: 'string' },
                  orderNumber: { type: 'string' },
                  projectNumber: { type: 'string' },
                  orderName: { type: 'string' },
                  shippingStatus: { type: 'string' },
                  deliveryWeek: { type: 'string', nullable: true },
                  deliveryType: { type: 'string', nullable: true },
                  tracking: { type: 'string', nullable: true },
                  complaint: { type: 'string', nullable: true },
                  orderType: { type: 'string', nullable: true },
                  totalAmount: { type: 'string', nullable: true },
                  // Change tracking fields
                  changeType: { type: 'string', nullable: true },
                  changedAt: { type: 'string', format: 'date-time', nullable: true },
                  changedFields: { type: 'string', nullable: true },
                  previousValues: { type: 'string', nullable: true },
                  fetchedAt: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    handler: schucoHandler.getDeliveries,
  });

  // POST /api/schuco/refresh - Trigger manual refresh
  // Note: Scraping może trwać do 3 minut - timeout jest obsługiwany w schucoHandler
  fastify.post('/refresh', {
    preHandler: verifyAuth,
    schema: {
      description: 'Trigger manual refresh of Schuco deliveries',
      tags: ['schuco'],
      body: {
        type: 'object',
        properties: {
          headless: { type: 'boolean', default: true },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            recordsCount: { type: 'integer' },
            durationMs: { type: 'integer' },
          },
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: schucoHandler.refreshDeliveries,
  });

  // GET /api/schuco/status - Get last fetch status
  fastify.get('/status', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get status of last Schuco fetch',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            status: { type: 'string' },
            triggerType: { type: 'string' },
            recordsCount: { type: 'integer', nullable: true },
            newRecords: { type: 'integer', nullable: true },
            updatedRecords: { type: 'integer', nullable: true },
            unchangedRecords: { type: 'integer', nullable: true },
            errorMessage: { type: 'string', nullable: true },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            durationMs: { type: 'integer', nullable: true },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: schucoHandler.getStatus,
  });

  // GET /api/schuco/logs - Get fetch history
  fastify.get('/logs', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get history of Schuco fetches',
      tags: ['schuco'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              status: { type: 'string' },
              triggerType: { type: 'string', nullable: true },
              recordsCount: { type: 'integer', nullable: true },
              newRecords: { type: 'integer', nullable: true },
              updatedRecords: { type: 'integer', nullable: true },
              unchangedRecords: { type: 'integer', nullable: true },
              errorMessage: { type: 'string', nullable: true },
              startedAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              durationMs: { type: 'integer', nullable: true },
            },
          },
        },
      },
    },
    handler: schucoHandler.getLogs,
  });

  // GET /api/schuco/statistics - Get delivery statistics
  fastify.get('/statistics', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get statistics about deliveries by changeType',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            new: { type: 'integer' },
            updated: { type: 'integer' },
            unchanged: { type: 'integer' },
          },
        },
      },
    },
    handler: schucoHandler.getStatistics,
  });

  // DEBUG: Get changed records count
  fastify.get('/debug/changed', async (request, reply) => {
    const [newCount, updatedCount, totalCount] = await Promise.all([
      fastify.prisma.schucoDelivery.count({ where: { changeType: 'new' } }),
      fastify.prisma.schucoDelivery.count({ where: { changeType: 'updated' } }),
      fastify.prisma.schucoDelivery.count(),
    ]);

    const changedRecords = await fastify.prisma.schucoDelivery.findMany({
      where: {
        OR: [
          { changeType: 'new' },
          { changeType: 'updated' }
        ]
      },
      select: {
        id: true,
        orderNumber: true,
        changeType: true,
        changedAt: true,
        changedFields: true,
      },
      orderBy: { changedAt: 'desc' },
      take: 20,
    });

    return reply.send({
      newCount,
      updatedCount,
      totalCount,
      changedRecords,
    });
  });

  // POST /api/schuco/sync-links - Synchronize all order links
  fastify.post('/sync-links', {
    preHandler: verifyAuth,
    schema: {
      description: 'Synchronize all Schuco deliveries with orders (creates missing links)',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            processed: { type: 'integer' },
            linksCreated: { type: 'integer' },
            warehouseItems: { type: 'integer' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await schucoService.syncAllOrderLinks();
      return reply.send(result);
    },
  });

  // GET /api/schuco/unlinked - Get unlinked deliveries (for manual linking)
  fastify.get('/unlinked', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get Schuco deliveries without order links',
      tags: ['schuco'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              orderNumber: { type: 'string' },
              orderName: { type: 'string' },
              shippingStatus: { type: 'string' },
              deliveryWeek: { type: 'string', nullable: true },
              extractedOrderNums: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { limit } = request.query as { limit?: number };
      const deliveries = await schucoService.getUnlinkedDeliveries(limit);
      return reply.send(deliveries);
    },
  });

  // POST /api/schuco/links - Create manual link between order and Schuco delivery
  fastify.post('/links', {
    preHandler: verifyAuth,
    schema: {
      description: 'Create manual link between order and Schuco delivery',
      tags: ['schuco'],
      body: {
        type: 'object',
        required: ['orderId', 'schucoDeliveryId'],
        properties: {
          orderId: { type: 'integer' },
          schucoDeliveryId: { type: 'integer' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            orderId: { type: 'integer' },
            schucoDeliveryId: { type: 'integer' },
            linkedAt: { type: 'string', format: 'date-time' },
            linkedBy: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { orderId, schucoDeliveryId } = request.body as { orderId: number; schucoDeliveryId: number };
      const link = await schucoService.getOrderMatcher().createManualLink(orderId, schucoDeliveryId);
      return reply.status(201).send(link);
    },
  });

  // DELETE /api/schuco/links/:id - Delete link
  fastify.delete('/links/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Delete link between order and Schuco delivery',
      tags: ['schuco'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: number };
      await schucoService.getOrderMatcher().deleteLink(id);
      return reply.send({ message: 'Link deleted' });
    },
  });

  // GET /api/schuco/by-week - Get deliveries grouped by delivery week
  fastify.get('/by-week', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get Schuco deliveries grouped by delivery week',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            weeks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  week: { type: 'string' },
                  weekStart: { type: 'string', format: 'date-time', nullable: true },
                  count: { type: 'integer' },
                  deliveries: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        orderNumber: { type: 'string' },
                        orderName: { type: 'string' },
                        shippingStatus: { type: 'string' },
                        totalAmount: { type: 'string', nullable: true },
                        extractedOrderNums: { type: 'string', nullable: true },
                        changeType: { type: 'string', nullable: true },
                        changedFields: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await schucoService.getDeliveriesByWeek();
      return reply.send(result);
    },
  });

  // POST /api/schuco/cleanup-pending - Clean up stale pending logs
  fastify.post('/cleanup-pending', {
    preHandler: verifyAuth,
    schema: {
      description: 'Clean up stale pending logs (older than 10 minutes)',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            cleaned: { type: 'integer' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const cleaned = await schucoService.cleanupStalePendingLogs();
      return reply.send({
        cleaned,
        message: cleaned > 0
          ? `Wyczyszczono ${cleaned} starych logów 'pending'`
          : 'Brak starych logów do wyczyszczenia',
      });
    },
  });
}
