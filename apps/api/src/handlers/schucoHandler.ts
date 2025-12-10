import { FastifyRequest, FastifyReply } from 'fastify';
import { SchucoService } from '../services/schuco/schucoService.js';
import { GetDeliveriesQuery, getDeliveriesQuerySchema } from '../validators/schuco.js';
import { logger } from '../utils/logger.js';

export class SchucoHandler {
  private schucoService: SchucoService;

  constructor(schucoService: SchucoService) {
    this.schucoService = schucoService;
  }

  /**
   * GET /api/schuco/deliveries
   * Get Schuco deliveries with pagination
   */
  getDeliveries = async (
    request: FastifyRequest<{ Querystring: GetDeliveriesQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { page, pageSize } = getDeliveriesQuerySchema.parse(request.query);

      const result = await this.schucoService.getDeliveries(page, pageSize);

      return reply.code(200).send(result);
    } catch (error) {
      logger.error('[SchucoHandler] Error getting deliveries:', error);
      return reply.code(500).send({ error: 'Failed to get deliveries' });
    }
  };

  /**
   * POST /api/schuco/refresh
   * Trigger manual refresh - scrape and store new data
   */
  refreshDeliveries = async (
    request: FastifyRequest<{ Body: { headless?: boolean } }>,
    reply: FastifyReply
  ) => {
    try {
      const { headless = true } = request.body || {};
      logger.info(`[SchucoHandler] Manual refresh triggered (headless: ${headless})`);

      // Increase socket timeout for this long-running request (3.5 minutes)
      request.raw.setTimeout(210000);

      const result = await this.schucoService.fetchAndStoreDeliveries(headless);

      if (result.success) {
        return reply.code(200).send({
          message: 'Deliveries refreshed successfully',
          recordsCount: result.recordsCount,
          durationMs: result.durationMs,
        });
      } else {
        return reply.code(500).send({
          error: 'Failed to refresh deliveries',
          message: result.errorMessage,
        });
      }
    } catch (error) {
      logger.error('[SchucoHandler] Error refreshing deliveries:', error);
      return reply.code(500).send({ error: 'Failed to refresh deliveries' });
    }
  };

  /**
   * GET /api/schuco/status
   * Get status of last fetch
   */
  getStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status = await this.schucoService.getLastFetchStatus();

      if (!status) {
        return reply.code(404).send({ error: 'No fetch history found' });
      }

      return reply.code(200).send(status);
    } catch (error) {
      logger.error('[SchucoHandler] Error getting status:', error);
      return reply.code(500).send({ error: 'Failed to get status' });
    }
  };

  /**
   * GET /api/schuco/logs
   * Get fetch history logs
   */
  getLogs = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const logs = await this.schucoService.getFetchLogs();

      return reply.code(200).send(logs);
    } catch (error) {
      logger.error('[SchucoHandler] Error getting logs:', error);
      return reply.code(500).send({ error: 'Failed to get logs' });
    }
  };

  /**
   * GET /api/schuco/statistics
   * Get delivery statistics by changeType
   */
  getStatistics = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const statistics = await this.schucoService.getStatistics();

      return reply.code(200).send(statistics);
    } catch (error) {
      logger.error('[SchucoHandler] Error getting statistics:', error);
      return reply.code(500).send({ error: 'Failed to get statistics' });
    }
  };
}
