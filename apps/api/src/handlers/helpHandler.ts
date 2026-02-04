/**
 * HelpHandler - Handler dla endpointów instrukcji/pomocy
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { HelpPdfService } from '../services/help/HelpPdfService.js';
import { NotFoundError } from '../utils/errors.js';

const paramsSchema = z.object({
  pageId: z.string().min(1, 'pageId jest wymagany'),
});

export class HelpHandler {
  private pdfService: HelpPdfService;

  constructor() {
    this.pdfService = new HelpPdfService();
  }

  /**
   * GET /api/help/pdf/:pageId
   * Generuj i pobierz PDF instrukcji dla danej strony
   */
  async generatePdf(
    request: FastifyRequest<{ Params: { pageId: string } }>,
    reply: FastifyReply
  ) {
    const { pageId } = paramsSchema.parse(request.params);

    // Sprawdź czy instrukcja istnieje
    if (!this.pdfService.hasContent(pageId)) {
      throw new NotFoundError(`Instrukcja dla strony '${pageId}'`);
    }

    const pdfBuffer = await this.pdfService.generatePdf(pageId);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `instrukcja_${pageId}_${today}.pdf`;

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdfBuffer);
  }
}
