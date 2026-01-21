/**
 * Logistics Handler - Request/Response handling
 *
 * Obsługuje endpointy dla modułu logistyki (parsowanie maili z listami dostaw)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { logisticsMailService } from '../services/logistics/index.js';
import {
  parseMailSchema,
  saveMailListSchema,
  mailListQuerySchema,
  mailListParamsSchema,
  deliveryCodeParamsSchema,
  versionDiffQuerySchema,
  calendarQuerySchema,
  updateMailItemSchema,
  mailItemParamsSchema,
} from '../validators/logistics.js';
import { NotFoundError } from '../utils/errors.js';

export class LogisticsHandler {
  /**
   * POST /logistics/parse
   * Parsuje tekst maila i zwraca ustrukturyzowane dane (bez zapisu)
   */
  async parseEmail(
    request: FastifyRequest<{ Body: { mailText: string } }>,
    reply: FastifyReply
  ) {
    const { mailText } = parseMailSchema.parse(request.body);
    const result = await logisticsMailService.parseAndEnrich(mailText);
    return reply.send(result);
  }

  /**
   * POST /logistics/mail-lists
   * Zapisuje sparsowaną listę mailową do bazy
   */
  async saveMailList(
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) {
    const validated = saveMailListSchema.parse(request.body);
    const mailList = await logisticsMailService.saveMailList(validated);
    return reply.status(201).send(mailList);
  }

  /**
   * GET /logistics/mail-lists
   * Pobiera listę wszystkich list mailowych z filtrami
   */
  async getMailLists(
    request: FastifyRequest<{ Querystring: { from?: string; to?: string; deliveryCode?: string; includeDeleted?: string } }>,
    reply: FastifyReply
  ) {
    const filters = mailListQuerySchema.parse(request.query);

    const lists = await logisticsMailService.getDeliveryCalendar(
      filters.from ? new Date(filters.from) : new Date(new Date().setMonth(new Date().getMonth() - 1)),
      filters.to ? new Date(filters.to) : new Date(new Date().setMonth(new Date().getMonth() + 2))
    );

    return reply.send(lists);
  }

  /**
   * GET /logistics/mail-lists/:id
   * Pobiera szczegóły listy mailowej po ID
   */
  async getMailListById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = mailListParamsSchema.parse(request.params);
    const mailList = await logisticsMailService.getMailListById(parseInt(id, 10));

    if (!mailList) {
      throw new NotFoundError(`Lista mailowa o ID ${id}`);
    }

    return reply.send(mailList);
  }

  /**
   * DELETE /logistics/mail-lists/:id
   * Soft delete listy mailowej
   */
  async deleteMailList(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = mailListParamsSchema.parse(request.params);
    await logisticsMailService.deleteMailList(parseInt(id, 10));
    return reply.status(204).send();
  }

  /**
   * GET /logistics/deliveries/:code/versions
   * Pobiera wszystkie wersje dla danego kodu dostawy
   */
  async getVersionsByDeliveryCode(
    request: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply
  ) {
    const { code } = deliveryCodeParamsSchema.parse(request.params);
    const versions = await logisticsMailService.getAllVersions(code);
    return reply.send(versions);
  }

  /**
   * GET /logistics/deliveries/:code/latest
   * Pobiera najnowszą wersję dla danego kodu dostawy
   */
  async getLatestVersion(
    request: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply
  ) {
    const { code } = deliveryCodeParamsSchema.parse(request.params);
    const latest = await logisticsMailService.getLatestVersion(code);

    if (!latest) {
      throw new NotFoundError(`Lista mailowa dla kodu ${code}`);
    }

    return reply.send(latest);
  }

  /**
   * GET /logistics/deliveries/:code/diff
   * Porównuje dwie wersje listy dla danego kodu dostawy
   */
  async getVersionDiff(
    request: FastifyRequest<{ Params: { code: string }; Querystring: { versionFrom: string; versionTo: string } }>,
    reply: FastifyReply
  ) {
    const { code } = deliveryCodeParamsSchema.parse(request.params);
    const { versionFrom, versionTo } = versionDiffQuerySchema.parse(request.query);

    const diff = await logisticsMailService.getVersionDiff(code, versionFrom, versionTo);
    return reply.send(diff);
  }

  /**
   * GET /logistics/calendar
   * Pobiera kalendarz dostaw (pogrupowane po datach)
   */
  async getCalendar(
    request: FastifyRequest<{ Querystring: { from: string; to: string } }>,
    reply: FastifyReply
  ) {
    const { from, to } = calendarQuerySchema.parse(request.query);

    const calendar = await logisticsMailService.getDeliveryCalendar(
      new Date(from),
      new Date(to)
    );

    return reply.send(calendar);
  }

  /**
   * PATCH /logistics/items/:id
   * Aktualizuje pozycję mailową (np. ręczne przypisanie Order)
   */
  async updateMailItem(
    request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
    reply: FastifyReply
  ) {
    const { id } = mailItemParamsSchema.parse(request.params);
    const data = updateMailItemSchema.parse(request.body);

    const item = await logisticsMailService.updateItem(parseInt(id, 10), {
      orderId: data.orderId,
      flags: data.flags,
    });

    return reply.send(item);
  }
}

// Singleton instance
export const logisticsHandler = new LogisticsHandler();
