/**
 * Logistics routes - parsowanie maili z listami dostaw
 *
 * Endpointy:
 * - POST /parse - parsuj tekst maila (bez zapisu)
 * - POST /mail-lists - zapisz sparsowaną listę
 * - GET /mail-lists - lista wszystkich list (z filtrami)
 * - GET /mail-lists/:id - szczegóły listy
 * - DELETE /mail-lists/:id - soft delete listy
 * - GET /deliveries/:code/versions - wszystkie wersje dla kodu dostawy
 * - GET /deliveries/:code/latest - najnowsza wersja dla kodu dostawy
 * - GET /deliveries/:code/diff - diff między wersjami
 * - GET /calendar - kalendarz dostaw
 * - PATCH /items/:id - aktualizuj pozycję
 *
 * Akcje dla systemu decyzji diff:
 * - DELETE /items/:id/remove - usuń pozycję z dostawy (soft delete)
 * - POST /items/:id/confirm - potwierdź dodaną pozycję
 * - DELETE /items/:id/reject - odrzuć dodaną pozycję (soft delete)
 * - POST /items/:id/accept-change - zaakceptuj zmianę
 * - POST /items/:id/restore - przywróć poprzednią wartość
 */

import type { FastifyPluginAsync } from 'fastify';
import { logisticsHandler } from '../handlers/logisticsHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const logisticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Wszystkie endpointy wymagają autentykacji
  fastify.addHook('preHandler', verifyAuth);

  // ========== PARSOWANIE ==========

  /**
   * POST /logistics/parse
   * Parsuje tekst maila i zwraca ustrukturyzowane dane (bez zapisu)
   */
  fastify.post<{ Body: { mailText: string } }>('/parse', logisticsHandler.parseEmail.bind(logisticsHandler));

  // ========== MAIL LISTS ==========

  /**
   * POST /logistics/mail-lists
   * Zapisuje sparsowaną listę mailową do bazy
   */
  fastify.post<{ Body: unknown }>('/mail-lists', logisticsHandler.saveMailList.bind(logisticsHandler));

  /**
   * GET /logistics/mail-lists
   * Pobiera listę wszystkich list mailowych z filtrami
   */
  fastify.get<{ Querystring: { from?: string; to?: string; deliveryCode?: string; includeDeleted?: string } }>(
    '/mail-lists',
    logisticsHandler.getMailLists.bind(logisticsHandler)
  );

  /**
   * GET /logistics/mail-lists/:id
   * Pobiera szczegóły listy mailowej po ID
   */
  fastify.get<{ Params: { id: string } }>('/mail-lists/:id', logisticsHandler.getMailListById.bind(logisticsHandler));

  /**
   * DELETE /logistics/mail-lists/:id
   * Soft delete listy mailowej
   */
  fastify.delete<{ Params: { id: string } }>('/mail-lists/:id', logisticsHandler.deleteMailList.bind(logisticsHandler));

  // ========== DELIVERIES (wersjonowanie) ==========

  /**
   * GET /logistics/deliveries/:code/versions
   * Pobiera wszystkie wersje dla danego kodu dostawy
   */
  fastify.get<{ Params: { code: string } }>(
    '/deliveries/:code/versions',
    logisticsHandler.getVersionsByDeliveryCode.bind(logisticsHandler)
  );

  /**
   * GET /logistics/deliveries/:code/latest
   * Pobiera najnowszą wersję dla danego kodu dostawy
   */
  fastify.get<{ Params: { code: string } }>(
    '/deliveries/:code/latest',
    logisticsHandler.getLatestVersion.bind(logisticsHandler)
  );

  /**
   * GET /logistics/deliveries/:code/diff
   * Porównuje dwie wersje listy dla danego kodu dostawy
   */
  fastify.get<{ Params: { code: string }; Querystring: { versionFrom: string; versionTo: string } }>(
    '/deliveries/:code/diff',
    logisticsHandler.getVersionDiff.bind(logisticsHandler)
  );

  // ========== KALENDARZ ==========

  /**
   * GET /logistics/calendar
   * Pobiera kalendarz dostaw (pogrupowane po datach)
   */
  fastify.get<{ Querystring: { from: string; to: string } }>('/calendar', logisticsHandler.getCalendar.bind(logisticsHandler));

  // ========== ITEMS ==========

  /**
   * PATCH /logistics/items/:id
   * Aktualizuje pozycję mailową (np. ręczne przypisanie Order)
   */
  fastify.patch<{ Params: { id: string }; Body: unknown }>('/items/:id', logisticsHandler.updateMailItem.bind(logisticsHandler));

  // ========== AKCJE DLA SYSTEMU DECYZJI DIFF ==========

  /**
   * DELETE /logistics/items/:id/remove
   * Usuwa pozycję z dostawy (soft delete)
   */
  fastify.delete<{ Params: { id: string } }>(
    '/items/:id/remove',
    logisticsHandler.removeItemFromDelivery.bind(logisticsHandler)
  );

  /**
   * POST /logistics/items/:id/confirm
   * Potwierdza dodaną pozycję
   */
  fastify.post<{ Params: { id: string } }>(
    '/items/:id/confirm',
    logisticsHandler.confirmAddedItem.bind(logisticsHandler)
  );

  /**
   * DELETE /logistics/items/:id/reject
   * Odrzuca dodaną pozycję (soft delete)
   */
  fastify.delete<{ Params: { id: string } }>(
    '/items/:id/reject',
    logisticsHandler.rejectAddedItem.bind(logisticsHandler)
  );

  /**
   * POST /logistics/items/:id/accept-change
   * Akceptuje zmianę pozycji
   */
  fastify.post<{ Params: { id: string } }>(
    '/items/:id/accept-change',
    logisticsHandler.acceptItemChange.bind(logisticsHandler)
  );

  /**
   * POST /logistics/items/:id/restore
   * Przywraca poprzednią wartość pozycji
   */
  fastify.post<{ Params: { id: string }; Body: { field: string; previousValue: string } }>(
    '/items/:id/restore',
    logisticsHandler.restoreItemValue.bind(logisticsHandler)
  );
};
