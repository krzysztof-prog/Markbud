/**
 * Typy dla zestawienia zleceń
 */

import type { Order, SchucoDeliveryLink } from '@/types';

// ================================
// Podstawowe interfejsy danych
// ================================

/**
 * Okno w zleceniu
 */
export interface OrderWindow {
  id?: number;
  reference?: string;
  profileType?: string;
}

/**
 * Liczniki w zleceniu (_count z Prisma)
 */
export interface OrderCount {
  windows?: number;
}

/**
 * Informacje o dostawie zlecenia
 */
export interface DeliveryOrderInfo {
  id?: number;
  deliveryId: number;
  position: number;
  delivery?: {
    id?: number;
    deliveryDate?: string;
    deliveryNumber?: string;
    status?: string;
  };
}

/**
 * Rozszerzony typ zlecenia z dodatkowymi właściwościami z importu PDF
 */
export interface ExtendedOrder extends Order {
  client?: string;
  project?: string;
  system?: string;
  documentAuthor?: string | null;
  totalWindows?: number;
  totalSashes?: number;
  glasses?: number;
  totalGlasses?: number;
  glassDelivery?: string;
  glassDeliveryDate?: string;
  orderedGlassCount?: number;
  deliveredGlassCount?: number;
  invoiceNumber?: string;
  orderStatus?: string;
  pvcDelivery?: string;
  pvcDeliveryDate?: string;
  deliveryDate?: string;
  deadline?: string;
  archived?: boolean;
  windows?: OrderWindow[];
  _count?: OrderCount;
  schucoLinks?: SchucoDeliveryLink[];
  deliveryOrders?: DeliveryOrderInfo[];
  // Status okuć: 'none' | 'imported' | 'has_atypical' | 'pending'
  okucDemandStatus?: string;
}

// ================================
// Typy kolumn tabeli
// ================================

export type ColumnId =
  | 'orderNumber'
  | 'client'
  | 'project'
  | 'system'
  | 'documentAuthor'
  | 'productionDate'
  | 'totalWindows'
  | 'totalSashes'
  | 'glasses'
  | 'glassDeliveryDate'
  | 'okucDemandStatus'
  | 'valuePln'
  | 'valueEur'
  | 'orderStatus'
  | 'pvcDelivery'
  | 'deadline'
  | 'akrobudDeliveryDate'
  | 'createdAt'
  | 'archived';

export interface Column {
  id: ColumnId;
  label: string;
  sortable: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  visible?: boolean;
}

// ================================
// Typy filtrów
// ================================

export type ClientFilter = 'all' | 'akrobud' | 'private';

export interface FilterState {
  clientFilter: ClientFilter;
  hideProduced: boolean;
  dateFrom: string; // format YYYY-MM-DD
  showOnlyMissing: boolean; // pokazuj tylko brakujące numery zleceń
}

/**
 * Reprezentuje brakujący numer zlecenia (luka w sekwencji)
 */
export interface MissingOrderNumber {
  orderNumber: string;
  isMissing: true;
}

// ================================
// Typy grupowania
// ================================

export type GroupBy = 'none' | 'client' | 'system' | 'deadline-day' | 'deadline-week' | 'deadline-month';

// ================================
// Typy sortowania
// ================================

export type SortDirection = 'asc' | 'desc';

// ================================
// Typy statystyk
// ================================

export interface OrdersStats {
  totalOrders: number;
  totalValuePln: number;
  totalValueEur: number;
  totalWindows: number;
  totalSashes: number;
  totalGlasses: number;
}

export interface FilteredSummary {
  totalWindows: number;
  totalSashes: number;
  totalGlasses: number;
}

// ================================
// Stałe
// ================================

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'orderNumber', label: 'Nr zlecenia', sortable: false, align: 'left', visible: true },
  { id: 'client', label: 'Klient', sortable: false, align: 'left', visible: true },
  { id: 'project', label: 'Projekt', sortable: false, align: 'left', visible: true },
  { id: 'system', label: 'System', sortable: false, align: 'left', visible: true },
  { id: 'documentAuthor', label: 'Autor', sortable: false, align: 'left', visible: true },
  { id: 'totalWindows', label: 'Okna', sortable: false, align: 'center', visible: true },
  { id: 'totalSashes', label: 'Skrzydeł', sortable: false, align: 'center', visible: true },
  { id: 'glasses', label: 'Szkleń', sortable: false, align: 'center', visible: true },
  { id: 'glassDeliveryDate', label: 'Data szyb', sortable: false, align: 'center', visible: true },
  { id: 'okucDemandStatus', label: 'Okucia', sortable: false, align: 'center', visible: true },
  { id: 'valuePln', label: 'Wartość PLN', sortable: false, align: 'right', visible: true },
  { id: 'valueEur', label: 'Wartość EUR', sortable: false, align: 'right', visible: true },
  { id: 'orderStatus', label: 'Status Schuco', sortable: false, align: 'center', visible: true },
  { id: 'pvcDelivery', label: 'Dostawa PVC', sortable: false, align: 'left', visible: true },
  { id: 'deadline', label: 'Termin realizacji', sortable: false, align: 'left', visible: true },
  { id: 'akrobudDeliveryDate', label: 'Dostawa AKR', sortable: false, align: 'left', visible: true },
  { id: 'archived', label: 'Status', sortable: false, align: 'center', visible: true },
];

export const STORAGE_KEY_COLUMNS_ORDER = 'zestawienie-zlecen-columns-order';
export const STORAGE_KEY_COLUMNS_VISIBILITY = 'zestawienie-zlecen-columns-visibility';
export const STORAGE_KEY_FILTERS = 'zestawienie-zlecen-filters';
