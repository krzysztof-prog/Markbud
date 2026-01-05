/**
 * Okuc Demand Routes - Zapotrzebowanie
 * Routes for managing hardware demand (zapotrzebowanie okuć)
 */

import type { FastifyPluginAsync } from 'fastify';
import { verifyAuth } from '../../middleware/auth.js';
import { okucDemandHandler } from '../../handlers/okuc/demandHandler.js';

export const okucDemandRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication

  /**
   * GET /api/okuc/demand
   * List all demands with optional filters
   * Query params: articleId, orderId, status, source, expectedWeek, fromWeek, toWeek, isManualEdit
   */
  fastify.get('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'List all demands with optional filters',
      tags: ['okuc-demand'],
      querystring: {
        type: 'object',
        properties: {
          articleId: { type: 'number' },
          orderId: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'in_production', 'completed', 'cancelled'] },
          source: { type: 'string', enum: ['order', 'csv_import', 'manual'] },
          expectedWeek: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
          fromWeek: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
          toWeek: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
          isManualEdit: { type: 'boolean' },
        },
      },
    },
  }, okucDemandHandler.list);

  /**
   * GET /api/okuc/demand/summary
   * Get demand summary grouped by week
   * Query params: fromWeek, toWeek
   */
  fastify.get('/summary', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get demand summary grouped by week',
      tags: ['okuc-demand'],
      querystring: {
        type: 'object',
        properties: {
          fromWeek: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
          toWeek: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
        },
      },
    },
  }, okucDemandHandler.getSummary);

  /**
   * GET /api/okuc/demand/:id
   * Get demand by ID
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Get demand by ID',
      tags: ['okuc-demand'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, okucDemandHandler.getById);

  /**
   * POST /api/okuc/demand
   * Create a new demand
   */
  fastify.post('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'Create a new demand',
      tags: ['okuc-demand'],
      body: {
        type: 'object',
        required: ['articleId', 'expectedWeek', 'quantity'],
        properties: {
          demandId: { type: 'string', maxLength: 50 },
          articleId: { type: 'number' },
          orderId: { type: 'number' },
          expectedWeek: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
          quantity: { type: 'number', minimum: 1 },
          status: { type: 'string', enum: ['pending', 'confirmed', 'in_production', 'completed', 'cancelled'] },
          source: { type: 'string', enum: ['order', 'csv_import', 'manual'] },
        },
      },
    },
  }, okucDemandHandler.create);

  /**
   * PUT /api/okuc/demand/:id
   * Update existing demand
   */
  fastify.put<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update existing demand',
      tags: ['okuc-demand'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['editReason'],
        properties: {
          quantity: { type: 'number', minimum: 1 },
          status: { type: 'string', enum: ['pending', 'confirmed', 'in_production', 'completed', 'cancelled'] },
          expectedWeek: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
          editReason: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
    },
  }, okucDemandHandler.update);

  /**
   * DELETE /api/okuc/demand/:id
   * Delete demand
   */
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Delete demand',
      tags: ['okuc-demand'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, okucDemandHandler.delete);
};
