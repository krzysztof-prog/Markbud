import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GlassOrderService } from '../services/glassOrderService.js';
import {
  glassOrderFiltersSchema,
  glassOrderIdParamsSchema,
  glassOrderStatusUpdateSchema,
} from '../validators/glass.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

export class GlassOrderHandler {
  constructor(private service: GlassOrderService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const filters = glassOrderFiltersSchema.parse(request.query);
    const orders = await this.service.findAll(filters);
    return reply.send(orders);
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = glassOrderIdParamsSchema.parse(request.params);
    const order = await this.service.findById(id);
    if (!order) {
      throw new NotFoundError('Zamówienie szklane');
    }
    return reply.send(order);
  }

  async importFromTxt(request: FastifyRequest<{ Querystring: { replace?: string } }>, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        throw new ValidationError('Brak pliku');
      }

      const replaceExisting = request.query.replace === 'true';
      const buffer = await data.toBuffer();
      const order = await this.service.importFromTxt(buffer, data.filename, replaceExisting);

      return reply.status(201).send(order);
    } catch (error: unknown) {
      // ConflictError zawiera szczegoly konfliktu - musi byc obsluzony lokalnie
      // aby zwrocic details do frontendu (zgodnie z anti-patterns.md)
      if (error instanceof ConflictError) {
        return reply.status(409).send({
          error: error.message,
          details: error.details,
        });
      }
      // Pozostale bledy (w tym ZodError, ValidationError) obsluzy middleware
      throw error;
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = glassOrderIdParamsSchema.parse(request.params);
    await this.service.delete(id);
    return reply.status(204).send();
  }

  async getSummary(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = glassOrderIdParamsSchema.parse(request.params);
    const summary = await this.service.getSummary(id);
    return reply.send(summary);
  }

  async getValidations(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = glassOrderIdParamsSchema.parse(request.params);
    const validations = await this.service.getValidations(id);
    return reply.send(validations);
  }

  async updateStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
    reply: FastifyReply
  ) {
    const { id } = glassOrderIdParamsSchema.parse(request.params);
    const { status } = glassOrderStatusUpdateSchema.parse(request.body);
    const order = await this.service.updateStatus(id, status);
    return reply.send(order);
  }
}
