import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { DeliveryService } from '../services/deliveryService.js';
import { DeliveryHandler } from '../handlers/deliveryHandler.js';

export const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new DeliveryRepository(prisma);
  const service = new DeliveryService(repository);
  const handler = new DeliveryHandler(service);

  // Main CRUD routes
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/', handler.create.bind(handler));
  fastify.put('/:id', handler.update.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));

  // Order management routes
  fastify.post('/:id/orders', handler.addOrder.bind(handler));
  fastify.delete('/:id/orders/:orderId', handler.removeOrder.bind(handler));
  fastify.put('/:id/orders/reorder', handler.reorderOrders.bind(handler));
  fastify.post('/:id/move-order', handler.moveOrder.bind(handler));

  // Item management routes
  fastify.post('/:id/items', handler.addItem.bind(handler));
  fastify.delete('/:id/items/:itemId', handler.removeItem.bind(handler));

  // Complete delivery
  fastify.post('/:id/complete', handler.complete.bind(handler));

  // TODO: Migrate calendar and protocol endpoints (kept as legacy for now)
  // fastify.get('/calendar', ...)
  // fastify.get('/:id/protocol', ...)
};
