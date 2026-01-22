/**
 * Okuc Order Routes - Zamówienia
 * Routes for managing hardware orders to suppliers (zamówienia do dostawców)
 */

import type { FastifyPluginAsync } from 'fastify';
import { verifyAuth } from '../../middleware/auth.js';
import { okucOrderHandler } from '../../handlers/okuc/orderHandler.js';

export const okucOrderRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication

  /**
   * GET /api/okuc/orders
   * List all orders with optional filters
   * Query params: status, basketType, fromDate, toDate
   */
  fastify.get('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'List all orders with optional filters',
      tags: ['okuc-orders'],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'in_transit', 'received', 'cancelled'],
          },
          basketType: {
            type: 'string',
            enum: ['typical_standard', 'typical_gabarat', 'atypical'],
          },
          fromDate: { type: 'string', format: 'date' },
          toDate: { type: 'string', format: 'date' },
        },
      },
    },
  }, okucOrderHandler.list);

  /**
   * GET /api/okuc/orders/stats
   * Get order statistics
   */
  fastify.get('/stats', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get order statistics',
      tags: ['okuc-orders'],
    },
  }, okucOrderHandler.getStats);

  /**
   * GET /api/okuc/orders/:id
   * Get order by ID
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get order by ID',
      tags: ['okuc-orders'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, okucOrderHandler.getById);

  /**
   * POST /api/okuc/orders
   * Create a new order
   */
  fastify.post('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'Create a new order',
      tags: ['okuc-orders'],
      body: {
        type: 'object',
        required: ['basketType', 'items'],
        properties: {
          basketType: {
            type: 'string',
            enum: ['typical_standard', 'typical_gabarat', 'atypical'],
          },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['articleId', 'orderedQty'],
              properties: {
                articleId: { type: 'number' },
                orderedQty: { type: 'number', minimum: 1 },
                unitPrice: { type: 'number', minimum: 0 },
              },
            },
          },
          notes: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, okucOrderHandler.create);

  /**
   * PUT /api/okuc/orders/:id
   * Update existing order
   */
  fastify.put<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update existing order',
      tags: ['okuc-orders'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'in_transit', 'received', 'cancelled'],
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['articleId', 'orderedQty'],
              properties: {
                articleId: { type: 'number' },
                orderedQty: { type: 'number', minimum: 1 },
                receivedQty: { type: 'number', minimum: 0 },
                unitPrice: { type: 'number', minimum: 0 },
              },
            },
          },
          editReason: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
    },
  }, okucOrderHandler.update);

  /**
   * POST /api/okuc/orders/:id/receive
   * Mark order as received and update received quantities
   */
  fastify.post<{ Params: { id: string } }>('/:id/receive', {
    preHandler: verifyAuth,
    schema: {
      description: 'Mark order as received and update received quantities',
      tags: ['okuc-orders'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['articleId', 'receivedQty'],
              properties: {
                articleId: { type: 'number' },
                receivedQty: { type: 'number', minimum: 0 },
              },
            },
          },
          notes: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, okucOrderHandler.receive);

  /**
   * DELETE /api/okuc/orders/:id
   * Delete order (only if draft)
   */
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Delete order (only if draft)',
      tags: ['okuc-orders'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, okucOrderHandler.delete);

  // ========================
  // IMPORT Z XLSX
  // ========================

  /**
   * POST /api/okuc/orders/import/parse
   * Parsuje plik XLSX i zwraca podgląd danych do zatwierdzenia
   * Multipart file upload - plik XLSX w polu 'file'
   */
  fastify.post('/import/parse', {
    preHandler: verifyAuth,
    schema: {
      description: 'Parsuje plik XLSX i zwraca podgląd danych do zatwierdzenia',
      tags: ['okuc-orders'],
      consumes: ['multipart/form-data'],
    },
  }, okucOrderHandler.parseImport);

  /**
   * POST /api/okuc/orders/import/confirm
   * Zatwierdza import i tworzy zamówienie
   */
  fastify.post('/import/confirm', {
    preHandler: verifyAuth,
    schema: {
      description: 'Zatwierdza import i tworzy zamówienie',
      tags: ['okuc-orders'],
      body: {
        type: 'object',
        required: ['items', 'expectedDeliveryDate'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['articleId', 'quantity', 'priceEur'],
              properties: {
                articleId: { type: 'string' },
                quantity: { type: 'number', minimum: 1 },
                priceEur: { type: 'number', minimum: 0 },
              },
            },
          },
          expectedDeliveryDate: { type: 'string', format: 'date' },
          createMissingArticles: { type: 'boolean', default: false },
          missingArticlesToCreate: {
            type: 'array',
            items: {
              type: 'object',
              required: ['articleId', 'name'],
              properties: {
                articleId: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, okucOrderHandler.confirmImport);
};
