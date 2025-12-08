/**
 * Profile Depth Routes - API endpoints for profile depth settings
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { ProfileDepthRepository } from '../repositories/ProfileDepthRepository.js';
import { ProfileDepthHandler } from '../handlers/profileDepthHandler.js';

export const profileDepthRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new ProfileDepthRepository(prisma);
  const handler = new ProfileDepthHandler(repository);

  /**
   * GET /api/profile-depths
   * Get all profile depths
   */
  fastify.get('/', async (request, reply) => {
    return handler.getAll(request, reply);
  });

  /**
   * GET /api/profile-depths/:id
   * Get profile depth by ID
   */
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    return handler.getById(request, reply);
  });

  /**
   * POST /api/profile-depths
   * Create new profile depth
   */
  fastify.post<{
    Body: unknown;
  }>('/', async (request, reply) => {
    return handler.create(request, reply);
  });

  /**
   * PATCH /api/profile-depths/:id
   * Update profile depth
   */
  fastify.patch<{
    Params: { id: string };
    Body: unknown;
  }>('/:id', async (request, reply) => {
    return handler.update(request, reply);
  });

  /**
   * DELETE /api/profile-depths/:id
   * Delete profile depth
   */
  fastify.delete<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    return handler.delete(request, reply);
  });
};
