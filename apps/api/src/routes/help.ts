/**
 * Routes dla systemu pomocy/instrukcji
 */

import type { FastifyPluginAsync } from 'fastify';
import { HelpHandler } from '../handlers/helpHandler.js';

export const helpRoutes: FastifyPluginAsync = async (fastify) => {
  const handler = new HelpHandler();

  /**
   * GET /api/help/pdf/:pageId
   * Generuj i pobierz PDF instrukcji dla danej strony
   *
   * @param pageId - identyfikator strony (np. 'dostawy', 'zlecenia')
   * @returns PDF file
   */
  fastify.get<{
    Params: { pageId: string };
  }>(
    '/pdf/:pageId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            pageId: { type: 'string' },
          },
          required: ['pageId'],
        },
        response: {
          200: {
            type: 'string',
            format: 'binary',
          },
        },
        tags: ['help'],
        summary: 'Pobierz PDF instrukcji',
        description: 'Generuje i zwraca PDF z instrukcją obsługi dla danej strony',
      },
    },
    async (request, reply) => handler.generatePdf(request, reply)
  );
};
