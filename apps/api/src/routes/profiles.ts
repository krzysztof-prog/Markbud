import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { ProfileRepository } from '../repositories/ProfileRepository.js';
import { ProfileService } from '../services/profileService.js';
import { ProfileHandler } from '../handlers/profileHandler.js';

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new ProfileRepository(prisma);
  const service = new ProfileService(repository);
  const handler = new ProfileHandler(service);

  // Routes - only routing, delegate to handlers
  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/', handler.create.bind(handler));
  fastify.put('/:id', handler.update.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
};
