/**
 * Glass Validations Routes
 * Architektura: Route → Handler → Service
 */

import type { FastifyPluginAsync } from 'fastify';
import { GlassValidationService } from '../services/glassValidationService.js';
import { GlassValidationHandler } from '../handlers/glassValidationHandler.js';
import type { GlassValidationFilters, GlassValidationResolve } from '../validators/glass.js';

export const glassValidationRoutes: FastifyPluginAsync = async (fastify) => {
  // Inicjalizacja layered architecture
  const service = new GlassValidationService(fastify.prisma);
  const handler = new GlassValidationHandler(service);

  // GET /glass-validations/dashboard - Dashboard z statystykami
  fastify.get(
    '/dashboard',
    {
      schema: {
        description: 'Get glass validation dashboard with statistics',
        tags: ['glass-validations'],
        response: {
          200: {
            type: 'object',
            properties: {
              stats: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  errors: { type: 'number' },
                  warnings: { type: 'number' },
                  info: { type: 'number' },
                  byType: { type: 'object' },
                },
              },
              recentIssues: { type: 'array' },
            },
          },
        },
      },
    },
    handler.getDashboard.bind(handler)
  );

  // GET /glass-validations/order/:orderNumber - Walidacje dla zlecenia
  fastify.get<{ Params: { orderNumber: string } }>(
    '/order/:orderNumber',
    {
      schema: {
        description: 'Get validations for a specific order',
        tags: ['glass-validations'],
        params: {
          type: 'object',
          required: ['orderNumber'],
          properties: {
            orderNumber: { type: 'string', description: 'Order number' },
          },
        },
      },
    },
    handler.getByOrderNumber.bind(handler)
  );

  // GET /glass-validations - Lista walidacji z filtrami
  fastify.get<{ Querystring: GlassValidationFilters }>(
    '/',
    {
      schema: {
        description: 'Get all glass validations with optional filters',
        tags: ['glass-validations'],
        querystring: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['error', 'warning', 'info'],
              description: 'Filter by severity',
            },
            resolved: {
              type: 'string',
              enum: ['true', 'false'],
              description: 'Filter by resolved status',
            },
          },
        },
      },
    },
    handler.getAll.bind(handler)
  );

  // POST /glass-validations/:id/resolve - Rozwiąż walidację
  fastify.post<{ Params: { id: string }; Body: GlassValidationResolve }>(
    '/:id/resolve',
    {
      schema: {
        description: 'Resolve a glass validation issue',
        tags: ['glass-validations'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Validation ID' },
          },
        },
        body: {
          type: 'object',
          required: ['resolvedBy'],
          properties: {
            resolvedBy: { type: 'string', description: 'User who resolved the issue' },
            notes: { type: 'string', description: 'Resolution notes (optional)' },
          },
        },
      },
    },
    handler.resolve.bind(handler)
  );
};
