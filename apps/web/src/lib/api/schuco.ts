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
    }),
};
