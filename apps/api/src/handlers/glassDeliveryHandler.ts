import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GlassDeliveryService } from '../services/glass-delivery/index.js';
import {
  glassDeliveryFiltersSchema,
  glassDeliveryIdParamsSchema,
} from '../validators/glass.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class GlassDeliveryHandler {
  constructor(private service: GlassDeliveryService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const filters = glassDeliveryFiltersSchema.parse(request.query);
    const deliveries = await this.service.findAll(filters);
    return reply.send(deliveries);
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = glassDeliveryIdParamsSchema.parse(request.params);
    const delivery = await this.service.findById(id);
    if (!delivery) {
      throw new NotFoundError('Dostawa szklana');
    }
    return reply.send(delivery);
  }

  async importFromCsv(request: FastifyRequest, reply: FastifyReply) {
    logger.debug('[GlassDeliveryHandler] importFromCsv called');

    const data = await request.file();

    if (!data) {
      throw new ValidationError('Brak pliku');
    }

    const content = (await data.toBuffer()).toString('utf-8');
    const delivery = await this.service.importFromCsv(content, data.filename);

    return reply.status(201).send(delivery);
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = glassDeliveryIdParamsSchema.parse(request.params);
    await this.service.delete(id);
    return reply.status(204).send();
  }

  async getLatestImportSummary(request: FastifyRequest, reply: FastifyReply) {
    const summary = await this.service.getLatestImportSummary();
    // Return null instead of 404 when no data - let frontend handle empty state
    return reply.send(summary);
  }
}
