/**
 * Bug Reports Routes - Zgłoszenia błędów od użytkowników
 * Architektura: Route → Handler → Service → Repository
 */

import { FastifyInstance } from 'fastify';
import { withAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role-check.js';
import { BugReportHandler } from '../handlers/bugReportHandler.js';
import { BugReportService } from '../services/bugReportService.js';
import { BugReportRepository } from '../repositories/BugReportRepository.js';

export async function bugReportRoutes(fastify: FastifyInstance) {
  // Inicjalizacja layered architecture
  const repository = new BugReportRepository();
  const service = new BugReportService(repository);
  const handler = new BugReportHandler(service);

  /**
   * POST /bug-reports
   * Zgłoś problem/błąd w aplikacji
   */
  fastify.post<{ Body: unknown }>(
    '/',
    {
      preHandler: withAuth,
      schema: {
        description: 'Zgłoś problem lub błąd w aplikacji',
        tags: ['bug-reports'],
        body: {
          type: 'object',
          required: ['url', 'userAgent', 'timestamp', 'description'],
          properties: {
            url: { type: 'string', description: 'URL strony gdzie wystąpił problem' },
            userAgent: { type: 'string', description: 'User agent przeglądarki' },
            timestamp: { type: 'string', description: 'Timestamp zgłoszenia (ISO 8601)' },
            description: {
              type: 'string',
              description: 'Opis problemu (min. 10, max 5000 znaków)',
              minLength: 10,
              maxLength: 5000,
            },
            screenshot: {
              type: 'string',
              description: 'Screenshot (base64) - opcjonalnie',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    (request, reply) => handler.create(request as AuthenticatedRequest, reply)
  );

  /**
   * GET /bug-reports
   * Pobierz ostatnie zgłoszenia (tylko ADMIN)
   */
  fastify.get<{ Querystring: { limit?: string } }>(
    '/',
    {
      preHandler: [withAuth, requireAdmin],
      schema: {
        description: 'Pobierz ostatnie zgłoszenia błędów (tylko ADMIN)',
        tags: ['bug-reports'],
        querystring: {
          type: 'object',
          properties: {
            limit: {
              type: 'string',
              pattern: '^[0-9]+$',
              description: 'Liczba ostatnich zgłoszeń do pobrania (1-100, domyślnie 50)',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              content: { type: 'string', description: 'Zawartość pliku bug-reports.log' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    handler.getAll.bind(handler)
  );
}
