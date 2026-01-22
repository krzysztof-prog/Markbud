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

    // Zwracamy wrapper VersionDiffResponse zgodny z frontendem
    return reply.send({
      deliveryCode: code,
      versionFrom,
      versionTo,
      diff,
    });
  }

  /**
   * GET /logistics/calendar
   * Pobiera kalendarz dostaw (pogrupowane po datach)
   *
   * Zwraca obiekt CalendarResponse:
   * { entries: CalendarEntry[], dateFrom: string, dateTo: string }
   */
  async getCalendar(
    request: FastifyRequest<{ Querystring: { from: string; to: string } }>,
    reply: FastifyReply
  ) {
    const { from, to } = calendarQuerySchema.parse(request.query);

    const entries = await logisticsMailService.getDeliveryCalendar(
      new Date(from),
      new Date(to)
    );

    // Zwróć obiekt CalendarResponse zgodny z oczekiwaniami frontendu
    return reply.send({
      entries,
      dateFrom: from,
      dateTo: to,
    });
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

  // ========== AKCJE DLA SYSTEMU DECYZJI DIFF ==========

  /**
   * DELETE /logistics/items/:id/remove
   * Usuwa pozycję z dostawy (soft delete)
   * Używane dla pozycji usuniętych z maila - użytkownik potwierdza usunięcie
   */
  async removeItemFromDelivery(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = mailItemParamsSchema.parse(request.params);
    await logisticsMailService.removeItemFromDelivery(parseInt(id, 10));
    return reply.status(204).send();
  }

  /**
   * POST /logistics/items/:id/confirm
   * Potwierdza dodaną pozycję
   * Używane dla nowych pozycji w mailu - użytkownik akceptuje
   */
  async confirmAddedItem(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = mailItemParamsSchema.parse(request.params);
    const item = await logisticsMailService.confirmAddedItem(parseInt(id, 10));
    return reply.send(item);
  }

  /**
   * DELETE /logistics/items/:id/reject
   * Odrzuca dodaną pozycję (soft delete)
   * Używane dla nowych pozycji w mailu - użytkownik odrzuca
   */
  async rejectAddedItem(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = mailItemParamsSchema.parse(request.params);
    await logisticsMailService.rejectAddedItem(parseInt(id, 10));
    return reply.status(204).send();
  }

  /**
   * POST /logistics/items/:id/accept-change
   * Akceptuje zmianę pozycji (oznacza jako potwierdzone)
   * Używane dla zmienionych pozycji - użytkownik akceptuje nową wartość
   */
  async acceptItemChange(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = mailItemParamsSchema.parse(request.params);
    const item = await logisticsMailService.acceptItemChange(parseInt(id, 10));
    return reply.send(item);
  }

  /**
   * POST /logistics/items/:id/restore
   * Przywraca poprzednią wartość pozycji
   * Używane dla zmienionych pozycji - użytkownik chce przywrócić starą wartość
   */
  async restoreItemValue(
    request: FastifyRequest<{ Params: { id: string }; Body: { field: string; previousValue: string } }>,
    reply: FastifyReply
  ) {
    const { id } = mailItemParamsSchema.parse(request.params);
    const { field, previousValue } = request.body;

    const item = await logisticsMailService.restoreItemValue(
      parseInt(id, 10),
      field,
      previousValue
    );

    return reply.send(item);
  }
}

// Singleton instance
export const logisticsHandler = new LogisticsHandler();
