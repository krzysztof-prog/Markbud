/**
 * Okuc Orders API Client
 *
 * Backend routes: apps/api/src/routes/okuc/orders.ts
 *
 * Zarządzanie zamówieniami okuć do dostawcy
 */

import { fetchApi, uploadFile } from '@/lib/api-client';
import type {
  OkucOrder,
  CreateOkucOrderInput,
  UpdateOkucOrderInput,
  ReceiveOrderInput,
  ParsedOrderImport,
  ConfirmOrderImportInput,
  ConfirmOrderImportResult,
} from '@/types/okuc';

export const okucOrdersApi = {
  /**
   * GET /api/okuc/orders
   * Pobierz wszystkie zamówienia z opcjonalnymi filtrami
   */
  getAll: (filters?: {
    status?: string;
    basketType?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.basketType) params.append('basketType', filters.basketType);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);

    const queryString = params.toString();
    return fetchApi<OkucOrder[]>(`/api/okuc/orders${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/orders/stats
   * Pobierz statystyki zamówień
   */
  getStats: () =>
    fetchApi<{
      total: number;
      byStatus: Record<string, number>;
      byBasketType: Record<string, number>;
    }>('/api/okuc/orders/stats'),

  /**
   * GET /api/okuc/orders/:id
   * Pobierz zamówienie po ID
   */
  getById: (id: number) =>
    fetchApi<OkucOrder>(`/api/okuc/orders/${id}`),

  /**
   * POST /api/okuc/orders
   * Utwórz nowe zamówienie
   */
  create: (data: CreateOkucOrderInput) =>
    fetchApi<OkucOrder>('/api/okuc/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PUT /api/okuc/orders/:id
   * Zaktualizuj zamówienie
   */
  update: (id: number, data: UpdateOkucOrderInput) =>
    fetchApi<OkucOrder>(`/api/okuc/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * POST /api/okuc/orders/:id/receive
   * Oznacz zamówienie jako odebrane i zaktualizuj odebrane ilości
   */
  receive: (id: number, data: ReceiveOrderInput) =>
    fetchApi<OkucOrder>(`/api/okuc/orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/okuc/orders/:id
   * Usuń zamówienie (tylko jeśli jest w statusie draft)
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/okuc/orders/${id}`, {
      method: 'DELETE',
    }),

  // ========================
  // IMPORT Z XLSX
  // ========================

  /**
   * POST /api/okuc/orders/import/parse
   * Parsuje plik XLSX i zwraca podgląd danych do zatwierdzenia
   */
  parseImport: (file: File): Promise<ParsedOrderImport> => {
    return uploadFile<ParsedOrderImport>('/api/okuc/orders/import/parse', file);
  },

  /**
   * POST /api/okuc/orders/import/confirm
   * Zatwierdza import i tworzy zamówienie
   */
  confirmImport: (data: ConfirmOrderImportInput) =>
    fetchApi<ConfirmOrderImportResult>('/api/okuc/orders/import/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
