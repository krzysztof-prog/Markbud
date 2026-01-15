/**
 * OkucStock Handler - HTTP request handling for stock/inventory management
 * Zrefaktoryzowany: logika biznesowa przeniesiona do OkucStockService
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { OkucStockRepository } from '../../repositories/okuc/OkucStockRepository.js';
import { OkucStockService } from '../../services/okuc/OkucStockService.js';
import { updateStockSchema, stockQueryFiltersSchema, adjustStockRequestSchema, importStockSchema } from '../../validators/okuc.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { z } from 'zod';

// Schema dla walidacji ID z params
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(val => parseInt(val, 10)),
});

const articleIdParamSchema = z.object({
  articleId: z.string().regex(/^\d+$/, 'Invalid article ID format').transform(val => parseInt(val, 10)),
});

const repository = new OkucStockRepository(prisma);
const service = new OkucStockService(repository);

export const okucStockHandler = {
  /**
   * GET /api/okuc/stock
   * List all stock with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const filters = stockQueryFiltersSchema.parse(request.query);

    const stocks = await service.getAllStock(filters);
    return reply.status(200).send(stocks);
  },

  /**
   * GET /api/okuc/stock/:id
   * Get stock by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params);

    const stock = await service.getStockById(id);
    return reply.status(200).send(stock);
  },

  /**
   * GET /api/okuc/stock/by-article/:articleId
   * Get stock by article ID and warehouse type
   * Query params: warehouseType, subWarehouse
   */
  async getByArticle(request: FastifyRequest<{ Params: { articleId: string } }>, reply: FastifyReply) {
    const { articleId } = articleIdParamSchema.parse(request.params);

    const querySchema = z.object({
      warehouseType: z.string().min(1, 'warehouseType is required'),
      subWarehouse: z.string().optional(),
    });
    const { warehouseType, subWarehouse } = querySchema.parse(request.query);

    const stock = await service.getStockByArticle(articleId, warehouseType, subWarehouse);
    return reply.status(200).send(stock);
  },

  /**
   * PATCH /api/okuc/stock/:id
   * Update stock quantity (with optimistic locking)
   */
  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params);
    const validated = updateStockSchema.parse(request.body);

    // Extract userId from auth (assuming it's in request.user)
    const rawUserId = (request as AuthenticatedRequest).user?.userId;
    if (!rawUserId) {
      return reply.status(401).send({ error: 'User not authenticated' });
    }
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;

    const stock = await service.updateStock(id, validated, userId);
    return reply.status(200).send(stock);
  },

  /**
   * POST /api/okuc/stock/adjust
   * Adjust stock quantity (add/subtract)
   */
  async adjust(request: FastifyRequest, reply: FastifyReply) {
    const { stockId, quantity, version } = adjustStockRequestSchema.parse(request.body);

    // Extract userId from auth
    const rawUserId = (request as AuthenticatedRequest).user?.userId;
    if (!rawUserId) {
      return reply.status(401).send({ error: 'User not authenticated' });
    }
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;

    const stock = await service.adjustStockQuantity(stockId, quantity, version, userId);
    return reply.status(200).send(stock);
  },

  /**
   * GET /api/okuc/stock/summary
   * Get stock summary grouped by warehouse
   */
  async summary(request: FastifyRequest, reply: FastifyReply) {
    const { warehouseType } = request.query as {
      warehouseType?: string;
    };

    const summary = await service.getStockSummary(warehouseType);
    return reply.status(200).send(summary);
  },

  /**
   * GET /api/okuc/stock/below-minimum
   * Get stock items below minimum level
   */
  async belowMinimum(request: FastifyRequest, reply: FastifyReply) {
    const { warehouseType } = request.query as {
      warehouseType?: string;
    };

    const stocks = await service.getStockBelowMinimum(warehouseType);
    return reply.status(200).send(stocks);
  },

  /**
   * POST /api/okuc/stock/import/preview
   * Preview stock import from CSV file
   * Format: Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
   */
  async importPreview(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'Brak pliku CSV' });
    }

    const buffer = await data.toBuffer();
    let csvContent = buffer.toString('utf-8');

    // Remove BOM if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    const results = await service.previewImport(csvContent);
    return reply.status(200).send(results);
  },

  /**
   * POST /api/okuc/stock/import
   * Import stock with conflict resolution
   */
  async importStock(request: FastifyRequest, reply: FastifyReply) {
    const { items, conflictResolution, selectedConflicts } = importStockSchema.parse(request.body);

    const rawUserId = (request as AuthenticatedRequest).user?.userId;
    if (!rawUserId) {
      return reply.status(401).send({ error: 'Uzytkownik nie zalogowany' });
    }
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;

    const results = await service.importStock(items, conflictResolution, selectedConflicts, userId);
    return reply.status(200).send(results);
  },

  /**
   * GET /api/okuc/stock/export
   * Export stock to CSV (semicolon separated for Polish Excel)
   */
  async exportCsv(request: FastifyRequest, reply: FastifyReply) {
    const { warehouseType, belowMin } = request.query as {
      warehouseType?: string;
      belowMin?: string;
    };

    const filters = {
      warehouseType,
      belowMin: belowMin !== undefined ? belowMin === 'true' : undefined,
    };

    const csv = await service.exportStockToCsv(filters);

    // Generuj nazwe pliku z data
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `stan-magazynu-okuc-${dateStr}.csv`;

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);

    // BOM dla poprawnego kodowania polskich znakow w Excel
    return reply.send('\uFEFF' + csv);
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

    const history = await service.getStockHistory(filters);
    return reply.status(200).send(history);
  },
};
