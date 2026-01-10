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
          orderClass: { type: 'string', enum: ['typical', 'atypical', 'pending_review'] },
          sizeClass: { type: 'string', enum: ['standard', 'gabarat'] },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, okucArticleHandler.list);

  /**
   * GET /api/okuc/articles/pending-review
   * List all articles awaiting orderClass verification (created during import)
   */
  fastify.get('/pending-review', {
    preHandler: verifyAuth,
    schema: {
      description: 'List all articles awaiting orderClass verification',
      tags: ['okuc-articles'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              articleId: { type: 'string' },
              name: { type: 'string' },
              orderClass: { type: 'string' },
              usedInPvc: { type: 'boolean' },
              usedInAlu: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  }, okucArticleHandler.listPendingReview);

  /**
   * POST /api/okuc/articles/batch-update-order-class
   * Update orderClass for multiple articles at once
   */
  fastify.post<{
    Body: { articles: Array<{ id: number; orderClass: 'typical' | 'atypical' }> };
  }>('/batch-update-order-class', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update orderClass for multiple articles at once',
      tags: ['okuc-articles'],
      body: {
        type: 'object',
        properties: {
          articles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                orderClass: { type: 'string', enum: ['typical', 'atypical'] },
              },
              required: ['id', 'orderClass'],
            },
          },
        },
        required: ['articles'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            updated: { type: 'number' },
            failed: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, okucArticleHandler.batchUpdateOrderClass);

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
   * POST /api/okuc/articles/import/preview
   * Preview import - parses CSV and detects conflicts before actual import
   */
  fastify.post('/import/preview', {
    preHandler: verifyAuth,
    schema: {
      description: 'Preview CSV import - detect conflicts before importing',
      tags: ['okuc-articles'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            new: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  articleId: { type: 'string' },
                  name: { type: 'string' },
                  usedInPvc: { type: 'boolean' },
                  usedInAlu: { type: 'boolean' },
                  orderClass: { type: 'string' },
                  sizeClass: { type: 'string' },
                  warehouseType: { type: 'string' },
                },
              },
            },
            conflicts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  articleId: { type: 'string' },
                  existingData: { type: 'object' },
                  newData: { type: 'object' },
                },
              },
            },
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
  }, okucArticleHandler.importPreview);

  /**
   * POST /api/okuc/articles/import
   * Import articles from CSV file with conflict resolution
   */
  fastify.post('/import', {
    preHandler: verifyAuth,
    schema: {
      description: 'Import articles from CSV file with conflict resolution',
      tags: ['okuc-articles'],
      body: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                articleId: { type: 'string' },
                name: { type: 'string' },
                usedInPvc: { type: 'boolean' },
                usedInAlu: { type: 'boolean' },
                orderClass: { type: 'string' },
                sizeClass: { type: 'string' },
                warehouseType: { type: 'string' },
              },
              required: ['articleId', 'name'],
            },
          },
          conflictResolution: {
            type: 'string',
            enum: ['skip', 'overwrite', 'selective'],
          },
          selectedConflicts: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['items', 'conflictResolution'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            imported: { type: 'number' },
            skipped: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  articleId: { type: 'string' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, okucArticleHandler.importArticles);

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
