/**
 * Orders API module
 */

import type {
  Order,
  CreateOrderData,
  UpdateOrderData,
  OrderTableData,
  ForProductionData,
  BulkUpdateStatusData,
  PaginatedResponse,
} from '@/types';
import { fetchApi, API_URL } from '../api-client';
import { getAuthToken } from '../auth-token';

// Typ dla wyników wyszukiwania (zoptymalizowany, mniej pól)
interface OrderSearchResult {
  id: number;
  orderNumber: string;
  status: string;
  client: string | null;
  project: string | null;
  system: string | null;
  deadline: string | null;
  valuePln: number | null;
  archivedAt: string | null;
  windows: Array<{ reference: string | null }>;
}

// ReadinessResult type for System Brain
export interface ReadinessResult {
  ready: boolean;
  blocking: ReadinessSignal[];
  warnings: ReadinessSignal[];
  checklist: ChecklistItem[];
}

export interface ReadinessSignal {
  module: 'warehouse' | 'glass' | 'okuc' | 'pallet' | 'approval' | 'variant';
  requirement: string;
  status: 'ok' | 'warning' | 'blocking';
  message: string;
  actionRequired?: string;
  metadata?: Record<string, unknown>;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  blocking: boolean;
}

// Zlecenia
export const ordersApi = {
  getAll: (params?: { status?: string; archived?: string; colorId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<PaginatedResponse<Order>>(`/api/orders${query ? `?${query}` : ''}`);
  },
  // Zoptymalizowane wyszukiwanie dla GlobalSearch - filtruje po stronie serwera
  search: (q: string, includeArchived: boolean = true) =>
    fetchApi<OrderSearchResult[]>(`/api/orders/search?q=${encodeURIComponent(q)}&includeArchived=${includeArchived}`),
  getById: (id: number) => fetchApi<Order>(`/api/orders/${id}`),
  getByNumber: (orderNumber: string) => fetchApi<Order>(`/api/orders/by-number/${orderNumber}`),
  getTable: (colorId: number) => fetchApi<OrderTableData>(`/api/orders/table/${colorId}`),
  getRequirementsTotals: () => fetchApi<Array<{ profileId: number; total: number }>>('/api/orders/requirements/totals'),
  getForProduction: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<ForProductionData>(`/api/orders/for-production${query ? `?${query}` : ''}`);
  },
  getMonthlyProduction: (year: number, month: number) =>
    fetchApi<Order[]>(`/api/orders/monthly-production?year=${year}&month=${month}`),
  checkPdf: async (id: number): Promise<{ hasPdf: boolean; filename: string | null }> => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/orders/${id}/has-pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        return { hasPdf: false, filename: null };
      }
      return await response.json();
    } catch {
      return { hasPdf: false, filename: null };
    }
  },
  create: (data: CreateOrderData) =>
    fetchApi<Order>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateOrderData) =>
    fetchApi<Order>(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (id: number, data: { valuePln?: string | null; valueEur?: string | null; deadline?: string | null; status?: string | null; invoiceNumber?: string | null }) =>
    fetchApi<Order>(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  bulkUpdateStatus: (data: BulkUpdateStatusData) =>
    fetchApi<Order[]>('/api/orders/bulk-update-status', { method: 'POST', body: JSON.stringify(data) }),
  archive: (id: number) =>
    fetchApi<Order>(`/api/orders/${id}/archive`, { method: 'POST', body: JSON.stringify({}) }),
  unarchive: (id: number) =>
    fetchApi<Order>(`/api/orders/${id}/unarchive`, { method: 'POST', body: JSON.stringify({}) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/orders/${id}`, { method: 'DELETE' }),
  // P1-3: Set variant type for order (correction vs additional_file)
  setVariantType: (id: number, variantType: 'correction' | 'additional_file') =>
    fetchApi<Order>(`/api/orders/${id}/variant-type`, {
      method: 'PATCH',
      body: JSON.stringify({ variantType }),
    }),
  // P1-R4: Get production readiness checklist (System Brain)
  getReadiness: (id: number) => fetchApi<ReadinessResult>(`/api/orders/${id}/readiness`),

  // Aktualizuj ręczny status zlecenia (NIE CIĄĆ, Anulowane, Wstrzymane)
  updateManualStatus: (id: number, manualStatus: 'do_not_cut' | 'cancelled' | 'on_hold' | null) =>
    fetchApi<Order>(`/api/orders/${id}/manual-status`, {
      method: 'PATCH',
      body: JSON.stringify({ manualStatus }),
    }),

  // ==========================================
  // Archive endpoints
  // ==========================================

  // Pobierz dostępne lata w archiwum ze statystykami
  getArchiveYears: () => fetchApi<Array<{ year: number; count: number }>>('/api/orders/archive/years'),

  // Pobierz zlecenia z archiwum dla danego roku
  getArchivedByYear: (year: number, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    const queryStr = query.toString();
    return fetchApi<{ orders: Order[]; total: number }>(`/api/orders/archive/${year}${queryStr ? `?${queryStr}` : ''}`);
  },

  // Ręczne uruchomienie archiwizacji (admin)
  triggerArchive: () => fetchApi<{ success: boolean; archivedCount: number; archivedOrderNumbers: string[] }>(
    '/api/orders/archive/trigger',
    { method: 'POST', body: JSON.stringify({}) }
  ),

  // Pobierz ustawienia archiwizacji (archiveAfterDays)
  getArchiveSettings: () => fetchApi<{ archiveAfterDays: number }>('/api/orders/archive/settings'),
};
