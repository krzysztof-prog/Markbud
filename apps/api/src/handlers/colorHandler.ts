/**
 * Color Handler - Request/Response handling
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ColorService } from '../services/colorService.js';
import {
  createColorSchema,
  updateColorSchema,
  colorParamsSchema,
  type CreateColorInput,
  type UpdateColorInput,
} from '../validators/color.js';

export class ColorHandler {
  constructor(private service: ColorService) {}

  async getAll(
    request: FastifyRequest<{ Querystring: { type?: string } }>,
    reply: FastifyReply
  ) {
    const { type } = request.query;
    const colors = await this.service.getAllColors(type);
    return reply.send(colors);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = colorParamsSchema.parse(request.params);
    const color = await this.service.getColorById(parseInt(id));
    return reply.send(color);
  }

  async create(
    request: FastifyRequest<{ Body: CreateColorInput }>,
    reply: FastifyReply
  ) {
    const validated = createColorSchema.parse(request.body);
    const color = await this.service.createColor(validated);
    return reply.status(201).send(color);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateColorInput }>,
    reply: FastifyReply
  ) {
    const { id } = colorParamsSchema.parse(request.params);
    const validated = updateColorSchema.parse(request.body);
    const color = await this.service.updateColor(parseInt(id), validated);
    return reply.send(color);
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = colorParamsSchema.parse(request.params);
    await this.service.deleteColor(parseInt(id));
    return reply.status(204).send();
  }

  async updateProfileVisibility(
    request: FastifyRequest<{ Params: { colorId: string; profileId: string }; Body: { isVisible: boolean } }>,
    reply: FastifyReply
  ) {
    const colorId = parseInt(request.params.colorId, 10);
    const profileId = parseInt(request.params.profileId, 10);
    const { isVisible } = request.body;

    const profileColor = await this.service.updateProfileColorVisibility(profileId, colorId, isVisible);
    return reply.send(profileColor);
  }
}
