import type { FastifyPluginAsync } from 'fastify';
import { GlassDeliveryHandler } from '../handlers/glassDeliveryHandler.js';
import { GlassDeliveryService } from '../services/glassDeliveryService.js';

export const glassDeliveryRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassDeliveryService(fastify.prisma);
  const handler = new GlassDeliveryHandler(service);

  fastify.get('/latest-import/summary', handler.getLatestImportSummary.bind(handler));
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/import', handler.importFromCsv.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
};
