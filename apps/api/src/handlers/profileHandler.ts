/**
 * Profile Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProfileService } from '../services/profileService.js';
import {
  createProfileSchema,
  updateProfileSchema,
  profileParamsSchema,
  type CreateProfileInput,
  type UpdateProfileInput,
} from '../validators/profile.js';

export class ProfileHandler {
  constructor(private service: ProfileService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const profiles = await this.service.getAllProfiles();
    return reply.send(profiles);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = profileParamsSchema.parse(request.params);
    const profile = await this.service.getProfileById(parseInt(id));
    return reply.send(profile);
  }

  async create(
    request: FastifyRequest<{ Body: CreateProfileInput }>,
    reply: FastifyReply
  ) {
    const validated = createProfileSchema.parse(request.body);
    const profile = await this.service.createProfile(validated);
    return reply.status(201).send(profile);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateProfileInput }>,
    reply: FastifyReply
  ) {
    const { id } = profileParamsSchema.parse(request.params);
    const validated = updateProfileSchema.parse(request.body);
    const profile = await this.service.updateProfile(parseInt(id), validated);
    return reply.send(profile);
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = profileParamsSchema.parse(request.params);
    await this.service.deleteProfile(parseInt(id));
    return reply.status(204).send();
  }
}
