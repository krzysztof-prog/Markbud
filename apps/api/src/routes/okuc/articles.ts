/**
 * Okuc Article Routes - Article Management
 * Routes for managing hardware articles (artykuły okuć)
 */

import type { FastifyPluginAsync } from 'fastify';
import { verifyAuth } from '../../middleware/auth.js';
import { okucArticleHandler } from '../../handlers/okuc/articleHandler.js';

export const okucArticleRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication

  /**
   * GET /api/okuc/articles
   * List all articles with optional filters
   * Query params: usedInPvc, usedInAlu, orderClass, sizeClass, isActive
   */
  fastify.get('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'List all articles with optional filters',
      tags: ['okuc-articles'],
      querystring: {
        type: 'object',
        properties: {
          usedInPvc: { type: 'boolean' },
          usedInAlu: { type: 'boolean' },
          orderClass: { type: 'string', enum: ['typical', 'atypical'] },
          sizeClass: { type: 'string', enum: ['standard', 'gabarat'] },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, okucArticleHandler.list);

  /**
   * GET /api/okuc/articles/:id
   * Get article by ID
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get article by ID',
      tags: ['okuc-articles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, okucArticleHandler.getById);

  /**
   * GET /api/okuc/articles/by-article-id/:articleId
   * Get article by articleId (e.g., "A123")
   */
  fastify.get<{ Params: { articleId: string } }>('/by-article-id/:articleId', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get article by articleId',
      tags: ['okuc-articles'],
      params: {
        type: 'object',
        properties: {
          articleId: { type: 'string' },
        },
        required: ['articleId'],
      },
    },
  }, okucArticleHandler.getByArticleId);

  /**
   * POST /api/okuc/articles
   * Create a new article
   */
  fastify.post('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'Create a new article',
      tags: ['okuc-articles'],
      body: {
        type: 'object',
        properties: {
          articleId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          usedInPvc: { type: 'boolean' },
          usedInAlu: { type: 'boolean' },
          orderClass: { type: 'string', enum: ['typical', 'atypical'] },
          sizeClass: { type: 'string', enum: ['standard', 'gabarat'] },
          orderUnit: { type: 'string', enum: ['piece', 'pack'] },
          packagingSizes: { type: 'string' },
          preferredSize: { type: 'number' },
          supplierCode: { type: 'string' },
          leadTimeDays: { type: 'number' },
          safetyDays: { type: 'number' },
        },
        required: ['articleId', 'name'],
      },
    },
  }, okucArticleHandler.create);

  /**
   * PATCH /api/okuc/articles/:id
   * Update an article
   */
  fastify.patch<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update an article',
      tags: ['okuc-articles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          usedInPvc: { type: 'boolean' },
          usedInAlu: { type: 'boolean' },
          orderClass: { type: 'string', enum: ['typical', 'atypical'] },
          sizeClass: { type: 'string', enum: ['standard', 'gabarat'] },
          orderUnit: { type: 'string', enum: ['piece', 'pack'] },
          packagingSizes: { type: 'string' },
          preferredSize: { type: 'number' },
          supplierCode: { type: 'string' },
          leadTimeDays: { type: 'number' },
          safetyDays: { type: 'number' },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, okucArticleHandler.update);

  /**
   * DELETE /api/okuc/articles/:id
   * Delete an article
   */
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Delete an article',
      tags: ['okuc-articles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, okucArticleHandler.delete);

  /**
   * POST /api/okuc/articles/:id/aliases
   * Add an alias to an article
   */
  fastify.post<{ Params: { id: string }; Body: { aliasNumber: string } }>('/:id/aliases', {
    preHandler: verifyAuth,
    schema: {
      description: 'Add an alias to an article',
      tags: ['okuc-articles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          aliasNumber: { type: 'string' },
        },
        required: ['aliasNumber'],
      },
    },
  }, okucArticleHandler.addAlias);

  /**
   * GET /api/okuc/articles/:id/aliases
   * Get all aliases for an article
   */
  fastify.get<{ Params: { id: string } }>('/:id/aliases', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get all aliases for an article',
      tags: ['okuc-articles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, okucArticleHandler.getAliases);

  /**
   * POST /api/okuc/articles/import
   * Import articles from CSV file
   */
  fastify.post('/import', {
    preHandler: verifyAuth,
    schema: {
      description: 'Import articles from CSV file',
      tags: ['okuc-articles'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'number' },
            failed: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  row: { type: 'number' },
                  error: { type: 'string' },
                  articleId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, okucArticleHandler.importCsv);

  /**
   * GET /api/okuc/articles/export
   * Export articles to CSV file
   */
  fastify.get('/export', {
    preHandler: verifyAuth,
    schema: {
      description: 'Export articles to CSV file',
      tags: ['okuc-articles'],
      querystring: {
        type: 'object',
        properties: {
          warehouseType: { type: 'string', enum: ['pvc', 'alu'] },
        },
      },
    },
  }, okucArticleHandler.exportCsv);
};
