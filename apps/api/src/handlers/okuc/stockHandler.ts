/**
 * OkucStock Handler - HTTP request handling for stock/inventory management
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { OkucStockRepository } from '../../repositories/okuc/OkucStockRepository.js';
import {
  updateStockSchema,
  type UpdateStockInput,
} from '../../validators/okuc.js';

const repository = new OkucStockRepository(prisma);

export const okucStockHandler = {
  /**
   * GET /api/okuc/stock
   * List all stock with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { articleId, warehouseType, subWarehouse, belowMin } = request.query as any;

      const filters = {
        articleId: articleId ? parseInt(articleId, 10) : undefined,
        warehouseType,
        subWarehouse,
        belowMin: belowMin !== undefined ? belowMin === 'true' : undefined,
      };

      const stocks = await repository.findAll(filters);

      return reply.status(200).send(stocks);
    } catch (error) {
      logger.error('Failed to list stock', { error });
      return reply.status(500).send({ error: 'Failed to list stock' });
    }
  },

  /**
   * GET /api/okuc/stock/:id
   * Get stock by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid stock ID' });
      }

      const stock = await repository.findById(id);
      if (!stock) {
        return reply.status(404).send({ error: 'Stock not found' });
      }

      return reply.status(200).send(stock);
    } catch (error) {
      logger.error('Failed to get stock by ID', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to get stock' });
    }
  },

  /**
   * GET /api/okuc/stock/by-article/:articleId
   * Get stock by article ID and warehouse type
   * Query params: warehouseType, subWarehouse
   */
  async getByArticle(request: FastifyRequest<{ Params: { articleId: string } }>, reply: FastifyReply) {
    try {
      const articleId = parseInt(request.params.articleId, 10);
      if (isNaN(articleId)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const { warehouseType, subWarehouse } = request.query as any;
      if (!warehouseType) {
        return reply.status(400).send({ error: 'warehouseType is required' });
      }

      const stock = await repository.findByArticle(articleId, warehouseType, subWarehouse);
      if (!stock) {
        return reply.status(404).send({ error: 'Stock not found' });
      }

      return reply.status(200).send(stock);
    } catch (error) {
      logger.error('Failed to get stock by article', { error, articleId: request.params.articleId });
      return reply.status(500).send({ error: 'Failed to get stock' });
    }
  },

  /**
   * PATCH /api/okuc/stock/:id
   * Update stock quantity (with optimistic locking)
   */
  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid stock ID' });
      }

      const validated = updateStockSchema.parse(request.body);

      // Extract userId from auth (assuming it's in request.user)
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'User not authenticated' });
      }

      // Map validated data to Prisma fields
      const updateData: Partial<{ currentQuantity?: number; reservedQty?: number; minStock?: number; maxStock?: number; version?: number }> = {
        currentQuantity: validated.quantity,
        version: validated.expectedVersion,
      };

      const stock = await repository.update(id, updateData, userId);
      if (!stock) {
        return reply.status(404).send({ error: 'Stock not found or version mismatch' });
      }

      return reply.status(200).send(stock);
    } catch (error) {
      logger.error('Failed to update stock', { error, id: request.params.id });
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation error', details: error });
      }
      return reply.status(500).send({ error: 'Failed to update stock' });
    }
  },

  /**
   * POST /api/okuc/stock/adjust
   * Adjust stock quantity (add/subtract)
   */
  async adjust(request: FastifyRequest<{ Body: { stockId: number; quantity: number; version: number } }>, reply: FastifyReply) {
    try {
      const { stockId, quantity, version } = request.body;

      if (!stockId || quantity === undefined || version === undefined) {
        return reply.status(400).send({ error: 'stockId, quantity, and version are required' });
      }

      // Extract userId from auth
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'User not authenticated' });
      }

      const stock = await repository.adjustQuantity(stockId, quantity, version, userId);
      if (!stock) {
        return reply.status(404).send({ error: 'Stock not found or version mismatch' });
      }

      return reply.status(200).send(stock);
    } catch (error) {
      logger.error('Failed to adjust stock', { error });
      return reply.status(500).send({ error: 'Failed to adjust stock' });
    }
  },

  /**
   * GET /api/okuc/stock/summary
   * Get stock summary grouped by warehouse
   */
  async summary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { warehouseType } = request.query as any;

      const summary = await repository.getSummary(warehouseType);

      return reply.status(200).send(summary);
    } catch (error) {
      logger.error('Failed to get stock summary', { error });
      return reply.status(500).send({ error: 'Failed to get stock summary' });
    }
  },

  /**
   * GET /api/okuc/stock/below-minimum
   * Get stock items below minimum level
   */
  async belowMinimum(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { warehouseType } = request.query as any;

      const stocks = await repository.findBelowMinimum(warehouseType);

      return reply.status(200).send(stocks);
    } catch (error) {
      logger.error('Failed to get stock below minimum', { error });
      return reply.status(500).send({ error: 'Failed to get stock below minimum' });
    }
  },

  /**
   * GET /api/okuc/stock/history/:articleId
   * Get stock history for an article
   */
  async getHistory(
    request: FastifyRequest<{
      Params: { articleId: string };
      Querystring: {
        warehouseType?: string;
        subWarehouse?: string;
        eventType?: string;
        isManualEdit?: string;
        fromDate?: string;
        toDate?: string;
        recordedById?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const articleId = parseInt(request.params.articleId, 10);
      if (isNaN(articleId)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const { warehouseType, subWarehouse, eventType, isManualEdit, fromDate, toDate, recordedById } = request.query;

      const filters = {
        articleId,
        warehouseType,
        subWarehouse,
        eventType,
        isManualEdit: isManualEdit !== undefined ? isManualEdit === 'true' : undefined,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        recordedById: recordedById ? parseInt(recordedById, 10) : undefined,
      };

      const history = await repository.getHistory(filters);

      return reply.status(200).send(history);
    } catch (error) {
      logger.error('Failed to get stock history', { error, articleId: request.params.articleId });
      return reply.status(500).send({ error: 'Failed to get stock history' });
    }
  },
};
