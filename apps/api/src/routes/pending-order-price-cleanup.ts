/**
 * PendingOrderPrice Cleanup Routes
 *
 * Endpoints for managing automatic cleanup of pending order prices
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  getCleanupStatistics,
  getCleanupConfig,
  getSchedulerStatus,
  triggerManualCleanup,
  getAllPendingPrices,
} from '../handlers/pendingOrderPriceCleanupHandler.js';

export async function pendingOrderPriceCleanupRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Get cleanup statistics
  fastify.get('/statistics', {
    schema: {
      description: 'Get cleanup statistics for pending order prices',
      tags: ['cleanup'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                byStatus: {
                  type: 'object',
                  properties: {
                    pending: { type: 'number' },
                    applied: { type: 'number' },
                    expired: { type: 'number' },
                  },
                },
                oldest: {
                  type: 'object',
                  properties: {
                    pending: { type: ['string', 'null'] },
                    applied: { type: ['string', 'null'] },
                    expired: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: getCleanupStatistics,
  });

  // Get cleanup configuration
  fastify.get('/config', {
    schema: {
      description: 'Get cleanup configuration',
      tags: ['cleanup'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                pendingMaxAgeDays: { type: 'number' },
                appliedMaxAgeDays: { type: 'number' },
                deleteExpired: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: getCleanupConfig,
  });

  // Get scheduler status
  fastify.get('/scheduler/status', {
    schema: {
      description: 'Get cleanup scheduler status',
      tags: ['cleanup'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                isRunning: { type: 'boolean' },
                scheduledTime: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    handler: getSchedulerStatus,
  });

  // Manually trigger cleanup
  fastify.post('/run', {
    schema: {
      description: 'Manually trigger cleanup process',
      tags: ['cleanup'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                timestamp: { type: 'string' },
                pendingExpired: { type: 'number' },
                appliedDeleted: { type: 'number' },
                expiredDeleted: { type: 'number' },
                totalAffected: { type: 'number' },
                errors: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
    handler: triggerManualCleanup,
  });

  // Get all pending prices
  fastify.get('/prices', {
    schema: {
      description: 'Get all pending order prices (optionally filtered by status)',
      tags: ['cleanup'],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'applied', 'expired'],
            description: 'Filter by status',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  orderNumber: { type: 'string' },
                  reference: { type: ['string', 'null'] },
                  currency: { type: 'string' },
                  valueNetto: { type: 'number' },
                  valueBrutto: { type: ['number', 'null'] },
                  filename: { type: 'string' },
                  filepath: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  appliedAt: { type: ['string', 'null'] },
                  appliedToOrderId: { type: ['number', 'null'] },
                },
              },
            },
            count: { type: 'number' },
          },
        },
      },
    },
    handler: getAllPendingPrices,
  });
}
