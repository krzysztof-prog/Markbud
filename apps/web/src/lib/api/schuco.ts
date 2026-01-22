/**
 * Schuco API module
 */

import { fetchApi } from '../api-client';

// Schuco
export const schucoApi = {
  getDeliveries: (page = 1, pageSize = 100) =>
    fetchApi<import('@/types').SchucoDeliveriesResponse>(
      `/api/schuco/deliveries?page=${page}&pageSize=${pageSize}`
    ),
  refresh: (headless = true) =>
    fetchApi<import('@/types').SchucoRefreshResponse>('/api/schuco/refresh', {
      method: 'POST',
      body: JSON.stringify({ headless }),
    }),
  getStatus: () =>
    fetchApi<import('@/types').SchucoFetchLog>('/api/schuco/status'),
  getLogs: () =>
    fetchApi<import('@/types').SchucoFetchLog[]>('/api/schuco/logs'),
  getStatistics: () =>
    fetchApi<{ total: number; new: number; updated: number; unchanged: number }>(
      '/api/schuco/statistics'
    ),
  getTotalChangedCounts: () =>
    fetchApi<{ newCount: number; updatedCount: number; totalCount: number }>(
      '/api/schuco/debug/changed'
    ),
  getByWeek: () =>
    fetchApi<{
      weeks: Array<{
        week: string;
        weekStart: string | null;
        count: number;
        deliveries: Array<{
          id: number;
          orderNumber: string;
          orderName: string;
          shippingStatus: string;
          totalAmount: string | null;
          extractedOrderNums: string | null;
          changeType: string | null;
          changedFields: string | null;
        }>;
      }>;
    }>('/api/schuco/by-week'),
  cleanupPending: () =>
    fetchApi<{ cleaned: number; message: string }>('/api/schuco/cleanup-pending', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  // Archiwum
  getArchive: (page = 1, pageSize = 50) =>
    fetchApi<import('@/features/schuco').ArchiveResponse>(
      `/api/schuco/archive?page=${page}&pageSize=${pageSize}`
    ),
  getArchiveStats: () =>
    fetchApi<import('@/features/schuco').ArchiveStats>('/api/schuco/archive/stats'),
  runArchive: () =>
    fetchApi<{ archivedCount: number; message: string }>('/api/schuco/archive/run', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  // Ustawienia filtra dni
  getFilterDays: () =>
    fetchApi<{ days: number }>('/api/schuco/settings/filter-days'),
  setFilterDays: (days: number) =>
    fetchApi<{ days: number; message: string }>('/api/schuco/settings/filter-days', {
      method: 'PUT',
      body: JSON.stringify({ days }),
    }),
  // Ustawienia filtra daty (konkretna data, ma priorytet nad dni)
  getFilterDate: () =>
    fetchApi<{ date: string | null }>('/api/schuco/settings/filter-date'),
  setFilterDate: (date: string) =>
    fetchApi<{ date: string; message: string }>('/api/schuco/settings/filter-date', {
      method: 'PUT',
      body: JSON.stringify({ date }),
    }),
  clearFilterDate: () =>
    fetchApi<{ message: string }>('/api/schuco/settings/filter-date', {
      method: 'DELETE',
    }),
  // Anulowanie importu
  cancelImport: () =>
    fetchApi<{ cancelled: boolean; message: string }>('/api/schuco/cancel', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  isImportRunning: () =>
    fetchApi<{ isRunning: boolean }>('/api/schuco/is-running'),

  // ============================================
  // Pozycje zamówień (items/artykuły)
  // ============================================

  /** Pobiera pozycje dla konkretnego zamówienia */
  getItems: (deliveryId: number) =>
    fetchApi<import('@/types').SchucoOrderItem[]>(`/api/schuco/items/${deliveryId}`),

  /** Statystyki pozycji - ile zamówień ma pobrane pozycje */
  getItemsStats: () =>
    fetchApi<import('@/types').SchucoItemsStats>('/api/schuco/items/stats'),

  /** Ręczne pobieranie pozycji */
  fetchItems: (options?: { limit?: number; deliveryIds?: number[] }) =>
    fetchApi<import('@/types').SchucoItemsFetchResult>('/api/schuco/items/fetch', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  /** Sprawdza czy pobieranie pozycji jest w trakcie */
  isItemsFetchRunning: () =>
    fetchApi<{ isRunning: boolean }>('/api/schuco/items/is-running'),

  /** Czyści stare markery zmian */
  clearOldItemChanges: () =>
    fetchApi<{ cleared: number; message: string }>('/api/schuco/items/clear-old-changes', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
