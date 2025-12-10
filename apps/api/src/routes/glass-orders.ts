import type { FastifyPluginAsync } from 'fastify';
import { GlassOrderHandler } from '../handlers/glassOrderHandler.js';
import { GlassOrderService } from '../services/glassOrderService.js';

export const glassOrderRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassOrderService(fastify.prisma);
  const handler = new GlassOrderHandler(service);

  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/import', handler.importFromTxt.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
  fastify.get('/:id/summary', handler.getSummary.bind(handler));
  fastify.get('/:id/validations', handler.getValidations.bind(handler));
  fastify.patch('/:id/status', handler.updateStatus.bind(handler));
};
