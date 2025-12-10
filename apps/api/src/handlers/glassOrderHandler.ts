import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GlassOrderService } from '../services/glassOrderService.js';
import {
  glassOrderFiltersSchema,
  glassOrderIdParamsSchema,
  glassOrderStatusUpdateSchema,
} from '../validators/glass.js';
import { ZodError } from 'zod';

export class GlassOrderHandler {
  constructor(private service: GlassOrderService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const filters = glassOrderFiltersSchema.parse(request.query);
      const orders = await this.service.findAll(filters);
      return reply.send(orders);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = glassOrderIdParamsSchema.parse(request.params);
      const order = await this.service.findById(id);
      if (!order) {
        return reply.status(404).send({ error: 'Zamówienie nie istnieje' });
      }
      return reply.send(order);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  }

  async importFromTxt(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku' });
      }

      const buffer = await data.toBuffer();
      const order = await this.service.importFromTxt(buffer, data.filename);

      return reply.status(201).send(order);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Błąd importu';
      return reply.status(400).send({ error: message });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = glassOrderIdParamsSchema.parse(request.params);
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

  async getSummary(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = glassOrderIdParamsSchema.parse(request.params);
      const summary = await this.service.getSummary(id);
      return reply.send(summary);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      const message = error instanceof Error ? error.message : 'Błąd pobierania podsumowania';
      return reply.status(400).send({ error: message });
    }
  }

  async getValidations(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = glassOrderIdParamsSchema.parse(request.params);
      const validations = await this.service.getValidations(id);
      return reply.send(validations);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  }

  async updateStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = glassOrderIdParamsSchema.parse(request.params);
      const { status } = glassOrderStatusUpdateSchema.parse(request.body);
      const order = await this.service.updateStatus(id, status);
      return reply.send(order);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  }
}
