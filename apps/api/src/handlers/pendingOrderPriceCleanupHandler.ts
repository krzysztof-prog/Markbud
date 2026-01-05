/**
 * PendingOrderPrice Cleanup Handler - HTTP layer
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { PendingOrderPriceCleanupService } from '../services/pendingOrderPriceCleanupService.js';
import { getPendingPriceCleanupScheduler } from '../services/pendingOrderPriceCleanupScheduler.js';
import { prisma } from '../index.js';
import { logger } from '../utils/logger.js';
import { InternalServerError } from '../utils/errors.js';
import { CLEANUP_CONFIG } from '../config/cleanup.js';

/**
 * Get cleanup statistics
 */
export async function getCleanupStatistics(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const service = new PendingOrderPriceCleanupService(prisma, CLEANUP_CONFIG);
  const stats = await service.getStatistics();

  return reply.send({
    success: true,
    data: stats,
  });
}

/**
 * Get cleanup configuration
 */
export async function getCleanupConfig(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const service = new PendingOrderPriceCleanupService(prisma, CLEANUP_CONFIG);
  const config = service.getConfig();

  return reply.send({
    success: true,
    data: config,
  });
}

/**
 * Get scheduler status
 */
export async function getSchedulerStatus(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const scheduler = getPendingPriceCleanupScheduler(prisma);
  const status = scheduler.getStatus();

  return reply.send({
    success: true,
    data: status,
  });
}

/**
 * Manually trigger cleanup
 */
export async function triggerManualCleanup(
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.info('[CleanupHandler] Manual cleanup triggered by user');

  const service = new PendingOrderPriceCleanupService(prisma, CLEANUP_CONFIG);
  const result = await service.runCleanup();

  if (!result.success) {
    throw new InternalServerError(`Czyszczenie nie powiodło się: ${result.errors?.join(', ') || 'Nieznany błąd'}`);
  }

  return reply.send({
    success: true,
    message: 'Czyszczenie zakończone pomyślnie',
    data: result,
  });
}

/**
 * Get all pending prices (for manual review)
 */
export async function getAllPendingPrices(
  request: FastifyRequest<{
    Querystring: { status?: string };
  }>,
  reply: FastifyReply
) {
  const { status } = request.query;

  const service = new PendingOrderPriceCleanupService(prisma, CLEANUP_CONFIG);
  const prices = await service.getAllPendingPrices(status);

  return reply.send({
    success: true,
    data: prices,
    count: prices.length,
  });
}
