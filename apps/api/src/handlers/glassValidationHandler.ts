/**
 * Glass Validation Handler - Request/Response handling
 * Deleguje logikę biznesową do GlassValidationService
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { GlassValidationService } from '../services/glassValidationService.js';
import {
  glassValidationFiltersSchema,
  glassValidationResolveSchema,
  glassValidationOrderNumberParamsSchema,
  glassValidationIdParamsSchema,
  type GlassValidationFilters,
  type GlassValidationResolve,
} from '../validators/glass.js';

export class GlassValidationHandler {
  constructor(private service: GlassValidationService) {}

  /**
   * GET /glass-validations/dashboard
   * Dashboard z statystykami walidacji
   */
  async getDashboard(_request: FastifyRequest, reply: FastifyReply) {
    const dashboard = await this.service.getDashboard();
    return reply.send(dashboard);
  }

  /**
   * GET /glass-validations/order/:orderNumber
   * Walidacje dla konkretnego zlecenia
   */
  async getByOrderNumber(
    request: FastifyRequest<{ Params: { orderNumber: string } }>,
    reply: FastifyReply
  ) {
    const { orderNumber } = glassValidationOrderNumberParamsSchema.parse(request.params);
    const validations = await this.service.getByOrderNumber(orderNumber);
    return reply.send(validations);
  }

  /**
   * GET /glass-validations
   * Lista wszystkich walidacji z filtrami
   */
  async getAll(
    request: FastifyRequest<{ Querystring: GlassValidationFilters }>,
    reply: FastifyReply
  ) {
    const validated = glassValidationFiltersSchema.parse(request.query);
    const validations = await this.service.findAll(validated);
    return reply.send(validations);
  }

  /**
   * POST /glass-validations/:id/resolve
   * Rozwiąż walidację
   */
  async resolve(
    request: FastifyRequest<{
      Params: { id: string };
      Body: GlassValidationResolve;
    }>,
    reply: FastifyReply
  ) {
    const { id } = glassValidationIdParamsSchema.parse(request.params);
    const { resolvedBy, notes } = glassValidationResolveSchema.parse(request.body);

    const validation = await this.service.resolve(id, resolvedBy, notes);
    return reply.send(validation);
  }
}
