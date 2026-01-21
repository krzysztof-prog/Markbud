/**
 * Warehouse Handler - HTTP request/response handling for warehouse endpoints
 * Part of the layered architecture: Routes → Handlers → Services → Repositories
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { WarehouseService } from '../services/warehouse/index.js';
import { WarehouseRepository } from '../repositories/WarehouseRepository.js';
import {
  colorIdParamSchema,
  profileColorParamsSchema,
  updateStockBodySchema,
  monthlyUpdateBodySchema,
  rollbackInventoryBodySchema,
  finalizeMonthBodySchema,
  historyQuerySchema,
  averageQuerySchema
} from '../validators/warehouse.js';
import { prisma } from '../index.js';

// Lazy singleton service instance
let warehouseService: WarehouseService | null = null;

function getService(): WarehouseService {
  if (!warehouseService) {
    const repository = new WarehouseRepository(prisma);
    warehouseService = new WarehouseService(repository);
  }
  return warehouseService;
}

/**
 * GET /:colorId - Get complete warehouse table data for a color
 */
export async function getColorData(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { colorId } = colorIdParamSchema.parse(request.params);
  const data = await getService().getColorWarehouseData(colorId);
  reply.send(data);
}

/**
 * PUT /:colorId/:profileId - Update warehouse stock for a specific profile/color
 */
export async function updateStock(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { colorId, profileId } = profileColorParamsSchema.parse(request.params);
  const body = updateStockBodySchema.parse(request.body);

  const updated = await getService().updateStock(
    colorId,
    profileId,
    body.currentStockBeams,
    body.userId
  );

  reply.send(updated);
}

/**
 * POST /monthly-update - Perform monthly inventory update
 */
export async function monthlyUpdate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = monthlyUpdateBodySchema.parse(request.body);

  const result = await getService().performMonthlyUpdate(
    body.colorId,
    body.updates,
    body.userId
  );

  reply.send(result);
}

/**
 * POST /rollback-inventory - Rollback last inventory count (24h window)
 */
export async function rollbackInventory(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = rollbackInventoryBodySchema.parse(request.body);

  const result = await getService().rollbackInventory(
    body.colorId,
    body.userId
  );

  reply.send(result);
}

/**
 * GET /shortages - Get all material shortages across all colors
 */
export async function getShortages(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const shortages = await getService().getAllShortages();
  reply.send(shortages);
}

/**
 * GET /:colorId/average - Get monthly average usage for profiles
 */
export async function getMonthlyAverage(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { colorId } = colorIdParamSchema.parse(request.params);
  const { months } = averageQuerySchema.parse(request.query);

  const averages = await getService().getMonthlyUsage(colorId, months);
  // Wrap response to match frontend AverageResponse type
  reply.send({
    averages,
    requestedMonths: months ?? 6,
  });
}

/**
 * GET /history/:colorId - Get warehouse history for a specific color
 */
export async function getHistoryByColor(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { colorId } = colorIdParamSchema.parse(request.params);
  const { limit } = historyQuerySchema.parse(request.query);

  const history = await getService().getHistoryByColor(colorId, limit);
  reply.send(history);
}

/**
 * GET /history - Get all warehouse history
 */
export async function getAllHistory(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { limit } = historyQuerySchema.parse(request.query);

  const history = await getService().getAllHistory(limit);
  reply.send(history);
}

/**
 * POST /finalize-month - Archive completed orders for a specific month
 */
export async function finalizeMonth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = finalizeMonthBodySchema.parse(request.body);

  const result = await getService().finalizeMonth(
    body.month,
    body.archive
  );

  reply.send(result);
}
