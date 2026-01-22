/**
 * Article Replacement Handler - HTTP request handling dla zastępstw artykułów
 *
 * Endpointy:
 * - GET /api/okuc/replacements - lista mapowań
 * - POST /api/okuc/replacements - ustaw mapowanie
 * - DELETE /api/okuc/replacements/:id - usuń mapowanie
 * - POST /api/okuc/replacements/:id/transfer - przenieś zapotrzebowanie ręcznie
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ArticleReplacementService } from '../../services/okuc/ArticleReplacementService.js';
import { setReplacementSchema } from '../../validators/okuc.js';
import { logger } from '../../utils/logger.js';

const service = new ArticleReplacementService();

export const replacementHandler = {
  /**
   * GET /api/okuc/replacements
   * Lista wszystkich mapowań zastępstw
   */
  async list(_request: FastifyRequest, reply: FastifyReply) {
    const replacements = await service.getReplacements();

    logger.debug('Replacement list requested', { count: replacements.length });
    return reply.status(200).send(replacements);
  },

  /**
   * POST /api/okuc/replacements
   * Ustaw/zmień mapowanie zastępstwa
   */
  async set(request: FastifyRequest, reply: FastifyReply) {
    const validated = setReplacementSchema.parse(request.body);

    const result = await service.setReplacement(
      validated.oldArticleId,
      validated.newArticleId
    );

    logger.info('Replacement set via API', {
      oldArticleId: validated.oldArticleId,
      newArticleId: validated.newArticleId,
    });

    return reply.status(200).send(result);
  },

  /**
   * DELETE /api/okuc/replacements/:id
   * Usuń mapowanie (cofnij wygaszanie)
   */
  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID artykułu' });
    }

    const result = await service.removeReplacement(id);

    logger.info('Replacement removed via API', { articleId: id });
    return reply.status(200).send(result);
  },

  /**
   * POST /api/okuc/replacements/:id/transfer
   * Przenieś zapotrzebowanie ręcznie
   */
  async transferDemand(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID artykułu' });
    }

    const result = await service.transferDemandManually(id);

    logger.info('Demand transferred via API', {
      articleId: id,
      transferred: result.transferred,
    });

    return reply.status(200).send(result);
  },
};
