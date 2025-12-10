import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GlassDeliveryService } from '../services/glassDeliveryService.js';
import {
  glassDeliveryFiltersSchema,
  glassDeliveryIdParamsSchema,
} from '../validators/glass.js';
import { ZodError } from 'zod';

export class GlassDeliveryHandler {
  constructor(private service: GlassDeliveryService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const filters = glassDeliveryFiltersSchema.parse(request.query);
      const deliveries = await this.service.findAll(filters);
      return reply.send(deliveries);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = glassDeliveryIdParamsSchema.parse(request.params);
      const delivery = await this.service.findById(id);
      if (!delivery) {
        return reply.status(404).send({ error: 'Dostawa nie istnieje' });
      }
      return reply.send(delivery);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  }

  async importFromCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku' });
      }

      const content = (await data.toBuffer()).toString('utf-8');
      const delivery = await this.service.importFromCsv(content, data.filename);

      return reply.status(201).send(delivery);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Błąd importu';
      return reply.status(400).send({ error: message });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = glassDeliveryIdParamsSchema.parse(request.params);
      await this.service.delete(id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      const message = error instanceof Error ? error.message : 'Błąd usuwania';
      return reply.status(400).send({ error: message });
    }
  }
}
