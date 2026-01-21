/**
 * Handler dla modułu Steel (wzmocnienia stalowe)
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { SteelService } from '../services/steelService.js';
import {
  createSteelSchema,
  updateSteelSchema,
  updateSteelOrdersSchema,
  updateSteelStockSchema,
} from '../validators/steel.js';
import { AppError } from '../utils/errors.js';

export class SteelHandler {
  constructor(private service: SteelService) {}

  /**
   * GET /api/steel - lista wszystkich stali
   */
  getAll = async (_request: FastifyRequest, reply: FastifyReply) => {
    const steels = await this.service.getAll();
    return reply.send(steels);
  };

  /**
   * GET /api/steel/:id - pojedyncza stal
   */
  getById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Nieprawidłowe ID', 400);
    }

    const steel = await this.service.getById(id);
    return reply.send(steel);
  };

  /**
   * POST /api/steel - dodaj nową stal
   */
  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = createSteelSchema.parse(request.body);
    const steel = await this.service.create(data);
    return reply.status(201).send(steel);
  };

  /**
   * PUT /api/steel/:id - aktualizuj stal
   */
  update = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Nieprawidłowe ID', 400);
    }

    const data = updateSteelSchema.parse(request.body);
    const steel = await this.service.update(id, data);
    return reply.send(steel);
  };

  /**
   * DELETE /api/steel/:id - usuń stal
   */
  delete = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Nieprawidłowe ID', 400);
    }

    await this.service.delete(id);
    return reply.status(204).send();
  };

  /**
   * PATCH /api/steel/update-orders - zmień kolejność stali
   */
  updateOrders = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = updateSteelOrdersSchema.parse(request.body);
    await this.service.updateOrders(data);
    return reply.send({ success: true });
  };

  /**
   * GET /api/steel/:id/stock - pobierz stan magazynowy
   */
  getStock = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Nieprawidłowe ID', 400);
    }

    const stock = await this.service.getStock(id);
    return reply.send(stock);
  };

  /**
   * PATCH /api/steel/:id/stock - aktualizuj stan magazynowy
   */
  updateStock = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Nieprawidłowe ID', 400);
    }

    const data = updateSteelStockSchema.parse(request.body);

    // Pobierz userId z request (jeśli dostępny z middleware auth)
    const userId = (request as unknown as { userId?: number }).userId;

    const stock = await this.service.updateStock(id, data, userId);
    return reply.send(stock);
  };

  /**
   * GET /api/steel/with-stock - lista stali z stanem magazynowym (dla widoku magazynu)
   */
  getAllWithStock = async (_request: FastifyRequest, reply: FastifyReply) => {
    const steels = await this.service.getAllWithStock();
    return reply.send(steels);
  };

  /**
   * GET /api/steel/history - historia zmian stanu magazynowego
   */
  getHistory = async (
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) => {
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
    const history = await this.service.getHistory(limit);
    return reply.send(history);
  };
}
