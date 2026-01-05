/**
 * OkucArticle Handler - HTTP request handling for article management
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { OkucArticleRepository } from '../../repositories/okuc/OkucArticleRepository.js';
import {
  createArticleSchema,
  updateArticleSchema,
  type CreateArticleInput,
  type UpdateArticleInput,
} from '../../validators/okuc.js';

const repository = new OkucArticleRepository(prisma);

export const okucArticleHandler = {
  /**
   * GET /api/okuc/articles
   * List all articles with optional filters
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { usedInPvc, usedInAlu, orderClass, sizeClass, isActive } = request.query as any;

      const filters = {
        usedInPvc: usedInPvc !== undefined ? usedInPvc === 'true' : undefined,
        usedInAlu: usedInAlu !== undefined ? usedInAlu === 'true' : undefined,
        orderClass,
        sizeClass,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      };

      const articles = await repository.findAll(filters);

      return reply.status(200).send(articles);
    } catch (error) {
      logger.error('Failed to list articles', { error });
      return reply.status(500).send({ error: 'Failed to list articles' });
    }
  },

  /**
   * GET /api/okuc/articles/:id
   * Get article by ID
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const article = await repository.findById(id);
      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      return reply.status(200).send(article);
    } catch (error) {
      logger.error('Failed to get article by ID', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to get article' });
    }
  },

  /**
   * GET /api/okuc/articles/by-article-id/:articleId
   * Get article by articleId (e.g., "A123")
   */
  async getByArticleId(request: FastifyRequest<{ Params: { articleId: string } }>, reply: FastifyReply) {
    try {
      const { articleId } = request.params;

      const article = await repository.findByArticleId(articleId);
      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      return reply.status(200).send(article);
    } catch (error) {
      logger.error('Failed to get article by articleId', { error, articleId: request.params.articleId });
      return reply.status(500).send({ error: 'Failed to get article' });
    }
  },

  /**
   * POST /api/okuc/articles
   * Create a new article
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const validated = createArticleSchema.parse(request.body);

      const article = await repository.create(validated as CreateArticleInput);

      return reply.status(201).send(article);
    } catch (error) {
      logger.error('Failed to create article', { error });
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation error', details: error });
      }
      return reply.status(500).send({ error: 'Failed to create article' });
    }
  },

  /**
   * PATCH /api/okuc/articles/:id
   * Update an article
   */
  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const validated = updateArticleSchema.parse(request.body);

      const article = await repository.update(id, validated as UpdateArticleInput);
      if (!article) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      return reply.status(200).send(article);
    } catch (error) {
      logger.error('Failed to update article', { error, id: request.params.id });
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation error', details: error });
      }
      return reply.status(500).send({ error: 'Failed to update article' });
    }
  },

  /**
   * DELETE /api/okuc/articles/:id
   * Delete an article
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const deleted = await repository.delete(id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Article not found' });
      }

      return reply.status(204).send();
    } catch (error) {
      logger.error('Failed to delete article', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to delete article' });
    }
  },

  /**
   * POST /api/okuc/articles/:id/aliases
   * Add an alias to an article
   */
  async addAlias(request: FastifyRequest<{ Params: { id: string }; Body: { aliasNumber: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const { aliasNumber } = request.body;
      if (!aliasNumber || typeof aliasNumber !== 'string') {
        return reply.status(400).send({ error: 'aliasNumber is required' });
      }

      const alias = await repository.addAlias(id, aliasNumber);

      return reply.status(201).send(alias);
    } catch (error) {
      logger.error('Failed to add alias', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to add alias' });
    }
  },

  /**
   * GET /api/okuc/articles/:id/aliases
   * Get all aliases for an article
   */
  async getAliases(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid article ID' });
      }

      const aliases = await repository.getAliases(id);

      return reply.status(200).send(aliases);
    } catch (error) {
      logger.error('Failed to get aliases', { error, id: request.params.id });
      return reply.status(500).send({ error: 'Failed to get aliases' });
    }
  },

  /**
   * POST /api/okuc/articles/import
   * Import articles from CSV file
   */
  async importCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku CSV' });
      }

      const buffer = await data.toBuffer();
      const csvContent = buffer.toString('utf-8');

      // Parse CSV - format: articleId,name,description,usedInPvc,usedInAlu,orderClass,sizeClass,orderUnit,packagingSizes,preferredSize,supplierCode,leadTimeDays,safetyDays
      const lines = csvContent.split('\n').filter(line => line.trim());
      // Skip header row
      const _headers = lines[0].split(',').map(h => h.trim());

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string; articleId?: string }>,
      };

      // Process each row (skip header)
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());

        try {
          const articleData = {
            articleId: values[0],
            name: values[1],
            description: values[2] || undefined,
            usedInPvc: values[3]?.toLowerCase() === 'true',
            usedInAlu: values[4]?.toLowerCase() === 'true',
            orderClass: values[5] as 'typical' | 'atypical',
            sizeClass: values[6] as 'standard' | 'gabarat',
            orderUnit: values[7] as 'piece' | 'pack',
            packagingSizes: values[8] || undefined,
            preferredSize: values[9] ? parseInt(values[9], 10) : undefined,
            supplierCode: values[10] || undefined,
            leadTimeDays: values[11] ? parseInt(values[11], 10) : 14,
            safetyDays: values[12] ? parseInt(values[12], 10) : 3,
          };

          // Validate with Zod
          const validated = createArticleSchema.parse(articleData);

          // Check if article already exists
          const existing = await repository.findByArticleId(validated.articleId);

          if (existing) {
            // Update existing article
            await repository.update(existing.id, validated);
          } else {
            // Create new article
            await repository.create(validated as CreateArticleInput);
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            articleId: values[0],
          });
          logger.warn('Failed to import article row', { row: i + 1, error, values });
        }
      }

      return reply.status(200).send(results);
    } catch (error) {
      logger.error('Failed to import articles CSV', { error });
      return reply.status(500).send({ error: 'Failed to import articles' });
    }
  },

  /**
   * GET /api/okuc/articles/export
   * Export articles to CSV file
   */
  async exportCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { warehouseType } = request.query as { warehouseType?: 'pvc' | 'alu' };

      const filters = warehouseType === 'pvc'
        ? { usedInPvc: true }
        : warehouseType === 'alu'
        ? { usedInAlu: true }
        : {};

      const articles = await repository.findAll(filters);

      // Generate CSV
      const headers = [
        'articleId',
        'name',
        'description',
        'usedInPvc',
        'usedInAlu',
        'orderClass',
        'sizeClass',
        'orderUnit',
        'packagingSizes',
        'preferredSize',
        'supplierCode',
        'leadTimeDays',
        'safetyDays',
        'isActive',
      ];

      const rows = articles.map(article => [
        article.articleId,
        article.name,
        article.description || '',
        article.usedInPvc,
        article.usedInAlu,
        article.orderClass,
        article.sizeClass,
        article.orderUnit,
        article.packagingSizes || '',
        article.preferredSize || '',
        article.supplierCode || '',
        article.leadTimeDays,
        article.safetyDays,
        true, // isActive is always true for non-deleted articles
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `okuc_articles_${warehouseType || 'all'}_${timestamp}.csv`;

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(csv);
    } catch (error) {
      logger.error('Failed to export articles CSV', { error });
      return reply.status(500).send({ error: 'Failed to export articles' });
    }
  },
};
