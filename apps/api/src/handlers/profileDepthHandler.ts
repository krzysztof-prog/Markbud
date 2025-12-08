/**
 * Profile Depth Handler - Request/Response handling for profile depths
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProfileDepthRepository } from '../repositories/ProfileDepthRepository.js';
import {
  profileDepthSchema,
  updateProfileDepthSchema,
  profileDepthParamsSchema,
} from '../validators/profileDepth.js';

export class ProfileDepthHandler {
  constructor(private repository: ProfileDepthRepository) {}

  /**
   * GET /api/profile-depths
   * Get all profile depths
   */
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const profileDepths = await this.repository.getAll();
    return reply.send(profileDepths);
  }

  /**
   * GET /api/profile-depths/:id
   * Get profile depth by ID
   */
  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = profileDepthParamsSchema.parse(request.params);
    const profileDepth = await this.repository.getById(parseInt(id));

    if (!profileDepth) {
      return reply.status(404).send({ error: 'Profile depth not found' });
    }

    return reply.send(profileDepth);
  }

  /**
   * POST /api/profile-depths
   * Create new profile depth
   */
  async create(
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) {
    const validated = profileDepthSchema.parse(request.body);
    const created = await this.repository.create(validated);
    return reply.status(201).send(created);
  }

  /**
   * PATCH /api/profile-depths/:id
   * Update profile depth
   */
  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
    reply: FastifyReply
  ) {
    const { id } = profileDepthParamsSchema.parse(request.params);
    const validated = updateProfileDepthSchema.parse(request.body);
    const updated = await this.repository.update(parseInt(id), validated);
    return reply.send(updated);
  }

  /**
   * DELETE /api/profile-depths/:id
   * Delete profile depth
   */
  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = profileDepthParamsSchema.parse(request.params);
    await this.repository.delete(parseInt(id));
    return reply.status(204).send();
  }
}
