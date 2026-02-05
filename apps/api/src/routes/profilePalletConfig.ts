/**
 * Profile Pallet Config Routes - API endpoints for pallet-to-beam conversion settings
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { ProfilePalletConfigRepository } from '../repositories/ProfilePalletConfigRepository.js';
import { ProfilePalletConfigHandler } from '../handlers/profilePalletConfigHandler.js';

export const profilePalletConfigRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new ProfilePalletConfigRepository(prisma);
  const handler = new ProfilePalletConfigHandler(repository);

  /**
   * GET /api/profile-pallet-configs
   * Pobierz wszystkie przeliczniki
   */
  fastify.get('/', async (request, reply) => {
    return handler.getAll(request, reply);
  });

  /**
   * GET /api/profile-pallet-configs/:id
   * Pobierz przelicznik po ID
   */
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    return handler.getById(request, reply);
  });

  /**
   * POST /api/profile-pallet-configs
   * Dodaj nowy przelicznik
   */
  fastify.post<{
    Body: unknown;
  }>('/', async (request, reply) => {
    return handler.create(request, reply);
  });

  /**
   * PATCH /api/profile-pallet-configs/:id
   * Edytuj przelicznik
   */
  fastify.patch<{
    Params: { id: string };
    Body: unknown;
  }>('/:id', async (request, reply) => {
    return handler.update(request, reply);
  });

  /**
   * DELETE /api/profile-pallet-configs/:id
   * Usuń przelicznik
   */
  fastify.delete<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    return handler.delete(request, reply);
  });
};
