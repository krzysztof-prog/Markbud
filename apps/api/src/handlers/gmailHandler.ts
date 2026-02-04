/**
 * GmailHandler - Handler dla endpointów Gmail IMAP
 * Pobieranie CSV z załączników maili, konfiguracja, historia
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { GmailFetcherService } from '../services/gmail/GmailFetcherService.js';
import { getGmailScheduler } from '../services/gmail/GmailScheduler.js';
import { prisma } from '../utils/prisma.js';

const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export class GmailHandler {
  private getService(): GmailFetcherService {
    return getGmailScheduler(prisma).getService();
  }

  /**
   * GET /api/gmail/status
   * Status schedulera + konfiguracja + statystyki
   */
  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    const service = this.getService();
    const scheduler = getGmailScheduler(prisma);

    const [config, stats, schedulerStatus] = await Promise.all([
      service.getConfig(),
      service.getStats(),
      Promise.resolve(scheduler.getStatus()),
    ]);

    return reply.send({
      scheduler: schedulerStatus,
      config: config
        ? {
            email: config.email,
            enabled: config.enabled,
            targetFolder: config.targetFolder,
            // Nie wysyłamy hasła
          }
        : null,
      stats,
    });
  }

  /**
   * POST /api/gmail/fetch
   * Ręczne uruchomienie pobierania maili
   */
  async manualFetch(request: FastifyRequest, reply: FastifyReply) {
    const service = this.getService();
    const result = await service.fetchEmails();
    return reply.send(result);
  }

  /**
   * GET /api/gmail/logs
   * Historia pobranych maili
   */
  async getLogs(
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) {
    const { limit } = logsQuerySchema.parse(request.query);
    const service = this.getService();
    const logs = await service.getFetchLogs(limit);
    return reply.send(logs);
  }

  /**
   * POST /api/gmail/test-connection
   * Test połączenia IMAP z Gmail
   */
  async testConnection(request: FastifyRequest, reply: FastifyReply) {
    const service = this.getService();
    const result = await service.testConnection();
    return reply.send(result);
  }
}
