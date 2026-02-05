/**
 * Profile Pallet Config Handler - Request/Response handling for pallet-to-beam conversion configs
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProfilePalletConfigRepository } from '../repositories/ProfilePalletConfigRepository.js';
import {
  profilePalletConfigSchema,
  updateProfilePalletConfigSchema,
  profilePalletConfigParamsSchema,
} from '../validators/profilePalletConfig.js';
import { NotFoundError } from '../utils/errors.js';

export class ProfilePalletConfigHandler {
  constructor(private repository: ProfilePalletConfigRepository) {}

  /**
   * GET /api/profile-pallet-configs
   * Pobierz wszystkie przeliczniki palet
   */
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const configs = await this.repository.getAll();
    return reply.send(configs);
  }

  /**
   * GET /api/profile-pallet-configs/:id
   * Pobierz przelicznik po ID
   */
  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = profilePalletConfigParamsSchema.parse(request.params);
    const config = await this.repository.getById(parseInt(id));

    if (!config) {
      throw new NotFoundError('Przelicznik palety');
    }

    return reply.send(config);
  }

  /**
   * POST /api/profile-pallet-configs
   * Dodaj nowy przelicznik
   */
  async create(
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) {
    const validated = profilePalletConfigSchema.parse(request.body);
    const created = await this.repository.create(validated);
    return reply.status(201).send(created);
  }

  /**
   * PATCH /api/profile-pallet-configs/:id
   * Edytuj przelicznik (tylko beamsPerPallet)
   */
  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
    reply: FastifyReply
  ) {
    const { id } = profilePalletConfigParamsSchema.parse(request.params);
    const validated = updateProfilePalletConfigSchema.parse(request.body);
    const updated = await this.repository.update(parseInt(id), validated);
    return reply.send(updated);
  }

  /**
   * DELETE /api/profile-pallet-configs/:id
   * Usuń przelicznik
   */
  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = profilePalletConfigParamsSchema.parse(request.params);
    await this.repository.delete(parseInt(id));
    return reply.status(204).send();
  }
}
