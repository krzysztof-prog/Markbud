import type { FastifyPluginAsync } from 'fastify';
import { GlassOrderHandler } from '../handlers/glassOrderHandler.js';
import { GlassOrderService } from '../services/glassOrderService.js';

export const glassOrderRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassOrderService(fastify.prisma);
  const handler = new GlassOrderHandler(service);

  // Glass order endpoints (no authentication required in development)
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get<{ Params: { id: string } }>('/:id', handler.getById.bind(handler));
  fastify.post('/import', handler.importFromTxt.bind(handler));
  fastify.delete<{ Params: { id: string } }>('/:id', handler.delete.bind(handler));
  fastify.get<{ Params: { id: string } }>('/:id/summary', handler.getSummary.bind(handler));
  fastify.get<{ Params: { id: string } }>('/:id/validations', handler.getValidations.bind(handler));
  fastify.patch<{ Params: { id: string }; Body: { status: string } }>('/:id/status', handler.updateStatus.bind(handler));
};
