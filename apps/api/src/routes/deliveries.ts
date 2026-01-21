import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { DeliveryService } from '../services/deliveryService.js';
import { DeliveryHandler } from '../handlers/deliveryHandler.js';
import { DeliveryProtocolService } from '../services/delivery-protocol-service.js';
import { verifyAuth } from '../middleware/auth.js';
import { parseIntParam } from '../utils/errors.js';
import { ReadinessOrchestrator } from '../services/readinessOrchestrator.js';
import { getLatestForDelivery } from '../handlers/labelCheckHandler.js';


export const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const deliveryRepository = new DeliveryRepository(prisma);
  const deliveryService = new DeliveryService(deliveryRepository);
  const protocolService = new DeliveryProtocolService();
  const handler = new DeliveryHandler(deliveryService, protocolService);

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
  fastify.get<{ Params: { id: string } }>('/:id/readiness', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get shipping readiness checklist for a delivery (System Brain)',
      tags: ['deliveries', 'readiness'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Delivery ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean', description: 'Whether delivery is ready for shipping' },
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
    const result = await orchestrator.canShipDelivery(parseIntParam(id, 'id'));
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
