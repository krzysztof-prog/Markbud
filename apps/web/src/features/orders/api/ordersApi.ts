/**
 * Orders API Service
 */

import { fetchApi, API_URL } from '@/lib/api-client';
import { getAuthToken } from '@/lib/auth-token';
import type {
  Order,
  OrderWithRequirements,
  CreateOrderData,
  UpdateOrderData,
  OrderTableData,
  RequirementTotal,
} from '@/types';

export const ordersApi = {
  /**
   * Pobierz wszystkie zlecenia z opcjonalnymi filtrami
   */
  getAll: (params?: { status?: string; archived?: string; colorId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<OrderWithRequirements[]>(`/api/orders${query ? `?${query}` : ''}`);
  },

  /**
   * Pobierz zlecenie po ID
   */
  getById: (id: number) =>
    fetchApi<OrderWithRequirements>(`/api/orders/${id}`),

  /**
   * Pobierz tabelę zleceń dla koloru
   */
  getTable: (colorId: number) =>
    fetchApi<OrderTableData>(`/api/orders/table/${colorId}`),

  /**
   * Pobierz sumy zapotrzebowań
   */
  getRequirementsTotals: () =>
    fetchApi<RequirementTotal[]>('/api/orders/requirements/totals'),

  /**
   * Sprawdź czy PDF zlecenia istnieje
   */
  getPdf: async (id: number): Promise<boolean> => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/orders/${id}/pdf`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Utwórz nowe zlecenie
   */
  create: (data: CreateOrderData) =>
    fetchApi<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Zaktualizuj zlecenie
   */
  update: (id: number, data: UpdateOrderData) =>
    fetchApi<Order>(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Archiwizuj zlecenie
   */
  archive: (id: number) =>
    fetchApi<Order>(`/api/orders/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * Przywróć zlecenie z archiwum
   */
  unarchive: (id: number) =>
    fetchApi<Order>(`/api/orders/${id}/unarchive`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * Usuń zlecenie
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/orders/${id}`, { method: 'DELETE' }),

  /**
   * Aktualizuj ręczny status zlecenia
   * @param id - ID zlecenia
   * @param manualStatus - 'do_not_cut' | 'cancelled' | 'on_hold' | 'complaint' | 'service' | null
   */
  updateManualStatus: (id: number, manualStatus: 'do_not_cut' | 'cancelled' | 'on_hold' | 'complaint' | 'service' | null) =>
    fetchApi<Order>(`/api/orders/${id}/manual-status`, {
      method: 'PATCH',
      body: JSON.stringify({ manualStatus }),
    }),
};
