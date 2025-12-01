/**
 * Deliveries API Service
 */

import { fetchApi } from '@/lib/api-client';
import type {
  Delivery,
  DeliveryWithOrders,
  CreateDeliveryData,
  UpdateDeliveryData,
  DeliveryCalendarData,
  DeliveryProtocol,
  CreateDeliveryItemData,
} from '@/types';

export const deliveriesApi = {
  /**
   * Pobierz wszystkie dostawy z opcjonalnymi filtrami
   */
  getAll: (params?: { from?: string; to?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<Delivery[]>(`/api/deliveries${query ? `?${query}` : ''}`);
  },

  /**
   * Pobierz kalendarz dostaw dla miesiąca
   */
  getCalendar: (month: number, year: number) =>
    fetchApi<DeliveryCalendarData>(`/api/deliveries/calendar?month=${month}&year=${year}`),

  /**
   * Pobierz dostawę po ID
   */
  getById: (id: number) =>
    fetchApi<DeliveryWithOrders>(`/api/deliveries/${id}`),

  /**
   * Utwórz nową dostawę
   */
  create: (data: CreateDeliveryData) =>
    fetchApi<Delivery>('/api/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Zaktualizuj dostawę
   */
  update: (id: number, data: UpdateDeliveryData) =>
    fetchApi<Delivery>(`/api/deliveries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń dostawę
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/deliveries/${id}`, { method: 'DELETE' }),

  /**
   * Przypisz zlecenie do dostawy
   */
  addOrder: (deliveryId: number, orderId: number) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/orders`, {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),

  /**
   * Usuń zlecenie z dostawy
   */
  removeOrder: (deliveryId: number, orderId: number) =>
    fetchApi<void>(`/api/deliveries/${deliveryId}/orders/${orderId}`, {
      method: 'DELETE',
    }),

  /**
   * Przenieś zlecenie między dostawami
   */
  moveOrder: (deliveryId: number, orderId: number, targetDeliveryId: number) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/move-order`, {
      method: 'POST',
      body: JSON.stringify({ orderId, targetDeliveryId }),
    }),

  /**
   * Pobierz protokół dostawy
   */
  getProtocol: (id: number) =>
    fetchApi<DeliveryProtocol>(`/api/deliveries/${id}/protocol`),

  /**
   * Dodaj element do dostawy
   */
  addItem: (deliveryId: number, data: CreateDeliveryItemData) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń element z dostawy
   */
  deleteItem: (deliveryId: number, itemId: number) =>
    fetchApi<void>(`/api/deliveries/${deliveryId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  /**
   * Zakończ dostawę (complete orders)
   */
  completeOrders: (deliveryId: number, productionDate: string) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ productionDate }),
    }),
};
