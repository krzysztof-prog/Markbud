/**
 * Okuc Stock Routes - Inventory Management
 * Routes for managing hardware stock/inventory (magazyn okuć)
 */

import type { FastifyPluginAsync } from 'fastify';
import { verifyAuth } from '../../middleware/auth.js';
import { okucStockHandler } from '../../handlers/okuc/stockHandler.js';

export const okucStockRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication

  /**
   * GET /api/okuc/stock
   * List all stock with optional filters
   * Query params: articleId, warehouseType, subWarehouse, belowMin
   */
  fastify.get('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'List all stock with optional filters',
      tags: ['okuc-stock'],
      querystring: {
        type: 'object',
        properties: {
          articleId: { type: 'number' },
          warehouseType: { type: 'string', enum: ['pvc', 'alu'] },
          subWarehouse: { type: 'string', enum: ['production', 'buffer', 'gabaraty'] },
          belowMin: { type: 'boolean' },
        },
      },
    },
  }, okucStockHandler.list);

  /**
   * GET /api/okuc/stock/summary
   * Get stock summary grouped by warehouse
   * Query params: warehouseType
   */
  fastify.get('/summary', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get stock summary grouped by warehouse',
      tags: ['okuc-stock'],
      querystring: {
        type: 'object',
        properties: {
          warehouseType: { type: 'string', enum: ['pvc', 'alu'] },
        },
      },
    },
  }, okucStockHandler.summary);

  /**
   * GET /api/okuc/stock/below-minimum
   * Get stock items below minimum level
   * Query params: warehouseType
   */
  fastify.get('/below-minimum', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get stock items below minimum level',
      tags: ['okuc-stock'],
      querystring: {
        type: 'object',
        properties: {
          warehouseType: { type: 'string', enum: ['pvc', 'alu'] },
        },
      },
    },
  }, okucStockHandler.belowMinimum);

  /**
   * GET /api/okuc/stock/:id
   * Get stock by ID
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get stock by ID',
      tags: ['okuc-stock'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, okucStockHandler.getById);

  /**
   * GET /api/okuc/stock/by-article/:articleId
   * Get stock by article ID and warehouse type
   * Query params: warehouseType (required), subWarehouse
   */
  fastify.get<{ Params: { articleId: string } }>('/by-article/:articleId', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get stock by article ID and warehouse type',
      tags: ['okuc-stock'],
      params: {
        type: 'object',
        properties: {
          articleId: { type: 'string' },
        },
        required: ['articleId'],
      },
      querystring: {
        type: 'object',
        properties: {
          warehouseType: { type: 'string', enum: ['pvc', 'alu'] },
          subWarehouse: { type: 'string', enum: ['production', 'buffer', 'gabaraty'] },
        },
        required: ['warehouseType'],
      },
    },
  }, okucStockHandler.getByArticle);

  /**
   * PATCH /api/okuc/stock/:id
   * Update stock quantity (with optimistic locking)
   */
  fastify.patch<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update stock quantity',
      tags: ['okuc-stock'],
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
          currentQuantity: { type: 'number' },
          reservedQty: { type: 'number' },
          minStock: { type: 'number' },
          maxStock: { type: 'number' },
          version: { type: 'number' },
        },
        required: ['version'],
      },
    },
  }, okucStockHandler.update);

  /**
   * POST /api/okuc/stock/adjust
   * Adjust stock quantity (add/subtract)
   */
  fastify.post<{ Body: { stockId: number; quantity: number; version: number } }>('/adjust', {
    preHandler: verifyAuth,
    schema: {
      description: 'Adjust stock quantity',
      tags: ['okuc-stock'],
      body: {
        type: 'object',
        properties: {
          stockId: { type: 'number' },
          quantity: { type: 'number' },
          version: { type: 'number' },
        },
        required: ['stockId', 'quantity', 'version'],
      },
    },
  }, okucStockHandler.adjust);

  /**
   * GET /api/okuc/stock/history/:articleId
   * Get stock history for an article
   * Query params: warehouseType, subWarehouse, eventType, isManualEdit, fromDate, toDate, recordedById
   */
  fastify.get<{
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
  }>('/history/:articleId', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get stock history for an article',
      tags: ['okuc-stock'],
      params: {
        type: 'object',
        properties: {
          articleId: { type: 'string' },
        },
        required: ['articleId'],
      },
      querystring: {
        type: 'object',
        properties: {
          warehouseType: { type: 'string', enum: ['pvc', 'alu'] },
          subWarehouse: { type: 'string', enum: ['production', 'buffer', 'gabaraty'] },
          eventType: { type: 'string' },
          isManualEdit: { type: 'boolean' },
          fromDate: { type: 'string', format: 'date' },
          toDate: { type: 'string', format: 'date' },
          recordedById: { type: 'number' },
        },
      },
    },
  }, okucStockHandler.getHistory);
};
