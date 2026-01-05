/**
 * Unified API module
 *
 * All API methods are centralized here.
 * Uses shared fetchApi from api-client.ts for consistent error handling.
 */

import type {
  Color,
  CreateColorData,
  UpdateColorData,
  Profile,
  CreateProfileData,
  UpdateProfileData,
  Order,
  CreateOrderData,
  UpdateOrderData,
  OrderTableData,
  Delivery,
  CreateDeliveryData,
  UpdateDeliveryData,
  DeliveryCalendarData,
  DeliveryProtocol,
  DeliveryItem,
  CreateDeliveryItemData,
  WarehouseStock,
  UpdateStockData,
  WarehouseOrder,
  CreateWarehouseOrderData,
  UpdateWarehouseOrderData,
  MonthlyStockUpdate,
  WarehouseHistory,
  Shortage,
  RemanentHistoryEntry,
  WarehouseDataResponse,
  PalletType,
  CreatePalletTypeData,
  UpdatePalletTypeData,
  Import,
  ImportPreview,
  DashboardResponse,
  Alert,
  Holiday,
  WorkingDay,
  SetWorkingDayData,
  ForProductionData,
  BulkUpdateStatusData,
  CompleteDeliveryData,
} from '@/types';
import type {
  OptimizationResult,
  CreatePalletTypeRequest,
  UpdatePalletTypeRequest,
} from '@/types/pallet';
import { fetchApi, uploadFile, fetchBlob, checkExists, API_URL, type ApiError } from './api-client';
import { getAuthToken } from './auth-token';

// Dashboard
export const dashboardApi = {
  getDashboard: () => fetchApi<DashboardResponse>('/api/dashboard'),
  getAlerts: () => fetchApi<Alert[]>('/api/dashboard/alerts'),
};

// Kolory
export const colorsApi = {
  getAll: (type?: 'typical' | 'atypical') =>
    fetchApi<Color[]>(`/api/colors${type ? `?type=${type}` : ''}`),
  getById: (id: number) => fetchApi<Color>(`/api/colors/${id}`),
  create: (data: CreateColorData) =>
    fetchApi<Color>('/api/colors', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateColorData) =>
    fetchApi<Color>(`/api/colors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/colors/${id}`, { method: 'DELETE' }),
};

// Profile
export const profilesApi = {
  getAll: () => fetchApi<Profile[]>('/api/profiles'),
  getById: (id: number) => fetchApi<Profile>(`/api/profiles/${id}`),
  create: (data: CreateProfileData) =>
    fetchApi<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateProfileData) =>
    fetchApi<Profile>(`/api/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
  updateOrders: (profileOrders: Array<{ id: number; sortOrder: number }>) =>
    fetchApi<void>('/api/profiles/update-orders', {
      method: 'PATCH',
      body: JSON.stringify({ profileOrders }),
    }),
};

// Zlecenia
export const ordersApi = {
  getAll: (params?: { status?: string; archived?: string; colorId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<Order[]>(`/api/orders${query ? `?${query}` : ''}`);
  },
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
};

// Magazyn
export const warehouseApi = {
  getByColor: (colorId: number) => fetchApi<WarehouseDataResponse>(`/api/warehouse/${colorId}`),
  updateStock: (colorId: number, profileId: number, data: UpdateStockData) =>
    fetchApi<WarehouseStock>(`/api/warehouse/${colorId}/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  monthlyUpdate: (data: MonthlyStockUpdate) =>
    fetchApi<void>('/api/warehouse/monthly-update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getShortages: () => fetchApi<Shortage[]>('/api/warehouse/shortages'),
  getHistory: (colorId: number, limit?: number) =>
    fetchApi<RemanentHistoryEntry[]>(`/api/warehouse/history/${colorId}${limit ? `?limit=${limit}` : ''}`),
};

// Zamówienia magazynowe
export const warehouseOrdersApi = {
  getAll: (params?: { colorId?: number; profileId?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.colorId) query.append('colorId', params.colorId.toString());
    if (params?.profileId) query.append('profileId', params.profileId.toString());
    if (params?.status) query.append('status', params.status);
    return fetchApi<WarehouseOrder[]>(`/api/warehouse-orders${query.toString() ? `?${query}` : ''}`);
  },
  getById: (id: number) => fetchApi<WarehouseOrder>(`/api/warehouse-orders/${id}`),
  create: (data: CreateWarehouseOrderData) =>
    fetchApi<WarehouseOrder>('/api/warehouse-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateWarehouseOrderData) =>
    fetchApi<WarehouseOrder>(`/api/warehouse-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchApi<void>(`/api/warehouse-orders/${id}`, { method: 'DELETE' }),
};

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
      deliveries: any[];
      unassignedOrders: any[];
      workingDays: any[];
      holidays: any[];
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
};

// Typy dla importu z folderu
interface FolderListResult {
  basePath: string;
  folders: Array<{
    name: string;
    path: string;
    hasDate: boolean;
    date: string | null;
  }>;
}

interface FolderScanResult {
  folderName: string;
  detectedDate: string | null;
  csvFiles: Array<{
    filename: string;
    relativePath: string;
    orderNumber: string;
    requirementsCount: number;
    windowsCount: number;
    existingDeliveryInfo?: {
      deliveryId: number;
      deliveryNumber: string | null;
      deliveryDate: string;
    };
  }>;
  existingDeliveries: Array<{
    id: number;
    deliveryNumber: string | null;
  }>;
}

interface FolderImportResult {
  success: boolean;
  delivery: {
    id: number;
    deliveryDate: string;
    deliveryNumber: string;
    created: boolean;
  };
  summary: {
    totalFiles: number;
    successCount: number;
    skippedCount: number;
    failCount: number;
  };
  results: Array<{
    filename: string;
    relativePath: string;
    success: boolean;
    orderId?: number;
    orderNumber?: string;
    error?: string;
    skipped?: boolean;
    skipReason?: string;
  }>;
  archivedPath: string | null;
}

// Importy
export const importsApi = {
  getPending: () => fetchApi<Import[]>('/api/imports/pending'),
  getAll: (status?: string) =>
    fetchApi<Import[]>(`/api/imports${status ? `?status=${status}` : ''}`),
  getPreview: (id: number) => fetchApi<ImportPreview>(`/api/imports/${id}/preview`),
  approve: (
    id: number,
    action?: 'overwrite' | 'add_new',
    resolution?: { type: 'keep_existing' | 'use_latest'; deleteOlder?: boolean }
  ) =>
    fetchApi<Import>(`/api/imports/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action, resolution }),
    }),
  reject: (id: number) =>
    fetchApi<Import>(`/api/imports/${id}/reject`, { method: 'POST', body: JSON.stringify({}) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/imports/${id}`, { method: 'DELETE' }),
  listFolders: () =>
    fetchApi<FolderListResult>('/api/imports/list-folders'),
  scanFolder: (folderPath: string) =>
    fetchApi<FolderScanResult>(`/api/imports/scan-folder?folderPath=${encodeURIComponent(folderPath)}`),
  importFolder: (folderPath: string, deliveryNumber: 'I' | 'II' | 'III') =>
    fetchApi<FolderImportResult>('/api/imports/folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath, deliveryNumber }),
    }),
  archiveFolder: (folderPath: string) =>
    fetchApi<{ success: boolean; archivedPath: string }>('/api/imports/archive-folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath }),
    }),
  deleteFolder: (folderPath: string) =>
    fetchApi<{ success: boolean }>('/api/imports/delete-folder', {
      method: 'DELETE',
      body: JSON.stringify({ folderPath }),
    }),
  upload: (file: File) => uploadFile<Import>('/api/imports/upload', file),
  bulkAction: (ids: number[], action: 'approve' | 'reject') =>
    fetchApi<{
      success: boolean;
      summary: { total: number; successCount: number; failCount: number };
      results: Array<{ id: number; success: boolean; error?: string }>;
    }>('/api/imports/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids, action }),
    }),
};

// Ustawienia
export const settingsApi = {
  getAll: () => fetchApi<Record<string, string>>('/api/settings'),
  update: (settings: Record<string, string>) =>
    fetchApi<Record<string, string>>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getPalletTypes: () => fetchApi<PalletType[]>('/api/settings/pallet-types'),
  createPalletType: (data: CreatePalletTypeData) =>
    fetchApi<PalletType>('/api/settings/pallet-types', { method: 'POST', body: JSON.stringify(data) }),
  updatePalletType: (id: number, data: UpdatePalletTypeData) =>
    fetchApi<PalletType>(`/api/settings/pallet-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePalletType: (id: number) =>
    fetchApi<void>(`/api/settings/pallet-types/${id}`, { method: 'DELETE' }),
  getUserFolderPath: () => fetchApi<{ path: string }>('/api/settings/user-folder-path'),
  updateUserFolderPath: (path: string) =>
    fetchApi<{ path: string }>('/api/settings/user-folder-path', { method: 'PUT', body: JSON.stringify({ path }) }),
  validateFolder: (path: string) =>
    fetchApi<{ valid: boolean; error?: string }>('/api/settings/validate-folder', { method: 'POST', body: JSON.stringify({ path }) }),
};

// Dni wolne od pracy
export const workingDaysApi = {
  getAll: (params?: { from?: string; to?: string; month?: number; year?: number }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.month) query.append('month', params.month.toString());
    if (params?.year) query.append('year', params.year.toString());
    return fetchApi<WorkingDay[]>(`/api/working-days${query.toString() ? `?${query}` : ''}`);
  },
  getHolidays: (year: number, country?: 'PL' | 'DE') => {
    const query = new URLSearchParams({ year: year.toString() });
    if (country) query.append('country', country);
    return fetchApi<Holiday[]>(`/api/working-days/holidays?${query}`);
  },
  setWorkingDay: (date: string, isWorking: boolean, description?: string) =>
    fetchApi<WorkingDay>('/api/working-days', {
      method: 'POST',
      body: JSON.stringify({ date, isWorking, description }),
    }),
  delete: (date: string) =>
    fetchApi<void>(`/api/working-days/${date}`, { method: 'DELETE' }),
};

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
};

// Optymalizacja palet
export const palletsApi = {
  /**
   * POST /api/pallets/optimize/:deliveryId
   * Uruchom optymalizację pakowania dla dostawy
   * @param options - opcjonalne opcje optymalizacji
   */
  optimize: (deliveryId: number, options?: Partial<import('@/types/pallet').OptimizationOptions>) =>
    fetchApi<OptimizationResult>(`/api/pallets/optimize/${deliveryId}`, {
      method: 'POST',
      body: JSON.stringify({ options }),
    }),

  /**
   * GET /api/pallets/optimization/:deliveryId
   * Pobierz zapisaną optymalizację
   */
  getOptimization: (deliveryId: number) =>
    fetchApi<OptimizationResult>(`/api/pallets/optimization/${deliveryId}`),

  /**
   * DELETE /api/pallets/optimization/:deliveryId
   * Usuń optymalizację
   */
  deleteOptimization: (deliveryId: number) =>
    fetchApi<void>(`/api/pallets/optimization/${deliveryId}`, { method: 'DELETE' }),

  /**
   * GET /api/pallets/export/:deliveryId
   * Pobierz PDF z optymalizacją
   */
  exportToPdf: async (deliveryId: number): Promise<Blob> => {
    const url = `${API_URL}/api/pallets/export/${deliveryId}`;

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
        const networkError: ApiError = new Error('Błąd połączenia sieciowego. Sprawdź internetu.');
        networkError.status = 0;
        throw networkError;
      }
      throw error;
    }
  },

  /**
   * GET /api/pallets/types
   * Pobierz wszystkie typy palet
   */
  getPalletTypes: () =>
    fetchApi<import('@/types/pallet').PalletType[]>('/api/pallets/types'),

  /**
   * POST /api/pallets/types
   * Utwórz nowy typ palety
   */
  createPalletType: (data: CreatePalletTypeRequest) =>
    fetchApi<import('@/types/pallet').PalletType>('/api/pallets/types', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/pallets/types/:id
   * Zaktualizuj typ palety
   */
  updatePalletType: (id: number, data: UpdatePalletTypeRequest) =>
    fetchApi<import('@/types/pallet').PalletType>(`/api/pallets/types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/pallets/types/:id
   * Usuń typ palety
   */
  deletePalletType: (id: number) =>
    fetchApi<void>(`/api/pallets/types/${id}`, { method: 'DELETE' }),
};

// Zestawienia Miesięczne
export const monthlyReportsApi = {
  /**
   * GET /api/monthly-reports
   * Pobierz wszystkie raporty
   */
  getAll: (limit?: number) =>
    fetchApi<Array<{
      id: number;
      year: number;
      month: number;
      reportDate: string;
      totalOrders: number;
      totalWindows: number;
      totalSashes: number;
      totalValuePln: number;
      totalValueEur: number;
      createdAt: string;
      updatedAt: string;
      _count: { reportItems: number };
    }>>(`/api/monthly-reports${limit ? `?limit=${limit}` : ''}`),

  /**
   * GET /api/monthly-reports/:year/:month
   * Pobierz raport dla konkretnego miesiąca
   */
  getByYearMonth: (year: number, month: number) =>
    fetchApi<{
      id: number;
      year: number;
      month: number;
      reportDate: string;
      totalOrders: number;
      totalWindows: number;
      totalSashes: number;
      totalValuePln: number;
      totalValueEur: number;
      createdAt: string;
      updatedAt: string;
      reportItems: Array<{
        id: number;
        orderNumber: string;
        invoiceNumber: string | null;
        windowsCount: number;
        sashesCount: number;
        unitsCount: number;
        valuePln: number | null;
        valueEur: number | null;
      }>;
    }>(`/api/monthly-reports/${year}/${month}`),

  /**
   * POST /api/monthly-reports/:year/:month/generate
   * Wygeneruj raport
   */
  generate: (year: number, month: number) =>
    fetchApi<{
      reportId: number;
      year: number;
      month: number;
      totalOrders: number;
      totalWindows: number;
      totalSashes: number;
      totalValuePln: number;
      totalValueEur: number;
      items: Array<{
        orderId: number;
        orderNumber: string;
        invoiceNumber: string | null;
        windowsCount: number;
        sashesCount: number;
        unitsCount: number;
        valuePln: number | null;
        valueEur: number | null;
      }>;
    }>(`/api/monthly-reports/${year}/${month}/generate`, { method: 'POST' }),

  /**
   * GET /api/monthly-reports/:year/:month/export/excel
   * Pobierz raport jako Excel
   */
  exportExcel: async (year: number, month: number): Promise<Blob> => {
    const url = `${API_URL}/api/monthly-reports/${year}/${month}/export/excel`;

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
        const error: ApiError = new Error(data.error || 'Failed to export Excel');
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

  /**
   * GET /api/monthly-reports/:year/:month/export/pdf
   * Pobierz raport jako PDF
   */
  exportPdf: async (year: number, month: number): Promise<Blob> => {
    const url = `${API_URL}/api/monthly-reports/${year}/${month}/export/pdf`;

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
        const error: ApiError = new Error(data.error || 'Failed to export PDF');
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

  /**
   * DELETE /api/monthly-reports/:year/:month
   * Usuń raport
   */
  delete: (year: number, month: number) =>
    fetchApi<void>(`/api/monthly-reports/${year}/${month}`, { method: 'DELETE' }),
};

// Remanent magazynu
export { remanentApi } from '@/features/warehouse/remanent/api/remanentApi';

// OKUC (DualStock) - Moduł zarządzania magazynem okuć PVC i ALU
export {
  okucArticlesApi,
  okucStockApi,
  okucDemandApi,
  okucOrdersApi,
  okucProportionsApi,
} from '@/features/okuc/api/okucApi';

// Konfiguracja Walut
export const currencyConfigApi = {
  /**
   * GET /api/currency-config/current
   * Pobierz aktualny kurs
   */
  getCurrent: () =>
    fetchApi<{
      id: number;
      eurToPlnRate: number;
      effectiveDate: string;
      createdAt: string;
      updatedAt: string;
    }>('/api/currency-config/current'),

  /**
   * GET /api/currency-config/history
   * Pobierz historię kursów
   */
  getHistory: (limit?: number) =>
    fetchApi<Array<{
      id: number;
      eurToPlnRate: number;
      effectiveDate: string;
      createdAt: string;
      updatedAt: string;
    }>>(`/api/currency-config/history${limit ? `?limit=${limit}` : ''}`),

  /**
   * POST /api/currency-config
   * Ustaw kurs
   */
  setRate: (eurToPlnRate: number, effectiveDate?: string) =>
    fetchApi<{
      id: number;
      eurToPlnRate: number;
      effectiveDate: string;
      createdAt: string;
      updatedAt: string;
    }>('/api/currency-config', {
      method: 'POST',
      body: JSON.stringify({ eurToPlnRate, effectiveDate }),
    }),

  /**
   * POST /api/currency-config/convert/eur-to-pln
   * Konwertuj EUR na PLN
   */
  convertEurToPln: (amount: number) =>
    fetchApi<{ eur: number; pln: number; rate: number }>(
      '/api/currency-config/convert/eur-to-pln',
      { method: 'POST', body: JSON.stringify({ amount }) }
    ),

  /**
   * POST /api/currency-config/convert/pln-to-eur
   * Konwertuj PLN na EUR
   */
  convertPlnToEur: (amount: number) =>
    fetchApi<{ pln: number; eur: number; rate: number }>(
      '/api/currency-config/convert/pln-to-eur',
      { method: 'POST', body: JSON.stringify({ amount }) }
    ),
};

// Głębokości profili
export interface ProfileDepth {
  id: number;
  profileType: string;
  depthMm: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const profileDepthsApi = {
  /**
   * GET /api/profile-depths
   * Pobierz wszystkie głębokości profili
   */
  getAll: () => fetchApi<ProfileDepth[]>('/api/profile-depths'),

  /**
   * GET /api/profile-depths/:id
   * Pobierz głębokość profilu po ID
   */
  getById: (id: number) => fetchApi<ProfileDepth>(`/api/profile-depths/${id}`),

  /**
   * POST /api/profile-depths
   * Utwórz nową głębokość profilu
   */
  create: (data: { profileType: string; depthMm: number; description?: string }) =>
    fetchApi<ProfileDepth>('/api/profile-depths', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/profile-depths/:id
   * Zaktualizuj głębokość profilu
   */
  update: (id: number, data: Partial<{ profileType: string; depthMm: number; description?: string }>) =>
    fetchApi<ProfileDepth>(`/api/profile-depths/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/profile-depths/:id
   * Usuń głębokość profilu
   */
  delete: (id: number) =>
    fetchApi(`/api/profile-depths/${id}`, {
      method: 'DELETE',
    }),
};
