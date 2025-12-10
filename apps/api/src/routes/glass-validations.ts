import type { FastifyPluginAsync } from 'fastify';
import { GlassValidationService } from '../services/glassValidationService.js';

export const glassValidationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassValidationService(fastify.prisma);

  fastify.get('/dashboard', async (request, reply) => {
    const dashboard = await service.getDashboard();
    return reply.send(dashboard);
  });

  fastify.get('/order/:orderNumber', async (request, reply) => {
    const { orderNumber } = request.params as { orderNumber: string };
    const validations = await service.getByOrderNumber(orderNumber);
    return reply.send(validations);
  });

  fastify.get('/', async (request, reply) => {
    const { severity, resolved } = request.query as { severity?: string; resolved?: string };
    const validations = await service.findAll({
      severity,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    });
    return reply.send(validations);
  });

  fastify.post('/:id/resolve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { resolvedBy, notes } = request.body as { resolvedBy: string; notes?: string };

    const validation = await service.resolve(parseInt(id), resolvedBy, notes);
    return reply.send(validation);
  });
};
