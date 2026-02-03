import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { DeliveryService } from '../services/deliveryService.js';
import { DeliveryHandler } from '../handlers/deliveryHandler.js';
import { DeliveryProtocolService } from '../services/delivery-protocol-service.js';
import { verifyAuth } from '../middleware/auth.js';
import { parseIntParam } from '../utils/errors.js';
import { ReadinessOrchestrator } from '../services/readinessOrchestrator.js';
import { DeliveryReadinessAggregator } from '../services/readiness/index.js';
import { getLatestForDelivery } from '../handlers/labelCheckHandler.js';


export const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const deliveryRepository = new DeliveryRepository(prisma);
  const deliveryService = new DeliveryService(deliveryRepository);
  const protocolService = new DeliveryProtocolService();
  const handler = new DeliveryHandler(deliveryService, protocolService);

  // === Quick Delivery Routes (Szybka dostawa) ===
  // UWAGA: Te route'y muszą być PRZED /:id aby nie być interpretowane jako parametr

  // POST /api/deliveries/validate-orders - walidacja listy numerów zleceń
  fastify.post<{ Body: { orderNumbers: string } }>('/validate-orders', {
    preHandler: verifyAuth,
  }, handler.validateOrderNumbers.bind(handler));

  // POST /api/deliveries/bulk-assign - masowe przypisanie zleceń
  fastify.post<{
    Body: {
      orderIds: number[];
      deliveryId?: number;
      deliveryDate?: string;
      reassignOrderIds?: number[];
    };
  }>('/bulk-assign', {
    preHandler: verifyAuth,
  }, handler.bulkAssignOrders.bind(handler));

  // GET /api/deliveries/for-date - lista dostaw na datę
  fastify.get<{ Querystring: { date: string } }>('/for-date', {
    preHandler: verifyAuth,
  }, handler.getDeliveriesForDate.bind(handler));

  // GET /api/deliveries/preview-number - podgląd numeru następnej dostawy
  fastify.get<{ Querystring: { date: string } }>('/preview-number', {
    preHandler: verifyAuth,
  }, handler.previewDeliveryNumber.bind(handler));

  // GET /api/deliveries/readiness/batch - batch readiness dla wielu dostaw (QW-1)
  // Optymalizacja: 1 request zamiast N requestów z frontendu
  fastify.get<{ Querystring: { ids: string; refresh?: string } }>('/readiness/batch', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get aggregated readiness status for multiple deliveries',
      tags: ['deliveries', 'readiness'],
      querystring: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: { type: 'string', description: 'Comma-separated delivery IDs (e.g., "1,2,3")' },
          refresh: { type: 'string', description: 'Force recalculation (true/false)' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ready', 'conditional', 'blocked', 'pending'] },
              blocking: { type: 'array' },
              warnings: { type: 'array' },
              passed: { type: 'array' },
              checklist: { type: 'array' },
              lastCalculatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { ids, refresh } = request.query;

    // Parsuj IDs z query stringa
    const deliveryIds = ids
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);

    if (deliveryIds.length === 0) {
      return reply.send({});
    }

    // Limit do 100 dostaw na jeden request
    if (deliveryIds.length > 100) {
      return reply.status(400).send({
        error: 'Too many IDs requested. Maximum is 100.',
      });
    }

    const aggregator = new DeliveryReadinessAggregator(prisma);
    const results = await aggregator.getBatchReadiness(deliveryIds, {
      refresh: refresh === 'true',
    });

    return reply.send(results);
  });

  // === Core CRUD routes ===
  // Core CRUD routes - delegate to handler - all require authentication
  fastify.get<{ Querystring: { from?: string; to?: string; status?: string } }>('/', {
    preHandler: verifyAuth,
  }, handler.getAll.bind(handler));

  fastify.get<{ Querystring: { month: string; year: string } }>('/calendar', {
    preHandler: verifyAuth,
  }, handler.getCalendar.bind(handler));

  // Batch calendar endpoint - combines deliveries, working days, and holidays
  fastify.get<{ Querystring: { months: string } }>('/calendar-batch', {
    preHandler: verifyAuth,
  }, handler.getCalendarBatch.bind(handler));

  fastify.get<{ Querystring: { from?: string } }>('/profile-requirements', {
    preHandler: verifyAuth,
  }, handler.getProfileRequirements.bind(handler));

  fastify.get<{ Querystring: { months?: string } }>('/stats/windows/by-weekday', {
    preHandler: verifyAuth,
  }, handler.getWindowsStatsByWeekday.bind(handler));

  fastify.get<{ Querystring: { months?: string } }>('/stats/windows', {
    preHandler: verifyAuth,
  }, handler.getMonthlyWindowsStats.bind(handler));

  fastify.get<{ Querystring: { months?: string } }>('/stats/profiles', {
    preHandler: verifyAuth,
  }, handler.getMonthlyProfileStats.bind(handler));

  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, handler.getById.bind(handler));

  fastify.post<{ Body: { deliveryDate: string; deliveryNumber?: string; notes?: string } }>('/', {
    preHandler: verifyAuth,
  }, handler.create.bind(handler));

  fastify.put<{ Params: { id: string }; Body: { deliveryDate?: string; status?: string; notes?: string } }>('/:id', {
    preHandler: verifyAuth,
  }, handler.update.bind(handler));

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, handler.delete.bind(handler));

  // Order management routes - delegate to handler
  fastify.post<{ Params: { id: string }; Body: { orderId: number } }>('/:id/orders', {
    preHandler: verifyAuth,
  }, handler.addOrder.bind(handler));

  fastify.delete<{ Params: { id: string; orderId: string } }>('/:id/orders/:orderId', {
    preHandler: verifyAuth,
  }, handler.removeOrder.bind(handler));

  fastify.put<{ Params: { id: string }; Body: { orderIds: number[] } }>('/:id/orders/reorder', {
    preHandler: verifyAuth,
  }, handler.reorderOrders.bind(handler));

  fastify.post<{ Params: { id: string }; Body: { orderId: number; targetDeliveryId: number } }>('/:id/move-order', {
    preHandler: verifyAuth,
  }, handler.moveOrder.bind(handler));

  // Item management routes - delegate to handler
  fastify.post<{ Params: { id: string }; Body: { itemType: string; description: string; quantity: number } }>('/:id/items', {
    preHandler: verifyAuth,
  }, handler.addItem.bind(handler));

  fastify.delete<{ Params: { id: string; itemId: string } }>('/:id/items/:itemId', {
    preHandler: verifyAuth,
  }, handler.removeItem.bind(handler));

  // Complete delivery route - delegate to handler
  fastify.post<{ Params: { id: string }; Body: { productionDate: string } }>('/:id/complete', {
    preHandler: verifyAuth,
  }, handler.complete.bind(handler));

  // Complete all orders in delivery route - delegate to handler
  fastify.post<{ Params: { id: string }; Body: { productionDate?: string } }>('/:id/complete-all-orders', handler.completeAllOrders.bind(handler));

  // Protocol routes - delegate to handler
  fastify.get<{ Params: { id: string } }>('/:id/protocol', {
    preHandler: verifyAuth,
  }, handler.getProtocol.bind(handler));

  fastify.get<{ Params: { id: string } }>('/:id/protocol/pdf', {
    preHandler: verifyAuth,
  }, handler.getProtocolPdf.bind(handler));

  // Bulk operations
  fastify.patch<{ Body: { fromDate: string; toDate: string; yearOffset: number } }>('/bulk-update-dates', {
    preHandler: verifyAuth,
  }, handler.bulkUpdateDates.bind(handler));

  // P1-R4: GET /api/deliveries/:id/readiness - get shipping readiness checklist (System Brain)
  // Używa nowego DeliveryReadinessAggregator z modułami sprawdzającymi
  fastify.get<{ Params: { id: string }; Querystring: { refresh?: string } }>('/:id/readiness', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get aggregated readiness status for a delivery',
      tags: ['deliveries', 'readiness'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Delivery ID' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          refresh: { type: 'string', description: 'Force recalculation (true/false)' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ready', 'conditional', 'blocked', 'pending'], description: 'Aggregated status' },
            blocking: {
              type: 'array',
              description: 'Blocking issues (cause blocked status)',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        itemId: { type: 'string' },
                        orderId: { type: 'number' },
                        reason: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            warnings: {
              type: 'array',
              description: 'Warnings (cause conditional status)',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        itemId: { type: 'string' },
                        orderId: { type: 'number' },
                        reason: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            passed: {
              type: 'array',
              description: 'Passed checks',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
            checklist: {
              type: 'array',
              description: 'Checklist for UI display',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  label: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
            lastCalculatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { refresh } = request.query;
    const aggregator = new DeliveryReadinessAggregator(prisma);
    const result = await aggregator.getReadiness(parseIntParam(id, 'id'), {
      refresh: refresh === 'true',
    });
    return reply.send(result);
  });

  // GET /api/deliveries/:id/label-check - ostatnie sprawdzenie etykiet dla dostawy
  fastify.get<{ Params: { id: string } }>('/:id/label-check', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get latest label check for a delivery',
      tags: ['deliveries', 'label-checks'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Delivery ID' },
        },
      },
    },
  }, getLatestForDelivery);
};
