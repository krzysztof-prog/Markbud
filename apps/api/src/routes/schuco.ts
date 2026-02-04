import { FastifyInstance } from 'fastify';
import { SchucoHandler } from '../handlers/schucoHandler.js';
import { SchucoService } from '../services/schuco/schucoService.js';
import { SchucoItemService } from '../services/schuco/schucoItemService.js';
import { verifyAuth } from '../middleware/auth.js';


export default async function schucoRoutes(fastify: FastifyInstance) {
  const schucoService = new SchucoService(fastify.prisma);
  const schucoHandler = new SchucoHandler(schucoService);
  const schucoItemService = new SchucoItemService(fastify.prisma);

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
                  isWarehouseItem: { type: 'boolean' },
                  extractedOrderNums: { type: 'string', nullable: true },
                  // Change tracking fields
                  changeType: { type: 'string', nullable: true },
                  changedAt: { type: 'string', format: 'date-time', nullable: true },
                  changedFields: { type: 'string', nullable: true },
                  previousValues: { type: 'string', nullable: true },
                  // Item fetch tracking
                  itemsFetchedAt: { type: 'string', format: 'date-time', nullable: true },
                  fetchedAt: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  // Prisma count of related items
                  _count: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      items: { type: 'integer' },
                    },
                  },
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

  // POST /api/schuco/cancel - Cancel active import
  fastify.post('/cancel', {
    preHandler: verifyAuth,
    schema: {
      description: 'Cancel active Schuco import',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            cancelled: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await schucoService.cancelFetch();
      return reply.send(result);
    },
  });

  // GET /api/schuco/is-running - Check if import is running
  fastify.get('/is-running', {
    preHandler: verifyAuth,
    schema: {
      description: 'Check if Schuco import is currently running',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            isRunning: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      return reply.send({
        isRunning: schucoService.isImportRunning(),
      });
    },
  });

  // GET /api/schuco/archive - Get archived deliveries with pagination
  fastify.get('/archive', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get archived Schuco deliveries with pagination',
      tags: ['schuco'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1 },
          pageSize: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
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
                  totalAmount: { type: 'string', nullable: true },
                  archivedAt: { type: 'string', format: 'date-time' },
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
    handler: async (request, reply) => {
      const { page, pageSize } = request.query as { page?: number; pageSize?: number };
      const result = await schucoService.getArchivedDeliveries(page, pageSize);
      return reply.send(result);
    },
  });

  // GET /api/schuco/archive/stats - Get archive statistics
  fastify.get('/archive/stats', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get statistics about archived deliveries',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalArchived: { type: 'integer' },
            oldestArchived: { type: 'string', format: 'date-time', nullable: true },
            newestArchived: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const stats = await schucoService.getArchiveStats();
      return reply.send(stats);
    },
  });

  // POST /api/schuco/archive/run - Manually trigger archiving
  fastify.post('/archive/run', {
    preHandler: verifyAuth,
    schema: {
      description: 'Manually trigger archiving of old completed deliveries',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            archivedCount: { type: 'integer' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await schucoService.archiveOldDeliveries();
      return reply.send({
        ...result,
        message: result.archivedCount > 0
          ? `Zarchiwizowano ${result.archivedCount} zamówień`
          : 'Brak zamówień do archiwizacji',
      });
    },
  });

  // GET /api/schuco/settings/filter-days - Get filter days setting
  fastify.get('/settings/filter-days', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get the number of days for Schuco date filter',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            days: { type: 'integer' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const setting = await fastify.prisma.setting.findUnique({
        where: { key: 'schuco_filter_days' },
      });
      const days = setting?.value ? parseInt(setting.value, 10) : 90;
      return reply.send({ days: isNaN(days) || days <= 0 ? 90 : days });
    },
  });

  // PUT /api/schuco/settings/filter-days - Update filter days setting
  fastify.put('/settings/filter-days', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update the number of days for Schuco date filter',
      tags: ['schuco'],
      body: {
        type: 'object',
        required: ['days'],
        properties: {
          days: { type: 'integer', minimum: 7, maximum: 365 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            days: { type: 'integer' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { days } = request.body as { days: number };
      await fastify.prisma.setting.upsert({
        where: { key: 'schuco_filter_days' },
        update: { value: days.toString() },
        create: { key: 'schuco_filter_days', value: days.toString() },
      });
      // Wyczyść filterDate gdy ustawiamy dni - dni mają wtedy priorytet
      await fastify.prisma.setting.deleteMany({
        where: { key: 'schuco_filter_date' },
      });
      return reply.send({
        days,
        message: `Filtr daty zamówień ustawiony na ${days} dni`,
      });
    },
  });

  // GET /api/schuco/settings/filter-date - Get filter date setting
  fastify.get('/settings/filter-date', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get the specific date for Schuco date filter',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            date: { type: 'string', nullable: true },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const setting = await fastify.prisma.setting.findUnique({
        where: { key: 'schuco_filter_date' },
      });
      return reply.send({ date: setting?.value || null });
    },
  });

  // PUT /api/schuco/settings/filter-date - Update filter date setting
  fastify.put('/settings/filter-date', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update the specific date for Schuco date filter (format: YYYY-MM-DD)',
      tags: ['schuco'],
      body: {
        type: 'object',
        required: ['date'],
        properties: {
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { date } = request.body as { date: string };
      // Walidacja - sprawdź czy data jest poprawna
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return reply.status(400).send({ error: 'Nieprawidłowy format daty. Użyj YYYY-MM-DD' });
      }
      await fastify.prisma.setting.upsert({
        where: { key: 'schuco_filter_date' },
        update: { value: date },
        create: { key: 'schuco_filter_date', value: date },
      });
      // Formatuj datę do wyświetlenia (D.M.YYYY)
      const day = parsedDate.getDate();
      const month = parsedDate.getMonth() + 1;
      const year = parsedDate.getFullYear();
      return reply.send({
        date,
        message: `Filtr daty ustawiony od ${day}.${month}.${year}`,
      });
    },
  });

  // DELETE /api/schuco/settings/filter-date - Clear filter date (use days instead)
  fastify.delete('/settings/filter-date', {
    preHandler: verifyAuth,
    schema: {
      description: 'Clear the specific filter date (will use filter-days instead)',
      tags: ['schuco'],
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
      await fastify.prisma.setting.deleteMany({
        where: { key: 'schuco_filter_date' },
      });
      return reply.send({
        message: 'Filtr daty wyczyszczony - użyty zostanie filtr dni',
      });
    },
  });

  // ============================================
  // ENDPOINTY DLA POZYCJI ZAMÓWIEŃ (ITEMS)
  // UWAGA: Statyczne endpointy MUSZĄ być PRZED dynamicznym :deliveryId!
  // ============================================

  // GET /api/schuco/items/stats - Get items statistics
  fastify.get('/items/stats', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get statistics about order items',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalDeliveries: { type: 'integer' },
            withItems: { type: 'integer' },
            withoutItems: { type: 'integer' },
            totalItems: { type: 'integer' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const stats = await schucoItemService.getItemsStats();
      return reply.send(stats);
    },
  });

  // GET /api/schuco/items/is-running - Check if item fetch is running
  fastify.get('/items/is-running', {
    preHandler: verifyAuth,
    schema: {
      description: 'Check if order items fetch is currently running',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            isRunning: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      return reply.send({
        isRunning: schucoItemService.isItemFetchRunning(),
      });
    },
  });

  // POST /api/schuco/items/fetch - Trigger manual fetch of order items
  // Rozszerzone o mode: 'missing' (domyślne), 'all', 'from-date'
  fastify.post('/items/fetch', {
    preHandler: verifyAuth,
    schema: {
      description: 'Trigger manual fetch of order items from Schuco. Mode: missing (default), all, from-date',
      tags: ['schuco'],
      body: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['missing', 'all', 'from-date'],
            default: 'missing',
            description: 'Tryb pobierania: missing (brakujące), all (wszystkie), from-date (od daty)',
          },
          fromDate: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Data od której pobierać (YYYY-MM-DD) - wymagane dla mode=from-date',
          },
          limit: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
          deliveryIds: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Konkretne ID zamówień do pobrania (ignoruje mode)',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalDeliveries: { type: 'integer' },
            processedDeliveries: { type: 'integer' },
            newItems: { type: 'integer' },
            updatedItems: { type: 'integer' },
            unchangedItems: { type: 'integer' },
            errors: { type: 'integer' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        409: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { mode = 'missing', fromDate, limit, deliveryIds } = request.body as {
        mode?: 'missing' | 'all' | 'from-date';
        fromDate?: string;
        limit?: number;
        deliveryIds?: number[];
      };

      // Sprawdź czy nie ma aktywnego pobierania
      if (schucoItemService.isItemFetchRunning()) {
        return reply.status(409).send({ error: 'Pobieranie pozycji jest już w trakcie' });
      }

      try {
        let result;

        // Jeśli podano konkretne ID - pobierz dla nich
        if (deliveryIds && deliveryIds.length > 0) {
          result = await schucoItemService.fetchItemsByDeliveryIds(deliveryIds);
        }
        // W przeciwnym razie - użyj mode
        else if (mode === 'all') {
          result = await schucoItemService.fetchAllItems(limit || 500);
        } else if (mode === 'from-date') {
          if (!fromDate) {
            return reply.status(400).send({ error: 'Wymagana data (fromDate) dla mode=from-date' });
          }
          const parsedDate = new Date(fromDate);
          if (isNaN(parsedDate.getTime())) {
            return reply.status(400).send({ error: 'Nieprawidłowy format daty. Użyj YYYY-MM-DD' });
          }
          result = await schucoItemService.fetchItemsFromDate(parsedDate, limit || 500);
        } else {
          // mode === 'missing' (domyślne)
          result = await schucoItemService.fetchMissingItems(limit || 100);
        }

        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // POST /api/schuco/items/clear-old-changes - Clear old change markers
  fastify.post('/items/clear-old-changes', {
    preHandler: verifyAuth,
    schema: {
      description: 'Clear change markers older than 72 hours',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            cleared: { type: 'integer' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const cleared = await schucoItemService.clearOldChangeMarkers();
      return reply.send({
        cleared,
        message: cleared > 0
          ? `Wyczyszczono markery zmian z ${cleared} pozycji`
          : 'Brak starych markerów do wyczyszczenia',
      });
    },
  });

  // POST /api/schuco/items/refresh - Odśwież pozycje zamówień ze starymi danymi
  fastify.post('/items/refresh', {
    preHandler: verifyAuth,
    schema: {
      description: 'Refresh stale order items (items fetched more than X days ago)',
      tags: ['schuco'],
      body: {
        type: 'object',
        properties: {
          staleDays: { type: 'integer', default: 1, minimum: 1, maximum: 30 },
          limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalDeliveries: { type: 'integer' },
            processedDeliveries: { type: 'integer' },
            newItems: { type: 'integer' },
            updatedItems: { type: 'integer' },
            unchangedItems: { type: 'integer' },
            errors: { type: 'integer' },
          },
        },
        409: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { staleDays = 1, limit = 50 } = request.body as { staleDays?: number; limit?: number };

      // Sprawdź czy nie ma aktywnego pobierania
      if (schucoItemService.isItemFetchRunning()) {
        return reply.status(409).send({ error: 'Pobieranie pozycji jest już w trakcie' });
      }

      try {
        const result = await schucoItemService.refreshStaleItems(staleDays, limit);
        return reply.send(result);
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // GET /api/schuco/items/scheduler-status - Status schedulera automatycznego pobierania
  fastify.get('/items/scheduler-status', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get status of automatic item fetch scheduler',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            isSchedulerRunning: { type: 'boolean' },
            lastAutoFetchTime: { type: 'string', format: 'date-time', nullable: true },
            intervalMinutes: { type: 'integer' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const status = schucoItemService.getSchedulerStatus();
      return reply.send({
        ...status,
        intervalMinutes: 45,
      });
    },
  });

  // POST /api/schuco/items/scheduler/start - Uruchom scheduler
  fastify.post('/items/scheduler/start', {
    preHandler: verifyAuth,
    schema: {
      description: 'Start automatic item fetch scheduler (every 45 minutes)',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            isSchedulerRunning: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      schucoItemService.startAutoFetchScheduler();
      const status = schucoItemService.getSchedulerStatus();
      return reply.send({
        message: 'Scheduler uruchomiony - automatyczne pobieranie co 45 minut',
        isSchedulerRunning: status.isSchedulerRunning,
      });
    },
  });

  // POST /api/schuco/items/scheduler/stop - Zatrzymaj scheduler
  fastify.post('/items/scheduler/stop', {
    preHandler: verifyAuth,
    schema: {
      description: 'Stop automatic item fetch scheduler',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            isSchedulerRunning: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      schucoItemService.stopAutoFetchScheduler();
      const status = schucoItemService.getSchedulerStatus();
      return reply.send({
        message: 'Scheduler zatrzymany',
        isSchedulerRunning: status.isSchedulerRunning,
      });
    },
  });

  // POST /api/schuco/items/auto-fetch - Ręczne uruchomienie auto-fetch (jednorazowo)
  fastify.post('/items/auto-fetch', {
    preHandler: verifyAuth,
    schema: {
      description: 'Manually trigger auto-fetch for changed items (one-time)',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalDeliveries: { type: 'integer' },
            processedDeliveries: { type: 'integer' },
            newItems: { type: 'integer' },
            updatedItems: { type: 'integer' },
            unchangedItems: { type: 'integer' },
            errors: { type: 'integer' },
          },
        },
        409: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      if (schucoItemService.isItemFetchRunning()) {
        return reply.status(409).send({ error: 'Pobieranie pozycji jest już w trakcie' });
      }

      try {
        const result = await schucoItemService.autoFetchChangedItems();
        return reply.send(result || {
          totalDeliveries: 0,
          processedDeliveries: 0,
          newItems: 0,
          updatedItems: 0,
          unchangedItems: 0,
          errors: 0,
        });
      } catch (error) {
        return reply.status(500).send({ error: (error as Error).message });
      }
    },
  });

  // GET /api/schuco/items/stale-count - Ile zamówień ma stare pozycje do odświeżenia
  fastify.get('/items/stale-count', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get count of deliveries with stale items',
      tags: ['schuco'],
      querystring: {
        type: 'object',
        properties: {
          staleDays: { type: 'integer', default: 1, minimum: 1, maximum: 30 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
            staleDays: { type: 'integer' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { staleDays = 1 } = request.query as { staleDays?: number };
      const count = await schucoItemService.getStaleItemsCount(staleDays);
      return reply.send({ count, staleDays });
    },
  });

  // GET /api/schuco/items/:deliveryId - Get items for a specific delivery
  // WAŻNE: Ten endpoint MUSI być NA KOŃCU (po wszystkich statycznych /items/*)
  fastify.get('/items/:deliveryId', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get order items for a specific Schuco delivery',
      tags: ['schuco'],
      params: {
        type: 'object',
        required: ['deliveryId'],
        properties: {
          deliveryId: { type: 'integer' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              position: { type: 'integer' },
              articleNumber: { type: 'string' },
              articleDescription: { type: 'string' },
              orderedQty: { type: 'integer' },
              shippedQty: { type: 'integer' },
              unit: { type: 'string' },
              dimensions: { type: 'string', nullable: true },
              configuration: { type: 'string', nullable: true },
              deliveryWeek: { type: 'string', nullable: true },
              tracking: { type: 'string', nullable: true },
              comment: { type: 'string', nullable: true },
              changeType: { type: 'string', nullable: true },
              changedAt: { type: 'string', format: 'date-time', nullable: true },
              changedFields: { type: 'string', nullable: true },
              fetchedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { deliveryId } = request.params as { deliveryId: number };
      const items = await schucoItemService.getItemsForDelivery(deliveryId);
      return reply.send(items);
    },
  });
}
