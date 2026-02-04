/**
 * Deliveries API module
 */

import type {
  Delivery,
  CreateDeliveryData,
  UpdateDeliveryData,
  DeliveryCalendarData,
  DeliveryProtocol,
  DeliveryItem,
  CreateDeliveryItemData,
  CompleteDeliveryData,
  Order,
  WorkingDay,
  Holiday,
} from '@/types';
import { fetchApi, API_URL, type ApiError } from '../api-client';
import { getAuthToken } from '../auth-token';
import type { ReadinessResult } from './orders';

// Dostawy
export const deliveriesApi = {
  getAll: async (params?: { from?: string; to?: string; status?: string }): Promise<Delivery[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await fetchApi<{ data: Delivery[]; total: number } | Delivery[]>(`/api/deliveries${query ? `?${query}` : ''}`);
    // Handle both paginated response { data: [...] } and direct array response
    return Array.isArray(response) ? response : response.data;
  },
  getCalendar: (month: number, year: number) =>
    fetchApi<DeliveryCalendarData>(`/api/deliveries/calendar?month=${month}&year=${year}`),
  getCalendarBatch: (months: Array<{ month: number; year: number }>) =>
    fetchApi<{
      deliveries: Delivery[];
      unassignedOrders: Order[];
      workingDays: WorkingDay[];
      holidays: Holiday[];
    }>(`/api/deliveries/calendar-batch?months=${encodeURIComponent(JSON.stringify(months))}`),
  getById: (id: number) => fetchApi<Delivery>(`/api/deliveries/${id}`),
  getProfileRequirements: (params?: { from?: string }) => {
    console.log('[API] getProfileRequirements called with params:', params);
    const query = new URLSearchParams();
    if (params?.from) {
      query.append('from', params.from);
    }
    const queryString = query.toString();
    console.log('[API] Query string:', queryString);
    const url = `/api/deliveries/profile-requirements${queryString ? `?${queryString}` : ''}`;
    console.log('[API] Final URL:', url);
    return fetchApi<Array<{ deliveryId: number; deliveryDate: string; profileId: number; colorCode: string; totalBeams: number }>>(url);
  },
  create: (data: CreateDeliveryData) =>
    fetchApi<Delivery>('/api/deliveries', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateDeliveryData) =>
    fetchApi<Delivery>(`/api/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/deliveries/${id}`, { method: 'DELETE' }),
  addOrder: (deliveryId: number, orderId: number) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/orders`, {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
  removeOrder: (deliveryId: number, orderId: number) =>
    fetchApi<void>(`/api/deliveries/${deliveryId}/orders/${orderId}`, { method: 'DELETE' }),
  moveOrder: (deliveryId: number, orderId: number, targetDeliveryId: number) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/move-order`, {
      method: 'POST',
      body: JSON.stringify({ orderId, targetDeliveryId }),
    }),
  getProtocol: (id: number) => fetchApi<DeliveryProtocol>(`/api/deliveries/${id}/protocol`),
  getProtocolPdf: async (deliveryId: number): Promise<Blob> => {
    const url = `${API_URL}/api/deliveries/${deliveryId}/protocol/pdf`;

    try {
      const token = await getAuthToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 210000); // 3.5 minutes

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
        const error: ApiError = new Error(data.error || `HTTP Error: ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return response.blob();
    } catch (error) {
      if (error instanceof TypeError) {
        const networkError: ApiError = new Error('Błąd połączenia sieciowego');
        networkError.status = 0;
        throw networkError;
      }
      throw error;
    }
  },
  addItem: (deliveryId: number, data: CreateDeliveryItemData) =>
    fetchApi<DeliveryItem>(`/api/deliveries/${deliveryId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteItem: (deliveryId: number, itemId: number) =>
    fetchApi<void>(`/api/deliveries/${deliveryId}/items/${itemId}`, { method: 'DELETE' }),
  completeOrders: (deliveryId: number, productionDate: string) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ productionDate }),
    }),
  completeAllOrders: (deliveryId: number, data: CompleteDeliveryData) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/complete-all-orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProfileStats: (months?: number) =>
    fetchApi<{
      stats: Array<{
        month: number;
        year: number;
        monthLabel: string;
        deliveriesCount: number;
        profiles: Array<{
          profileId: number;
          profileNumber: string;
          colorId: number;
          colorCode: string;
          colorName: string;
          totalBeams: number;
          totalMeters: number;
          deliveryCount: number;
        }>;
      }>;
    }>(`/api/deliveries/stats/profiles${months ? `?months=${months}` : ''}`),
  getWindowStats: (months?: number) =>
    fetchApi<{
      stats: Array<{
        month: number;
        year: number;
        monthLabel: string;
        deliveriesCount: number;
        totalWindows: number;
        totalSashes: number;
        totalGlasses: number;
      }>;
    }>(`/api/deliveries/stats/windows${months ? `?months=${months}` : ''}`),
  getWindowStatsByWeekday: (months?: number) =>
    fetchApi<{
      stats: Array<{
        weekday: number;
        weekdayName: string;
        deliveriesCount: number;
        totalWindows: number;
        totalSashes: number;
        totalGlasses: number;
        avgWindowsPerDelivery: number;
        avgSashesPerDelivery: number;
        avgGlassesPerDelivery: number;
      }>;
      periodStart: string;
      periodEnd: string;
    }>(`/api/deliveries/stats/windows/by-weekday${months ? `?months=${months}` : ''}`),
  // P1-R4: Get shipping readiness checklist (System Brain)
  getReadiness: (id: number) => fetchApi<ReadinessResult>(`/api/deliveries/${id}/readiness`),

  // QW-1: Batch readiness - jeden request zamiast N (optymalizacja kalendarza)
  getBatchReadiness: (ids: number[]): Promise<Record<number, ReadinessResult>> => {
    if (ids.length === 0) return Promise.resolve({});
    const idsParam = ids.join(',');
    return fetchApi<Record<number, ReadinessResult>>(`/api/deliveries/readiness/batch?ids=${idsParam}`);
  },
};
