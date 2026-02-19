/**
 * PendingOrderPrice Cleanup Handler - HTTP layer
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { PendingOrderPriceCleanupService } from '../services/pendingOrderPriceCleanupService.js';
import { PendingOrderPriceRematchService } from '../services/pendingOrderPriceRematchService.js';
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

/**
 * Trigger re-matching of all pending prices to existing orders
 */
export async function triggerRematch(
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.info('[RematchHandler] Manual rematch triggered by user');

  const service = new PendingOrderPriceRematchService(prisma);
  const result = await service.rematchAll();

  return reply.send({
    success: true,
    message: `Rematch zakończony: ${result.matched} dopasowanych, ${result.skipped} pominiętych, ${result.noMatch} bez dopasowania`,
    data: result,
  });
}

/**
 * Force reimport specific PDF files (bypass import system deduplication)
 */
export async function triggerReimport(
  request: FastifyRequest<{
    Body: { filepaths: string[] };
  }>,
  reply: FastifyReply
) {
  const { filepaths } = request.body;

  if (!filepaths || !Array.isArray(filepaths) || filepaths.length === 0) {
    return reply.status(400).send({
      success: false,
      message: 'Wymagana tablica "filepaths" z co najmniej jedną ścieżką do PDF',
    });
  }

  logger.info(`[ReimportHandler] Force reimport triggered for ${filepaths.length} files`);

  const service = new PendingOrderPriceRematchService(prisma);
  const result = await service.reimportPdfs(filepaths);

  return reply.send({
    success: true,
    message: `Reimport: ${result.parsed.length} sparsowanych, ${result.errors.length} błędów, rematch: ${result.rematch.matched} dopasowanych`,
    data: result,
  });
}
