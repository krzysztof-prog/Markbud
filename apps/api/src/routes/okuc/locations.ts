/**
 * Okuc Location Routes - Location Management
 * Routes for managing warehouse locations for hardware (lokalizacje magazynowe okuć)
 */

import type { FastifyPluginAsync } from 'fastify';
import { verifyAuth } from '../../middleware/auth.js';
import { okucLocationHandler } from '../../handlers/okuc/locationHandler.js';

export const okucLocationRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication

  /**
   * GET /api/okuc/locations
   * List all active locations sorted by sortOrder
   */
  fastify.get('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'List all active warehouse locations',
      tags: ['okuc-locations'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              sortOrder: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  }, okucLocationHandler.list);

  /**
   * POST /api/okuc/locations
   * Create a new location
   */
  fastify.post('/', {
    preHandler: verifyAuth,
    schema: {
      description: 'Create a new warehouse location',
      tags: ['okuc-locations'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          sortOrder: { type: 'number' },
        },
        required: ['name'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            sortOrder: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, okucLocationHandler.create);

  /**
   * POST /api/okuc/locations/reorder
   * Reorder locations (change sortOrder)
   * Note: Must be before /:id routes to avoid conflict
   */
  fastify.post('/reorder', {
    preHandler: verifyAuth,
    schema: {
      description: 'Reorder warehouse locations',
      tags: ['okuc-locations'],
      body: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            items: { type: 'number' },
          },
        },
        required: ['ids'],
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              sortOrder: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  }, okucLocationHandler.reorder);

  /**
   * PATCH /api/okuc/locations/:id
   * Update a location
   */
  fastify.patch<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Update a warehouse location',
      tags: ['okuc-locations'],
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
          name: { type: 'string', minLength: 1, maxLength: 100 },
          sortOrder: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            sortOrder: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, okucLocationHandler.update);

  /**
   * DELETE /api/okuc/locations/:id
   * Soft delete a location (sets deletedAt)
   */
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: verifyAuth,
    schema: {
      description: 'Delete a warehouse location (soft delete)',
      tags: ['okuc-locations'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        204: {
          type: 'null',
          description: 'Location deleted successfully',
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, okucLocationHandler.delete);
};
