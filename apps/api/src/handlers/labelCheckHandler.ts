/**
 * Label Check Handler - Request/Response handling
 *
 * Handler dla modułu sprawdzania etykiet.
 * Deleguje logikę biznesową do LabelCheckService.
 *
 * Endpointy:
 * - GET /label-checks - lista sprawdzeń z filtrami i paginacją
 * - GET /label-checks/:id - szczegóły sprawdzenia
 * - POST /label-checks - uruchom sprawdzanie etykiet dla dostawy
 * - DELETE /label-checks/:id - soft delete sprawdzenia
 * - GET /label-checks/:id/export - eksport do Excel
 * - GET /label-checks/delivery/:id - najnowsze sprawdzenie dla dostawy
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { LabelCheckService } from '../services/label-check/LabelCheckService.js';
import { LabelCheckExportService } from '../services/label-check/LabelCheckExportService.js';
import {
  createLabelCheckSchema,
  labelCheckIdSchema,
  labelCheckQuerySchema,
  type LabelCheckQueryParams,
  type CreateLabelCheckInput,
} from '../validators/label-check.js';

export class LabelCheckHandler {
  private exportService: LabelCheckExportService;

  constructor(
    private service: LabelCheckService,
    exportService?: LabelCheckExportService
  ) {
    this.exportService = exportService ?? new LabelCheckExportService();
  }

  /**
   * GET /label-checks
   * Lista sprawdzeń z filtrami i paginacją
   */
  async getAll(
    request: FastifyRequest<{ Querystring: LabelCheckQueryParams }>,
    reply: FastifyReply
  ) {
    const query = labelCheckQuerySchema.parse(request.query);

    // Konwersja query params na filtry i paginację
    const filters = {
      status: query.status,
      deliveryId: query.deliveryId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    const pagination = {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    };

    const result = await this.service.getAll(filters, pagination);
    return reply.send(result);
  }

  /**
   * GET /label-checks/:id
   * Szczegóły sprawdzenia po ID
   */
  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = labelCheckIdSchema.parse(request.params);
    const result = await this.service.getById(id);

    if (!result) {
      return reply.status(404).send({ error: 'Sprawdzenie nie znalezione' });
    }

    return reply.send(result);
  }

  /**
   * POST /label-checks
   * Uruchom sprawdzanie etykiet dla dostawy
   */
  async create(
    request: FastifyRequest<{ Body: CreateLabelCheckInput }>,
    reply: FastifyReply
  ) {
    const { deliveryId } = createLabelCheckSchema.parse(request.body);
    const result = await this.service.checkDelivery(deliveryId);
    return reply.status(201).send(result);
  }

  /**
   * DELETE /label-checks/:id
   * Soft delete sprawdzenia
   */
  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = labelCheckIdSchema.parse(request.params);
    await this.service.delete(id);
    return reply.status(204).send();
  }

  /**
   * GET /label-checks/:id/export
   * Eksport sprawdzenia do Excel
   */
  async exportExcel(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = labelCheckIdSchema.parse(request.params);
    const labelCheck = await this.service.getById(id);

    if (!labelCheck) {
      return reply.status(404).send({ error: 'Sprawdzenie nie znalezione' });
    }

    const buffer = await this.exportService.exportToExcel(labelCheck);
    const filename = this.exportService.generateFilename(labelCheck);

    return reply
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      .header('Content-Disposition', `attachment; filename="${filename}.xlsx"`)
      .send(buffer);
  }

  /**
   * GET /label-checks/delivery/:id
   * Najnowsze sprawdzenie dla dostawy
   */
  async getLatestForDelivery(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = labelCheckIdSchema.parse(request.params);
    const result = await this.service.getLatestForDelivery(id);
    return reply.send(result);
  }

  /**
   * GET /label-checks/statistics
   * Statystyki wszystkich sprawdzeń
   */
  async getStatistics(_request: FastifyRequest, reply: FastifyReply) {
    const stats = await this.service.getStatistics();
    return reply.send(stats);
  }

  /**
   * GET /label-checks/delivery/:id/summary
   * Podsumowanie sprawdzenia dla dostawy
   */
  async getDeliverySummary(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = labelCheckIdSchema.parse(request.params);
    const summary = await this.service.getDeliveryCheckSummary(id);
    return reply.send(summary);
  }
}

// =============================================================================
// Standalone functions dla routes które ich potrzebują (np. deliveries.ts)
// =============================================================================

/**
 * Standalone function do pobierania najnowszego sprawdzenia dla dostawy
 * Używana przez deliveries route
 */
export const getLatestForDelivery = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const service = new LabelCheckService(request.server.prisma);
  const handler = new LabelCheckHandler(service);
  return handler.getLatestForDelivery(request, reply);
};

/**
 * Standalone function do pobierania podsumowania dla dostawy
 * Używana przez deliveries route
 */
export const getDeliverySummary = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const service = new LabelCheckService(request.server.prisma);
  const handler = new LabelCheckHandler(service);
  return handler.getDeliverySummary(request, reply);
};
