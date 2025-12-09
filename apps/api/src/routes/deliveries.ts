import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { DeliveryService } from '../services/deliveryService.js';
import { DeliveryHandler } from '../handlers/deliveryHandler.js';
import { DeliveryProtocolService } from '../services/DeliveryProtocolService.js';

export const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const deliveryRepository = new DeliveryRepository(prisma);
  const deliveryService = new DeliveryService(deliveryRepository);
  const protocolService = new DeliveryProtocolService();
  const handler = new DeliveryHandler(deliveryService, protocolService);

  // Core CRUD routes - delegate to handler
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/calendar', handler.getCalendar.bind(handler));
  fastify.get('/profile-requirements', handler.getProfileRequirements.bind(handler));
  fastify.get('/stats/windows/by-weekday', handler.getWindowsStatsByWeekday.bind(handler));
  fastify.get('/stats/windows', handler.getMonthlyWindowsStats.bind(handler));
  fastify.get('/stats/profiles', handler.getMonthlyProfileStats.bind(handler));

  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/', handler.create.bind(handler));
  fastify.put('/:id', handler.update.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));

  // Order management routes - delegate to handler
  fastify.post('/:id/orders', handler.addOrder.bind(handler));
  fastify.delete('/:id/orders/:orderId', handler.removeOrder.bind(handler));
  fastify.put('/:id/orders/reorder', handler.reorderOrders.bind(handler));
  fastify.post('/:id/move-order', handler.moveOrder.bind(handler));

  // Item management routes - delegate to handler
  fastify.post('/:id/items', handler.addItem.bind(handler));
  fastify.delete('/:id/items/:itemId', handler.removeItem.bind(handler));

  // Complete delivery route - delegate to handler
  fastify.post('/:id/complete', handler.complete.bind(handler));

  // Protocol routes - delegate to handler
  fastify.get('/:id/protocol', handler.getProtocol.bind(handler));
  fastify.get('/:id/protocol/pdf', handler.getProtocolPdf.bind(handler));
};
