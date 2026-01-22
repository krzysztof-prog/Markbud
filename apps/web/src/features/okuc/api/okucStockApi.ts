/**
 * Okuc Stock API Client
 *
 * Backend routes: apps/api/src/routes/okuc/stock.ts
 *
 * Zarządzanie stanem magazynowym okuć
 */

import { fetchApi, uploadFile } from '@/lib/api-client';
import type {
  OkucStock,
  UpdateStockInput,
  StockFilters,
  StockSummary,
  ImportStockPreviewResponse,
  ImportStockInput,
  ImportStockResult,
  OkucHistory,
  HistoryFilters,
  WarehouseType,
  SubWarehouse,
} from '@/types/okuc';

export const okucStockApi = {
  /**
   * GET /api/okuc/stock
   * Pobierz wszystkie stany magazynowe z opcjonalnymi filtrami
   */
  getAll: (filters?: StockFilters & { belowMin?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.articleId) params.append('articleId', String(filters.articleId));
    if (filters?.warehouseType) params.append('warehouseType', filters.warehouseType);
    if (filters?.subWarehouse) params.append('subWarehouse', filters.subWarehouse);
    if (filters?.belowMin !== undefined) params.append('belowMin', String(filters.belowMin));

    const queryString = params.toString();
    return fetchApi<OkucStock[]>(`/api/okuc/stock${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/stock/summary
   * Pobierz podsumowanie stanów magazynowych pogrupowane po magazynach
   */
  getSummary: (warehouseType?: WarehouseType) => {
    const params = new URLSearchParams();
    if (warehouseType) params.append('warehouseType', warehouseType);

    const queryString = params.toString();
    return fetchApi<StockSummary[]>(`/api/okuc/stock/summary${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/stock/below-minimum
   * Pobierz artykuły z krytycznym stanem (poniżej minimum)
   */
  getBelowMinimum: (warehouseType?: WarehouseType) => {
    const params = new URLSearchParams();
    if (warehouseType) params.append('warehouseType', warehouseType);

    const queryString = params.toString();
    return fetchApi<OkucStock[]>(`/api/okuc/stock/below-minimum${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/stock/:id
   * Pobierz stan magazynowy po ID
   */
  getById: (id: number) =>
    fetchApi<OkucStock>(`/api/okuc/stock/${id}`),

  /**
   * GET /api/okuc/stock/by-article/:articleId
   * Pobierz stan magazynowy artykułu dla danego magazynu
   */
  getByArticle: (articleId: number, warehouseType: WarehouseType, subWarehouse?: SubWarehouse) => {
    const params = new URLSearchParams();
    params.append('warehouseType', warehouseType);
    if (subWarehouse) params.append('subWarehouse', subWarehouse);

    const queryString = params.toString();
    return fetchApi<OkucStock>(`/api/okuc/stock/by-article/${articleId}?${queryString}`);
  },

  /**
   * PATCH /api/okuc/stock/:id
   * Zaktualizuj stan magazynowy (optimistic locking)
   */
  update: (id: number, data: UpdateStockInput & { version: number }) =>
    fetchApi<OkucStock>(`/api/okuc/stock/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * POST /api/okuc/stock/adjust
   * Dostosuj stan magazynowy (dodaj/odejmij ilość)
   */
  adjust: (data: { stockId: number; quantity: number; version: number }) =>
    fetchApi<OkucStock>('/api/okuc/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * GET /api/okuc/stock/history/:articleId
   * Pobierz historię zmian stanu dla artykułu
   */
  getHistory: (articleId: number, filters?: HistoryFilters) => {
    const params = new URLSearchParams();
    if (filters?.warehouseType) params.append('warehouseType', filters.warehouseType);
    if (filters?.subWarehouse) params.append('subWarehouse', filters.subWarehouse);
    if (filters?.eventType) params.append('eventType', filters.eventType);
    if (filters?.isManualEdit !== undefined) params.append('isManualEdit', String(filters.isManualEdit));
    if (filters?.fromDate) params.append('fromDate', filters.fromDate.toISOString());
    if (filters?.toDate) params.append('toDate', filters.toDate.toISOString());
    if (filters?.recordedById) params.append('recordedById', String(filters.recordedById));

    const queryString = params.toString();
    return fetchApi<OkucHistory[]>(`/api/okuc/stock/history/${articleId}${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * POST /api/okuc/stock/import/preview
   * Podgląd importu stanu magazynowego z pliku CSV
   */
  importPreview: (file: File) =>
    uploadFile<ImportStockPreviewResponse>('/api/okuc/stock/import/preview', file),

  /**
   * POST /api/okuc/stock/import
   * Importuj stan magazynowy z rozwiązaniem konfliktów
   */
  import: (input: ImportStockInput) =>
    fetchApi<ImportStockResult>('/api/okuc/stock/import', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * GET /api/okuc/stock/export
   * Eksportuj stany magazynowe do CSV i wywołaj download
   */
  exportCsv: async (filters?: { warehouseType?: WarehouseType; belowMin?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.warehouseType) params.append('warehouseType', filters.warehouseType);
    if (filters?.belowMin !== undefined) params.append('belowMin', String(filters.belowMin));

    const queryString = params.toString();
    const response = await fetch(`/api/okuc/stock/export${queryString ? `?${queryString}` : ''}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to export stock');
    }

    // Pobierz blob i wywołaj download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Wyciągnij nazwę pliku z Content-Disposition lub użyj domyślnej
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'stan-magazynu-okuc.csv';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
