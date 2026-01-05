import { FastifyRequest, FastifyReply } from 'fastify';
import { SchucoService } from '../services/schuco/schucoService.js';
import { GetDeliveriesQuery, getDeliveriesQuerySchema } from '../validators/schuco.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, InternalServerError } from '../utils/errors.js';

export class SchucoHandler {
  private schucoService: SchucoService;

  constructor(schucoService: SchucoService) {
    this.schucoService = schucoService;
  }

  /**
   * GET /api/schuco/deliveries
   * Pobiera dostawy Schuco z paginacją
   */
  getDeliveries = async (
    request: FastifyRequest<{ Querystring: GetDeliveriesQuery }>,
    reply: FastifyReply
  ) => {
    const { page, pageSize } = getDeliveriesQuerySchema.parse(request.query);
    const result = await this.schucoService.getDeliveries(page, pageSize);
    return reply.code(200).send(result);
  };

  /**
   * POST /api/schuco/refresh
   * Ręczne odświeżenie - pobiera i zapisuje nowe dane
   */
  refreshDeliveries = async (
    request: FastifyRequest<{ Body: { headless?: boolean } }>,
    reply: FastifyReply
  ) => {
    const { headless = true } = request.body || {};
    logger.info(`[SchucoHandler] Ręczne odświeżenie (headless: ${headless})`);

    // Zwiększ timeout dla długotrwałego requesta (3.5 minuty)
    request.raw.setTimeout(210000);

    const result = await this.schucoService.fetchAndStoreDeliveries(headless);

    if (result.success) {
      return reply.code(200).send({
        message: 'Dostawy odświeżone pomyślnie',
        recordsCount: result.recordsCount,
        durationMs: result.durationMs,
      });
    } else {
      throw new InternalServerError(result.errorMessage || 'Błąd odświeżania dostaw Schuco');
    }
  };

  /**
   * GET /api/schuco/status
   * Pobiera status ostatniego pobrania
   */
  getStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const status = await this.schucoService.getLastFetchStatus();

    if (!status) {
      throw new NotFoundError('Historia pobierania');
    }

    return reply.code(200).send(status);
  };

  /**
   * GET /api/schuco/logs
   * Pobiera historię logów pobierania
   */
  getLogs = async (request: FastifyRequest, reply: FastifyReply) => {
    const logs = await this.schucoService.getFetchLogs();
    return reply.code(200).send(logs);
  };

  /**
   * GET /api/schuco/statistics
   * Pobiera statystyki dostaw według typu zmiany
   */
  getStatistics = async (request: FastifyRequest, reply: FastifyReply) => {
    const statistics = await this.schucoService.getStatistics();
    return reply.code(200).send(statistics);
  };
}
