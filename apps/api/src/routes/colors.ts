import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { ColorRepository } from '../repositories/ColorRepository.js';
import { ColorService } from '../services/colorService.js';
import { ColorHandler } from '../handlers/colorHandler.js';

export const colorRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new ColorRepository(prisma);
  const service = new ColorService(repository);
  const handler = new ColorHandler(service);

  // Routes - only routing, delegate to handlers
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/', handler.create.bind(handler));
  fastify.put('/:id', handler.update.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
  fastify.put('/:colorId/profiles/:profileId/visibility', handler.updateProfileVisibility.bind(handler));
};
