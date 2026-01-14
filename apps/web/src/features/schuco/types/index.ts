/**
 * Typy dla modułu Schuco
 *
 * Re-eksportuje typy z centralnego modułu types oraz definiuje
 * lokalne typy specyficzne dla feature Schuco.
 */

// Re-eksport głównych typów Schuco
export type {
  SchucoDelivery,
  SchucoFetchLog,
  SchucoRefreshResponse,
  SchucoDeliveriesResponse,
  SchucoDeliveryLink,
  SchucoSyncLinksResponse,
} from '@/types/schuco';

/**
 * Informacja o zmienionej wartości pola
 */
export interface ChangedFieldInfo {
  field: string;
  oldValue: string | null;
}

/**
 * Statystyki zmian w dostawach
 */
export interface DeliveryChangeCounts {
  new: number;
  updated: number;
}

/**
 * Statystyki pobrane z API
 */
export interface SchucoStatistics {
  total: number;
  new: number;
  updated: number;
  unchanged: number;
}

/**
 * Dane tygodnia z dostawami
 */
export interface WeekData {
  week: string;
  weekStart: string | null;
  count: number;
  deliveries: WeekDelivery[];
}

/**
 * Uproszczona dostawa w widoku tygodniowym
 */
export interface WeekDelivery {
  id: number;
  orderNumber: string;
  orderName: string;
  shippingStatus: string;
  totalAmount: string | null;
  extractedOrderNums: string | null;
  changeType: string | null;
  changedFields: string | null;
}

/**
 * Odpowiedź z API dla widoku tygodniowego
 */
export interface ByWeekResponse {
  weeks: WeekData[];
}

/**
 * Stan paginacji
 */
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

/**
 * Propsy dla komponentu paginacji
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
