/**
 * Label Checks Routes (Kontrola etykiet)
 * Architektura: Route → Handler → Service → Repository
 */

import type { FastifyPluginAsync } from 'fastify';
import { LabelCheckService } from '../services/label-check/LabelCheckService.js';
import { LabelCheckHandler } from '../handlers/labelCheckHandler.js';
import type {
  LabelCheckQueryParams,
  CreateLabelCheckInput,
} from '../validators/label-check.js';

export const labelCheckRoutes: FastifyPluginAsync = async (fastify) => {
  // Inicjalizacja layered architecture
  const service = new LabelCheckService(fastify.prisma);
  const handler = new LabelCheckHandler(service);

  // GET /api/label-checks - lista sprawdzeń z filtrami i paginacją
  fastify.get<{ Querystring: LabelCheckQueryParams }>(
    '/',
    {
      schema: {
        description: 'Get all label checks with filters and pagination',
        tags: ['label-checks'],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed'],
              description: 'Filter by status',
            },
            deliveryId: {
              type: 'number',
              description: 'Filter by delivery ID',
            },
            from: {
              type: 'string',
              description: 'Filter from date (ISO format)',
            },
            to: {
              type: 'string',
              description: 'Filter to date (ISO format)',
            },
            page: {
              type: 'number',
              default: 1,
              description: 'Page number (1-based)',
            },
            limit: {
              type: 'number',
              default: 20,
              description: 'Items per page (max 100)',
            },
          },
        },
      },
    },
    handler.getAll.bind(handler)
  );

  // GET /api/label-checks/statistics - statystyki sprawdzeń
  fastify.get(
    '/statistics',
    {
      schema: {
        description: 'Get label check statistics',
        tags: ['label-checks'],
      },
    },
    handler.getStatistics.bind(handler)
  );

  // GET /api/label-checks/delivery/:id - najnowsze sprawdzenie dla dostawy
  fastify.get<{ Params: { id: string } }>(
    '/delivery/:id',
    {
      schema: {
        description: 'Get latest label check for a delivery',
        tags: ['label-checks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Delivery ID' },
          },
        },
      },
    },
    handler.getLatestForDelivery.bind(handler)
  );

  // GET /api/label-checks/delivery/:id/summary - podsumowanie sprawdzenia dla dostawy
  fastify.get<{ Params: { id: string } }>(
    '/delivery/:id/summary',
    {
      schema: {
        description: 'Get label check summary for a delivery',
        tags: ['label-checks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Delivery ID' },
          },
        },
      },
    },
    handler.getDeliverySummary.bind(handler)
  );

  // GET /api/label-checks/:id - szczegóły pojedynczego sprawdzenia
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Get label check by ID',
        tags: ['label-checks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Label check ID' },
          },
        },
      },
    },
    handler.getById.bind(handler)
  );

  // POST /api/label-checks - uruchom sprawdzanie etykiet dla dostawy
  fastify.post<{ Body: CreateLabelCheckInput }>(
    '/',
    {
      schema: {
        description: 'Start label check for a delivery',
        tags: ['label-checks'],
        body: {
          type: 'object',
          required: ['deliveryId'],
          properties: {
            deliveryId: {
              type: 'number',
              description: 'Delivery ID to check labels for',
            },
          },
        },
      },
    },
    handler.create.bind(handler)
  );

  // DELETE /api/label-checks/:id - usuń sprawdzenie (soft delete)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Delete label check (soft delete)',
        tags: ['label-checks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Label check ID' },
          },
        },
      },
    },
    handler.remove.bind(handler)
  );

  // GET /api/label-checks/:id/export - pobierz raport Excel
  fastify.get<{ Params: { id: string } }>(
    '/:id/export',
    {
      schema: {
        description: 'Export label check results to Excel',
        tags: ['label-checks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Label check ID' },
          },
        },
        produces: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      },
    },
    handler.exportExcel.bind(handler)
  );
};
