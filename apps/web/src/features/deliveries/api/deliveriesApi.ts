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

  // === Quick Delivery (Szybka dostawa) ===

  /**
   * Walidacja listy numerów zleceń
   * Sprawdza czy istnieją i czy są przypisane do innych dostaw
   */
  validateOrderNumbers: (orderNumbers: string) =>
    fetchApi<ValidateOrdersResult>('/api/deliveries/validate-orders', {
      method: 'POST',
      body: JSON.stringify({ orderNumbers }),
    }),

  /**
   * Masowe przypisanie zleceń do dostawy
   */
  bulkAssignOrders: (params: {
    orderIds: number[];
    deliveryId?: number;
    deliveryDate?: string;
    reassignOrderIds?: number[];
  }) =>
    fetchApi<BulkAssignResult>('/api/deliveries/bulk-assign', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /**
   * Pobierz tygodniowy plan szkleń (Pon-Pt)
   */
  getWeeklyPlan: (weekStart: string) =>
    fetchApi<WeeklyPlanResponse>(`/api/deliveries/weekly-plan?weekStart=${encodeURIComponent(weekStart)}`),

  getFirstInProgressWeek: () =>
    fetchApi<{ weekStart: string }>('/api/deliveries/first-in-progress-week'),

  /**
   * Pobierz dostawy na określoną datę (do wyboru w UI)
   */
  getDeliveriesForDate: (date: string) =>
    fetchApi<DeliveryForDate[]>(`/api/deliveries/for-date?date=${encodeURIComponent(date)}`),

  /**
   * Podgląd numeru następnej dostawy dla daty
   */
  previewDeliveryNumber: (date: string) =>
    fetchApi<{ deliveryNumber: string }>(`/api/deliveries/preview-number?date=${encodeURIComponent(date)}`),

  // === Production Actions ===

  /**
   * Rozpocznij produkcję dla wybranych zleceń
   */
  startProduction: (orderIds: number[], deliveryIds: number[]) =>
    fetchApi<void>('/api/orders/bulk-update-status', {
      method: 'POST',
      body: JSON.stringify({ orderIds, deliveryIds, status: 'in_progress', skipWarehouseValidation: true }),
    }),

  /**
   * Zakończ wszystkie zlecenia w dostawie
   */
  completeAllOrders: (deliveryId: number, productionDate: string) =>
    fetchApi<void>(`/api/deliveries/${deliveryId}/complete-all-orders`, {
      method: 'POST',
      body: JSON.stringify({ productionDate }),
    }),

  /**
   * Zakończ wybrane zlecenia (bulk)
   */
  completeSelectedOrders: (orderIds: number[], productionDate: string) =>
    fetchApi<void>('/api/orders/bulk-update-status', {
      method: 'POST',
      body: JSON.stringify({ orderIds, status: 'completed', productionDate }),
    }),
};

// === Typy dla Quick Delivery ===

export interface ValidatedOrder {
  orderNumber: string;
  orderId: number;
  status: 'found' | 'not_found' | 'already_assigned';
  matchedFrom?: string;
  currentDelivery?: {
    deliveryId: number;
    deliveryNumber: string | null;
    deliveryDate: string;
  };
  orderInfo?: {
    client: string | null;
    totalWindows: number | null;
    status: string | null;
  };
}

export interface ValidateOrdersResult {
  found: ValidatedOrder[];
  notFound: string[];
  alreadyAssigned: ValidatedOrder[];
  canProceed: boolean;
}

export interface BulkAssignResult {
  success: boolean;
  delivery: {
    id: number;
    deliveryNumber: string | null;
    deliveryDate: string;
  };
  assignedCount: number;
  reassignedCount: number;
  details: {
    assigned: number[];
    reassigned: number[];
    skipped: number[];
  };
}

export interface DeliveryForDate {
  id: number;
  deliveryNumber: string | null;
  ordersCount: number;
}

// === WEEKLY PLAN (Tygodniówka) ===

export interface WeeklyPlanOrder {
  orderId: number;
  orderNumber: string;
  totalGlasses: number;
  totalWindows: number;
  totalSashes: number;
  orderedGlassCount: number;
  deliveredGlassCount: number;
  glassDeliveryDate: string | null;
  glassOrderStatus: string | null;
  glassOrderNote: string | null;
  client: string | null;
  project: string | null;
  orderStatus: string | null;
  hasSuffixMatchedGlass?: boolean;
}

export interface WeeklyPlanNietypowka {
  id: number;
  description: string;
  quantity: number;
}

export interface WeeklyPlanPrivateOrder {
  id: number;
  description: string;
  quantity: number;
}

export interface WeeklyPlanNote {
  id: number;
  description: string;
}

export interface WeeklyPlanDelivery {
  id: number;
  deliveryNumber: string | null;
  status: string;
  orders: WeeklyPlanOrder[];
  notes: WeeklyPlanNote[];
  nietypowki: WeeklyPlanNietypowka[];
  prywatne: WeeklyPlanPrivateOrder[];
  totalGlassCount: number;
  totalWindows: number;
  totalSashes: number;
}

export interface WeeklyPlanDay {
  date: string;
  dayName: string;
  deliveries: WeeklyPlanDelivery[];
  dayTotalGlass: number;
  dayTotalWindows: number;
  dayTotalSashes: number;
}

export interface WeeklyPlanResponse {
  weekStart: string;
  days: WeeklyPlanDay[];
  weekTotalGlass: number;
  weekTotalWindows: number;
  weekTotalSashes: number;
}
