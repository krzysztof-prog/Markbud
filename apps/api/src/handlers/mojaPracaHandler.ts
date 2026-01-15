import type { FastifyReply } from 'fastify';
import { MojaPracaService } from '../services/mojaPracaService.js';
import { prisma } from '../utils/prisma.js';
import {
  conflictsQuerySchema,
  conflictIdParamsSchema,
  conflictResolutionSchema,
  dateQuerySchema,
} from '../validators/moja-praca.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

// Pomocnik do parsowania daty
function parseDate(dateStr?: string): Date {
  if (!dateStr) {
    return new Date();
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new ValidationError('Nieprawidłowy format daty');
  }
  return date;
}

// Pomocnik do pobierania userId jako number
function getUserId(request: AuthenticatedRequest): number {
  const userId = request.user?.userId;
  if (!userId) {
    throw new ForbiddenError('Brak autoryzacji');
  }
  return typeof userId === 'string' ? parseInt(userId, 10) : userId;
}

export const mojaPracaHandler = {
  /**
   * GET /api/moja-praca/conflicts
   * Lista konfliktów dla aktualnego użytkownika
   */
  async getConflicts(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = getUserId(request);

    const query = conflictsQuerySchema.parse(request.query);
    const service = new MojaPracaService(prisma);
    const conflicts = await service.getConflicts(userId, query.status);

    return reply.send(conflicts);
  },

  /**
   * GET /api/moja-praca/conflicts/count
   * Liczba konfliktów dla badge
   */
  async getConflictsCount(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = getUserId(request);

    const service = new MojaPracaService(prisma);
    const count = await service.countConflicts(userId);

    return reply.send(count);
  },

  /**
   * GET /api/moja-praca/conflicts/:id
   * Szczegóły konfliktu z danymi bazowego zlecenia
   */
  async getConflictDetail(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = getUserId(request);

    const params = conflictIdParamsSchema.parse(request.params);
    const conflictId = parseInt(params.id, 10);

    const service = new MojaPracaService(prisma);
    const conflict = await service.getConflictDetail(conflictId, userId);

    if (!conflict) {
      throw new NotFoundError('Konflikt nie został znaleziony');
    }

    // Parsuj parsedData JSON
    let parsedData = null;
    try {
      parsedData = JSON.parse(conflict.parsedData);
    } catch {
      // Ignoruj błędy parsowania
    }

    return reply.send({
      ...conflict,
      createdAt: conflict.createdAt.toISOString(),
      parsedData,
      baseOrder: {
        ...conflict.baseOrder,
        createdAt: conflict.baseOrder.createdAt.toISOString(),
      },
    });
  },

  /**
   * POST /api/moja-praca/conflicts/:id/resolve
   * Rozwiąż konflikt
   */
  async resolveConflict(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = getUserId(request);

    const params = conflictIdParamsSchema.parse(request.params);
    const conflictId = parseInt(params.id, 10);
    const body = conflictResolutionSchema.parse(request.body);

    const service = new MojaPracaService(prisma);
    const result = await service.resolveConflict(conflictId, userId, body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: result.message,
      });
    }

    return reply.send(result);
  },

  /**
   * GET /api/moja-praca/orders
   * Zlecenia użytkownika na dany dzień
   */
  async getOrders(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = getUserId(request);

    const query = dateQuerySchema.parse(request.query);
    const date = parseDate(query.date);

    const service = new MojaPracaService(prisma);
    const orders = await service.getOrdersForUser(userId, date);

    return reply.send(orders);
  },

  /**
   * GET /api/moja-praca/deliveries
   * Dostawy zawierające zlecenia użytkownika
   */
  async getDeliveries(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = getUserId(request);

    const query = dateQuerySchema.parse(request.query);
    const date = parseDate(query.date);

    const service = new MojaPracaService(prisma);
    const deliveries = await service.getDeliveriesForUser(userId, date);

    return reply.send(deliveries);
  },

  /**
   * GET /api/moja-praca/glass-orders
   * Zamówienia szyb dla zleceń użytkownika
   */
  async getGlassOrders(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = getUserId(request);

    const query = dateQuerySchema.parse(request.query);
    const date = parseDate(query.date);

    const service = new MojaPracaService(prisma);
    const glassOrders = await service.getGlassOrdersForUser(userId, date);

    return reply.send(glassOrders);
  },

  /**
   * GET /api/moja-praca/summary
   * Podsumowanie dnia dla użytkownika
   */
  async getDaySummary(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = getUserId(request);

    const query = dateQuerySchema.parse(request.query);
    const date = parseDate(query.date);

    const service = new MojaPracaService(prisma);
    const summary = await service.getDaySummary(userId, date);

    return reply.send(summary);
  },
};
