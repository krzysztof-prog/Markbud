/**
 * Routes dla Gmail IMAP - automatyczne pobieranie CSV z załączników maili
 */

import type { FastifyPluginAsync } from 'fastify';
import { GmailHandler } from '../handlers/gmailHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const gmailRoutes: FastifyPluginAsync = async (fastify) => {
  // Wymóg autoryzacji na wszystkie endpointy Gmail
  fastify.addHook('preHandler', verifyAuth);

  const handler = new GmailHandler();

  /**
   * GET /api/gmail/status
   * Status schedulera + konfiguracja + statystyki
   */
  fastify.get(
    '/status',
    {
      schema: {
        tags: ['gmail'],
        summary: 'Status Gmail IMAP',
        description: 'Pobierz status schedulera, konfigurację i statystyki',
      },
    },
    async (request, reply) => handler.getStatus(request, reply)
  );

  /**
   * POST /api/gmail/fetch
   * Ręczne uruchomienie pobierania maili z CSV
   */
  fastify.post(
    '/fetch',
    {
      schema: {
        tags: ['gmail'],
        summary: 'Pobierz maile ręcznie',
        description: 'Ręcznie uruchom pobieranie maili z załącznikami CSV',
      },
    },
    async (request, reply) => handler.manualFetch(request, reply)
  );

  /**
   * GET /api/gmail/logs
   * Historia pobranych maili
   */
  fastify.get<{ Querystring: { limit?: string } }>(
    '/logs',
    {
      schema: {
        tags: ['gmail'],
        summary: 'Historia pobrań',
        description: 'Pobierz historię pobranych maili z Gmail',
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50, minimum: 1, maximum: 200 },
          },
        },
      },
    },
    async (request, reply) => handler.getLogs(request, reply)
  );

  /**
   * POST /api/gmail/test-connection
   * Test połączenia IMAP z Gmail
   */
  fastify.post(
    '/test-connection',
    {
      schema: {
        tags: ['gmail'],
        summary: 'Test połączenia IMAP',
        description: 'Przetestuj połączenie z kontem Gmail przez IMAP',
      },
    },
    async (request, reply) => handler.testConnection(request, reply)
  );
};
