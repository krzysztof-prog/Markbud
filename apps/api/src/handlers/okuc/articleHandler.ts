/**
 * OkucArticle Handler - HTTP request handling for article management
 * Zrefaktoryzowany: logika biznesowa przeniesiona do OkucArticleService
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { OkucArticleRepository } from '../../repositories/okuc/OkucArticleRepository.js';
import { OkucArticleService } from '../../services/okuc/OkucArticleService.js';
import {
  createArticleSchema,
  updateArticleSchema,
  type CreateArticleInput,
  type UpdateArticleInput,
} from '../../validators/okuc.js';
import { getTodayWarsaw } from '../../utils/date-helpers.js';

const repository = new OkucArticleRepository(prisma);
const service = new OkucArticleService(repository);

export const okucArticleHandler = {
  /**
   * GET /api/okuc/articles
   * List all articles with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { usedInPvc, usedInAlu, orderClass, sizeClass, isActive } = request.query as {
      usedInPvc?: string;
      usedInAlu?: string;
      orderClass?: string;
      sizeClass?: string;
      isActive?: string;
    };

    const filters = {
      usedInPvc: usedInPvc !== undefined ? usedInPvc === 'true' : undefined,
      usedInAlu: usedInAlu !== undefined ? usedInAlu === 'true' : undefined,
      orderClass,
      sizeClass,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };

    const articles = await service.getAllArticles(filters);
    return reply.status(200).send(articles);
  },

  /**
   * GET /api/okuc/articles/:id
   * Get article by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid article ID' });
    }

    const article = await service.getArticleById(id);
    return reply.status(200).send(article);
  },

  /**
   * GET /api/okuc/articles/by-article-id/:articleId
   * Get article by articleId (e.g., "A123")
   */
  async getByArticleId(request: FastifyRequest<{ Params: { articleId: string } }>, reply: FastifyReply) {
    const { articleId } = request.params;
    const article = await service.getArticleByArticleId(articleId);
    return reply.status(200).send(article);
  },

  /**
   * POST /api/okuc/articles
   * Create a new article
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const validated = createArticleSchema.parse(request.body);
    const article = await service.createArticle(validated as CreateArticleInput);
    return reply.status(201).send(article);
  },

  /**
   * PATCH /api/okuc/articles/:id
   * Update an article
   */
  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid article ID' });
    }

    const validated = updateArticleSchema.parse(request.body);
    const article = await service.updateArticle(id, validated as UpdateArticleInput);
    return reply.status(200).send(article);
  },

  /**
   * DELETE /api/okuc/articles/:id
   * Delete an article
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid article ID' });
    }

    await service.deleteArticle(id);
    return reply.status(204).send();
  },

  /**
   * POST /api/okuc/articles/:id/aliases
   * Add an alias to an article
   */
  async addAlias(request: FastifyRequest<{ Params: { id: string }; Body: { aliasNumber: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid article ID' });
    }

    const { aliasNumber } = request.body;
    if (!aliasNumber || typeof aliasNumber !== 'string') {
      return reply.status(400).send({ error: 'aliasNumber is required' });
    }

    const alias = await service.addAlias(id, aliasNumber);
    return reply.status(201).send(alias);
  },

  /**
   * GET /api/okuc/articles/:id/aliases
   * Get all aliases for an article
   */
  async getAliases(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid article ID' });
    }

    const aliases = await service.getAliases(id);
    return reply.status(200).send(aliases);
  },

  /**
   * POST /api/okuc/articles/import/preview
   * Preview CSV import - parse and detect conflicts
   * Format CSV: Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn
   */
  async importPreview(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'Brak pliku CSV' });
    }

    const buffer = await data.toBuffer();
    // Support both UTF-8 and Windows-1250 encoding
    let csvContent = buffer.toString('utf-8');
    // Remove BOM if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    const results = await service.previewImport(csvContent);
    return reply.status(200).send(results);
  },

  /**
   * POST /api/okuc/articles/import
   * Import articles with conflict resolution
   */
  async importArticles(request: FastifyRequest, reply: FastifyReply) {
    // Wyodrebnij dane z body (walidowane przez schema w route)
    const body = request.body as {
      items: Array<{
        articleId: string;
        name: string;
        usedInPvc?: boolean;
        usedInAlu?: boolean;
        orderClass?: 'typical' | 'atypical';
        sizeClass?: 'standard' | 'gabarat';
        warehouseType?: string;
      }>;
      conflictResolution: 'skip' | 'overwrite' | 'selective';
      selectedConflicts?: string[];
    };
    const { items, conflictResolution, selectedConflicts = [] } = body;

    const results = await service.importArticles(items, conflictResolution, selectedConflicts);
    return reply.status(200).send(results);
  },

  /**
   * @deprecated Use importPreview and importArticles instead
   * POST /api/okuc/articles/import (legacy - CSV file upload)
   * Import articles from CSV file
   */
  async importCsv(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'Brak pliku CSV' });
    }

    const buffer = await data.toBuffer();
    const csvContent = buffer.toString('utf-8');

    const results = await service.importCsvLegacy(csvContent);
    return reply.status(200).send(results);
  },

  /**
   * GET /api/okuc/articles/pending-review
   * List all articles awaiting orderClass verification
   */
  async listPendingReview(_request: FastifyRequest, reply: FastifyReply) {
    const articles = await service.getArticlesPendingReview();
    return reply.status(200).send(articles);
  },

  /**
   * POST /api/okuc/articles/batch-update-order-class
   * Update orderClass for multiple articles at once
   * Body: { articles: [{ id: number, orderClass: 'typical' | 'atypical' }] }
   */
  async batchUpdateOrderClass(
    request: FastifyRequest<{
      Body: { articles: Array<{ id: number; orderClass: 'typical' | 'atypical' }> };
    }>,
    reply: FastifyReply
  ) {
    const { articles } = request.body;
    const results = await service.batchUpdateOrderClass(articles);
    return reply.status(200).send(results);
  },

  /**
   * GET /api/okuc/articles/export
   * Export articles to CSV file
   */
  async exportCsv(request: FastifyRequest, reply: FastifyReply) {
    const { warehouseType } = request.query as { warehouseType?: 'pvc' | 'alu' };

    const csv = await service.exportArticlesToCsv(warehouseType);

    const timestamp = getTodayWarsaw();
    const filename = `okuc_articles_${warehouseType || 'all'}_${timestamp}.csv`;

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csv);
  },
};
