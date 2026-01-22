/**
 * Logistics API Client
 *
 * Backend routes: apps/api/src/routes/logistics.ts
 *
 * Modul logistyki - parsowanie maili z listami projektow na dostawy,
 * zarzadzanie wersjami list mailowych i kalendarz dostaw.
 */

import { fetchApi } from '@/lib/api-client';
import type {
  ParseResult,
  MailList,
  MailListWithStatus,
  MailListFilters,
  MailListsResponse,
  SaveMailListInput,
  UpdateMailItemInput,
  MailItem,
  CalendarResponse,
  VersionDiffResponse,
} from '../types';

/**
 * Dane wejsciowe do parsowania emaila
 */
export interface ParseEmailInput {
  mailText: string;
}

export const logisticsApi = {
  // ============================================================================
  // PARSOWANIE MAILI
  // ============================================================================

  /**
   * POST /api/logistics/parse
   * Parsuje tekst maila i zwraca wyodrebnione dane
   */
  parseEmail: (data: ParseEmailInput) =>
    fetchApi<ParseResult>('/api/logistics/parse', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ============================================================================
  // LISTY MAILOWE (MAIL LISTS)
  // ============================================================================

  /**
   * GET /api/logistics/mail-lists
   * Pobiera listy mailowe z opcjonalnymi filtrami
   */
  getAll: (filters?: MailListFilters) => {
    const params = new URLSearchParams();
    if (filters?.deliveryCode) params.append('deliveryCode', filters.deliveryCode);
    if (filters?.deliveryDateFrom) params.append('deliveryDateFrom', filters.deliveryDateFrom);
    if (filters?.deliveryDateTo) params.append('deliveryDateTo', filters.deliveryDateTo);
    if (filters?.includeDeleted !== undefined) {
      params.append('includeDeleted', String(filters.includeDeleted));
    }

    const queryString = params.toString();
    return fetchApi<MailListsResponse>(
      `/api/logistics/mail-lists${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * GET /api/logistics/mail-lists/:id
   * Pobiera liste mailowa po ID z wszystkimi pozycjami
   */
  getById: (id: number) =>
    fetchApi<MailListWithStatus>(`/api/logistics/mail-lists/${id}`),

  /**
   * POST /api/logistics/mail-lists
   * Zapisuje sparsowana liste mailowa w bazie
   */
  save: (data: SaveMailListInput) =>
    fetchApi<MailList>('/api/logistics/mail-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/logistics/mail-lists/:id
   * Usuwa liste mailowa (soft delete)
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/logistics/mail-lists/${id}`, {
      method: 'DELETE',
    }),

  // ============================================================================
  // WERSJE DOSTAW
  // ============================================================================

  /**
   * GET /api/logistics/deliveries/:code/versions
   * Pobiera wszystkie wersje listy dla danego kodu dostawy
   */
  getVersionsByCode: (code: string) =>
    fetchApi<MailListWithStatus[]>(`/api/logistics/deliveries/${encodeURIComponent(code)}/versions`),

  /**
   * GET /api/logistics/deliveries/:code/latest
   * Pobiera najnowsza wersje listy dla danego kodu dostawy
   */
  getLatestVersion: (code: string) =>
    fetchApi<MailListWithStatus>(`/api/logistics/deliveries/${encodeURIComponent(code)}/latest`),

  /**
   * GET /api/logistics/deliveries/:code/diff
   * Pobiera roznice miedzy dwiema wersjami listy
   */
  getVersionDiff: (code: string, versionFrom: number, versionTo: number) => {
    const params = new URLSearchParams();
    params.append('versionFrom', String(versionFrom));
    params.append('versionTo', String(versionTo));

    return fetchApi<VersionDiffResponse>(
      `/api/logistics/deliveries/${encodeURIComponent(code)}/diff?${params.toString()}`
    );
  },

  // ============================================================================
  // KALENDARZ DOSTAW
  // ============================================================================

  /**
   * GET /api/logistics/calendar
   * Pobiera kalendarz dostaw dla podanego zakresu dat
   */
  getCalendar: (from: string, to: string) => {
    const params = new URLSearchParams();
    params.append('from', from);
    params.append('to', to);

    return fetchApi<CalendarResponse>(`/api/logistics/calendar?${params.toString()}`);
  },

  // ============================================================================
  // POZYCJE (MAIL ITEMS)
  // ============================================================================

  /**
   * PATCH /api/logistics/items/:id
   * Aktualizuje pozycje na liscie (np. przypisanie zlecenia, zmiana flag)
   */
  updateItem: (id: number, data: UpdateMailItemInput) =>
    fetchApi<MailItem>(`/api/logistics/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ============================================================================
  // AKCJE DLA SYSTEMU DECYZJI DIFF
  // ============================================================================

  /**
   * DELETE /api/logistics/items/:id/remove
   * Usuwa pozycję z dostawy (soft delete)
   * Używane dla pozycji usuniętych z maila - użytkownik potwierdza usunięcie
   */
  removeItemFromDelivery: (itemId: number) =>
    fetchApi<void>(`/api/logistics/items/${itemId}/remove`, {
      method: 'DELETE',
    }),

  /**
   * POST /api/logistics/items/:id/confirm
   * Potwierdza dodaną pozycję
   * Używane dla nowych pozycji w mailu - użytkownik akceptuje
   */
  confirmAddedItem: (itemId: number) =>
    fetchApi<MailItem>(`/api/logistics/items/${itemId}/confirm`, {
      method: 'POST',
    }),

  /**
   * DELETE /api/logistics/items/:id/reject
   * Odrzuca dodaną pozycję (soft delete)
   * Używane dla nowych pozycji w mailu - użytkownik odrzuca
   */
  rejectAddedItem: (itemId: number) =>
    fetchApi<void>(`/api/logistics/items/${itemId}/reject`, {
      method: 'DELETE',
    }),

  /**
   * POST /api/logistics/items/:id/accept-change
   * Akceptuje zmianę pozycji
   * Używane dla zmienionych pozycji - użytkownik akceptuje nową wartość
   */
  acceptItemChange: (itemId: number) =>
    fetchApi<MailItem>(`/api/logistics/items/${itemId}/accept-change`, {
      method: 'POST',
    }),

  /**
   * POST /api/logistics/items/:id/restore
   * Przywraca poprzednią wartość pozycji
   * Używane dla zmienionych pozycji - użytkownik chce przywrócić starą wartość
   */
  restoreItemValue: (itemId: number, field: string, previousValue: string) =>
    fetchApi<MailItem>(`/api/logistics/items/${itemId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ field, previousValue }),
    }),
};
