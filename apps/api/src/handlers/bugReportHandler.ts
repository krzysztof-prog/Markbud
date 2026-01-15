/**
 * Bug Report Handler - Request/Response handling
 * Deleguje logikę biznesową do BugReportService
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { BugReportService } from '../services/bugReportService.js';
import {
  bugReportSchema,
  bugReportQuerySchema,
} from '../validators/bugReport.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class BugReportHandler {
  constructor(private service: BugReportService) {}

  /**
   * POST /bug-reports
   * Zgłoś problem/błąd w aplikacji
   */
  async create(request: AuthenticatedRequest, reply: FastifyReply) {
    const data = bugReportSchema.parse(request.body);
    await this.service.saveBugReport(data, request.user?.email);

    return reply.code(200).send({
      success: true,
      message: 'Zgłoszenie zostało zapisane. Dziękujemy!',
    });
  }

  /**
   * GET /bug-reports
   * Pobierz ostatnie zgłoszenia (tylko ADMIN)
   */
  async getAll(
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) {
    const validated = bugReportQuerySchema.parse(request.query);
    const content = await this.service.getAllReports(validated.limit);

    return reply.code(200).send({
      success: true,
      content,
    });
  }
}
