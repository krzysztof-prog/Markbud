import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderService } from '../services/orderService.js';
import { OrderHandler } from '../handlers/orderHandler.js';

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new OrderRepository(prisma);
  const service = new OrderService(repository);
  const handler = new OrderHandler(service);

  // Main CRUD routes
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/by-number/:orderNumber', handler.getByNumber.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/', handler.create.bind(handler));
  fastify.put('/:id', handler.update.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));

  // Archive management
  fastify.post('/:id/archive', handler.archive.bind(handler));
  fastify.post('/:id/unarchive', handler.unarchive.bind(handler));

  // TODO: Migrate additional endpoints (PDF, windows, requirements, notes)
  // fastify.get('/:id/pdf', ...)
  // fastify.post('/:id/windows', ...)
  // fastify.post('/:id/requirements', ...)
  // fastify.post('/:id/notes', ...)
};
