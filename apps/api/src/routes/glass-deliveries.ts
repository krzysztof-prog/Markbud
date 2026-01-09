import type { FastifyPluginAsync } from 'fastify';
import { GlassDeliveryHandler } from '../handlers/glassDeliveryHandler.js';
import { GlassDeliveryService } from '../services/glass-delivery/index.js';

export const glassDeliveryRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassDeliveryService(fastify.prisma);
  const handler = new GlassDeliveryHandler(service);

  // Glass delivery endpoints (no authentication required in development)
  fastify.get('/latest-import/summary', handler.getLatestImportSummary.bind(handler));
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get<{ Params: { id: string } }>('/:id', handler.getById.bind(handler));
  fastify.post('/import', handler.importFromCsv.bind(handler));
  fastify.delete<{ Params: { id: string } }>('/:id', handler.delete.bind(handler));

  // Kategoryzowane szyby
  fastify.get('/categorized/loose', handler.getLooseGlasses.bind(handler));
  fastify.get('/categorized/aluminum', handler.getAluminumGlasses.bind(handler));
  fastify.get('/categorized/aluminum/summary', handler.getAluminumGlassesSummary.bind(handler));
  fastify.get('/categorized/reclamation', handler.getReclamationGlasses.bind(handler));
};
