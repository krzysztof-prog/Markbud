import { FastifyInstance } from 'fastify';
import { SchucoHandler } from '../handlers/schucoHandler.js';
import { SchucoService } from '../services/schuco/schucoService.js';

export default async function schucoRoutes(fastify: FastifyInstance) {
  const schucoService = new SchucoService(fastify.prisma);
  const schucoHandler = new SchucoHandler(schucoService);

  // GET /api/schuco/deliveries - Get deliveries with pagination
  fastify.get('/deliveries', {
    schema: {
      description: 'Get Schuco deliveries with pagination',
      tags: ['schuco'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1 },
          pageSize: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  orderDate: { type: 'string' },
                  orderNumber: { type: 'string' },
                  projectNumber: { type: 'string' },
                  orderName: { type: 'string' },
                  shippingStatus: { type: 'string' },
                  deliveryWeek: { type: 'string', nullable: true },
                  deliveryType: { type: 'string', nullable: true },
                  tracking: { type: 'string', nullable: true },
                  complaint: { type: 'string', nullable: true },
                  orderType: { type: 'string', nullable: true },
                  totalAmount: { type: 'string', nullable: true },
                  fetchedAt: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    handler: schucoHandler.getDeliveries,
  });

  // POST /api/schuco/refresh - Trigger manual refresh
  // Note: Scraping może trwać do 3 minut - timeout jest obsługiwany w schucoHandler
  fastify.post('/refresh', {
    schema: {
      description: 'Trigger manual refresh of Schuco deliveries',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            recordsCount: { type: 'integer' },
            durationMs: { type: 'integer' },
          },
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: schucoHandler.refreshDeliveries,
  });

  // GET /api/schuco/status - Get last fetch status
  fastify.get('/status', {
    schema: {
      description: 'Get status of last Schuco fetch',
      tags: ['schuco'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            status: { type: 'string' },
            triggerType: { type: 'string' },
            recordsCount: { type: 'integer', nullable: true },
            newRecords: { type: 'integer', nullable: true },
            updatedRecords: { type: 'integer', nullable: true },
            unchangedRecords: { type: 'integer', nullable: true },
            errorMessage: { type: 'string', nullable: true },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            durationMs: { type: 'integer', nullable: true },
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
    handler: schucoHandler.getStatus,
  });

  // GET /api/schuco/logs - Get fetch history
  fastify.get('/logs', {
    schema: {
      description: 'Get history of Schuco fetches',
      tags: ['schuco'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              status: { type: 'string' },
              recordsCount: { type: 'integer', nullable: true },
              errorMessage: { type: 'string', nullable: true },
              startedAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              durationMs: { type: 'integer', nullable: true },
            },
          },
        },
      },
    },
    handler: schucoHandler.getLogs,
  });
}
