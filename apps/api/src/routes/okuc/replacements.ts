/**
 * Okuc Replacement Routes - Article Replacement Management
 *
 * Endpointy dla zarządzania zastępstwami artykułów:
 * - GET /api/okuc/replacements - lista mapowań
 * - POST /api/okuc/replacements - ustaw mapowanie
 * - DELETE /api/okuc/replacements/:id - usuń mapowanie
 * - POST /api/okuc/replacements/:id/transfer - przenieś zapotrzebowanie
 */

import type { FastifyPluginAsync } from 'fastify';
import { verifyAuth } from '../../middleware/auth.js';
import { replacementHandler } from '../../handlers/okuc/replacementHandler.js';

export const okucReplacementRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/okuc/replacements
   * Lista mapowań zastępstw
   */
  fastify.get(
    '/',
    {
      preHandler: verifyAuth,
      schema: {
        description: 'Pobierz listę wszystkich mapowań zastępstw artykułów',
        tags: ['okuc-replacements'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                oldArticle: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    articleId: { type: 'string' },
                    name: { type: 'string' },
                    currentStock: { type: 'number' },
                  },
                },
                newArticle: {
                  type: ['object', 'null'],
                  properties: {
                    id: { type: 'number' },
                    articleId: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                demandTransferredAt: { type: ['string', 'null'] },
                pendingDemandCount: { type: 'number' },
              },
            },
          },
        },
      },
    },
    replacementHandler.list
  );

  /**
   * POST /api/okuc/replacements
   * Ustaw mapowanie zastępstwa
   */
  fastify.post(
    '/',
    {
      preHandler: verifyAuth,
      schema: {
        description: 'Ustaw lub zmień mapowanie zastępstwa artykułu',
        tags: ['okuc-replacements'],
        body: {
          type: 'object',
          properties: {
            oldArticleId: { type: 'number', description: 'ID artykułu wygaszanego' },
            newArticleId: {
              type: ['number', 'null'],
              description: 'ID artykułu zastępującego (null = usuń mapowanie)',
            },
          },
          required: ['oldArticleId', 'newArticleId'],
        },
      },
    },
    replacementHandler.set
  );

  /**
   * DELETE /api/okuc/replacements/:id
   * Usuń mapowanie (cofnij wygaszanie)
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: verifyAuth,
      schema: {
        description: 'Usuń mapowanie zastępstwa (cofnij wygaszanie artykułu)',
        tags: ['okuc-replacements'],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
    },
    replacementHandler.remove
  );

  /**
   * POST /api/okuc/replacements/:id/transfer
   * Przenieś zapotrzebowanie ręcznie
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/transfer',
    {
      preHandler: verifyAuth,
      schema: {
        description: 'Ręcznie przenieś zapotrzebowanie z artykułu wygaszanego na zamiennik',
        tags: ['okuc-replacements'],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              transferred: { type: 'number', description: 'Liczba przeniesionych pozycji' },
            },
          },
        },
      },
    },
    replacementHandler.transferDemand
  );
};
