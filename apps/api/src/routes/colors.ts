import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { ColorRepository } from '../repositories/ColorRepository.js';
import { ColorService } from '../services/colorService.js';
import { ColorHandler } from '../handlers/colorHandler.js';
import { verifyAuth } from '../middleware/auth.js';


export const colorRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered architecture
  const repository = new ColorRepository(prisma);
  const service = new ColorService(repository);
  const handler = new ColorHandler(service);

  // Routes - only routing, delegate to handlers - all require authentication
  fastify.get<{ Querystring: { type?: string } }>('/', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.getAll(request, reply));

  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.getById(request, reply));

  fastify.post<{ Body: { name: string; code: string; type: string; hexColor?: string } }>('/', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.create(request, reply));

  fastify.put<{ Params: { id: string }; Body: { name?: string; code?: string; type?: 'powder' | 'ral' | 'anodized'; hexColor?: string } }>('/:id', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.update(request, reply));

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
  }, async (request, reply) => handler.delete(request, reply));

  fastify.put<{ Params: { colorId: string; profileId: string }; Body: { isVisible: boolean } }>('/:colorId/profiles/:profileId/visibility', {
    preHandler: verifyAuth,
  }, handler.updateProfileVisibility.bind(handler));
};
