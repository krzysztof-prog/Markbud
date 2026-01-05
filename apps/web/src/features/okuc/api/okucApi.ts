/**
 * Okuc API Client - DualStock Module
 *
 * Backend routes: apps/api/src/routes/okuc/articles.ts
 * Backend validators: apps/api/src/validators/okuc.ts
 *
 * Moduł zarządzania magazynem okuć PVC i ALU
 */

import { fetchApi, uploadFile, fetchBlob } from '@/lib/api-client';
import type {
  OkucArticle,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleFilters,
  OkucArticleAlias,
  AddAliasInput,
  ImportArticlesResponse,
  OkucStock,
  UpdateStockInput,
  AdjustStockInput,
  StockFilters,
  StockSummary,
  OkucHistory,
  HistoryFilters,
  OkucDemand,
  CreateDemandInput,
  UpdateDemandInput,
  DemandFilters,
  WeeklyDemandSummary,
  OkucOrder,
  CreateOkucOrderInput,
  UpdateOkucOrderInput,
  ReceiveOrderInput,
  OkucProportion,
  CreateProportionInput,
  UpdateProportionInput,
  WarehouseType,
  SubWarehouse,
} from '@/types/okuc';

// ============================================================================
// ARTICLES - Zarządzanie artykułami okuć
// ============================================================================

export const okucArticlesApi = {
  /**
   * GET /api/okuc/articles
   * Pobierz wszystkie artykuły z opcjonalnymi filtrami
   *
   * @param filters - Opcjonalne filtry (usedInPvc, usedInAlu, orderClass, sizeClass, isActive)
   * @returns Lista artykułów
   */
  getAll: (filters?: ArticleFilters) => {
    const params = new URLSearchParams();
    if (filters?.usedInPvc !== undefined) params.append('usedInPvc', String(filters.usedInPvc));
    if (filters?.usedInAlu !== undefined) params.append('usedInAlu', String(filters.usedInAlu));
    if (filters?.orderClass) params.append('orderClass', filters.orderClass);
    if (filters?.sizeClass) params.append('sizeClass', filters.sizeClass);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    return fetchApi<OkucArticle[]>(`/api/okuc/articles${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/articles/:id
   * Pobierz artykuł po ID (database ID)
   *
   * @param id - ID artykułu w bazie danych
   * @returns Artykuł
   */
  getById: (id: number) =>
    fetchApi<OkucArticle>(`/api/okuc/articles/${id}`),

  /**
   * GET /api/okuc/articles/by-article-id/:articleId
   * Pobierz artykuł po articleId (numer artykułu, np. "A123")
   *
   * @param articleId - Numer artykułu (np. "A123")
   * @returns Artykuł
   */
  getByArticleId: (articleId: string) =>
    fetchApi<OkucArticle>(`/api/okuc/articles/by-article-id/${articleId}`),

  /**
   * POST /api/okuc/articles
   * Utwórz nowy artykuł
   *
   * @param data - Dane artykułu
   * @returns Utworzony artykuł
   */
  create: (data: CreateArticleInput) =>
    fetchApi<OkucArticle>('/api/okuc/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/okuc/articles/:id
   * Zaktualizuj artykuł
   *
   * @param id - ID artykułu
   * @param data - Dane do aktualizacji (partial)
   * @returns Zaktualizowany artykuł
   */
  update: (id: number, data: UpdateArticleInput) =>
    fetchApi<OkucArticle>(`/api/okuc/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/okuc/articles/:id
   * Usuń artykuł
   *
   * @param id - ID artykułu
   * @returns void
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/okuc/articles/${id}`, {
      method: 'DELETE',
    }),

  // ============================================================================
  // ALIASES - Zarządzanie aliasami artykułów
  // ============================================================================

  /**
   * GET /api/okuc/articles/:id/aliases
   * Pobierz wszystkie aliasy dla artykułu
   *
   * @param id - ID artykułu
   * @returns Lista aliasów
   */
  getAliases: (id: number) =>
    fetchApi<OkucArticleAlias[]>(`/api/okuc/articles/${id}/aliases`),

  /**
   * POST /api/okuc/articles/:id/aliases
   * Dodaj alias do artykułu (mapowanie starych numerów na nowe)
   *
   * @param id - ID artykułu
   * @param data - Dane aliasu (aliasNumber)
   * @returns Utworzony alias
   */
  addAlias: (id: number, data: AddAliasInput) =>
    fetchApi<OkucArticleAlias>(`/api/okuc/articles/${id}/aliases`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ============================================================================
  // IMPORT/EXPORT - CSV import i export
  // ============================================================================

  /**
   * POST /api/okuc/articles/import
   * Importuj artykuły z pliku CSV
   *
   * Format CSV:
   * - articleId, name, description, usedInPvc, usedInAlu, orderClass, sizeClass, ...
   *
   * @param file - Plik CSV do importu
   * @returns Wynik importu (success/failed/errors)
   */
  importCsv: (file: File) =>
    uploadFile<ImportArticlesResponse>('/api/okuc/articles/import', file),

  /**
   * GET /api/okuc/articles/export
   * Eksportuj artykuły do pliku CSV
   *
   * @param warehouseType - Opcjonalny filtr po typie magazynu ('pvc' | 'alu')
   * @returns Blob CSV
   */
  exportCsv: (warehouseType?: 'pvc' | 'alu') => {
    const params = new URLSearchParams();
    if (warehouseType) params.append('warehouseType', warehouseType);

    const queryString = params.toString();
    return fetchBlob(`/api/okuc/articles/export${queryString ? `?${queryString}` : ''}`);
  },
};

// ============================================================================
// STOCK - Zarządzanie stanem magazynowym
// ============================================================================

export const okucStockApi = {
  /**
   * GET /api/okuc/stock
   * Pobierz wszystkie stany magazynowe z opcjonalnymi filtrami
   *
   * @param filters - Opcjonalne filtry (articleId, warehouseType, subWarehouse, belowMin)
   * @returns Lista stanów magazynowych
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
   *
   * @param warehouseType - Opcjonalny filtr po typie magazynu
   * @returns Podsumowanie stanów
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
   *
   * @param warehouseType - Opcjonalny filtr po typie magazynu
   * @returns Lista krytycznych stanów
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
   *
   * @param id - ID stanu magazynowego
   * @returns Stan magazynowy
   */
  getById: (id: number) =>
    fetchApi<OkucStock>(`/api/okuc/stock/${id}`),

  /**
   * GET /api/okuc/stock/by-article/:articleId
   * Pobierz stan magazynowy artykułu dla danego magazynu
   *
   * @param articleId - ID artykułu
   * @param warehouseType - Typ magazynu (required)
   * @param subWarehouse - Podmagazyn (opcjonalny, tylko dla PVC)
   * @returns Stan magazynowy
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
   *
   * @param id - ID stanu magazynowego
   * @param data - Dane do aktualizacji (z version dla optimistic locking)
   * @returns Zaktualizowany stan magazynowy
   */
  update: (id: number, data: UpdateStockInput & { version: number }) =>
    fetchApi<OkucStock>(`/api/okuc/stock/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * POST /api/okuc/stock/adjust
   * Dostosuj stan magazynowy (dodaj/odejmij ilość)
   *
   * @param data - Dane korekty (stockId, quantity, version)
   * @returns Zaktualizowany stan magazynowy
   */
  adjust: (data: { stockId: number; quantity: number; version: number }) =>
    fetchApi<OkucStock>('/api/okuc/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * GET /api/okuc/stock/history/:articleId
   * Pobierz historię zmian stanu dla artykułu
   *
   * @param articleId - ID artykułu
   * @param filters - Opcjonalne filtry historii
   * @returns Lista zmian historycznych
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
};

// ============================================================================
// DEMAND - Zarządzanie zapotrzebowaniem
// ============================================================================

export const okucDemandApi = {
  /**
   * GET /api/okuc/demand
   * Pobierz wszystkie zapotrzebowania z opcjonalnymi filtrami
   *
   * @param filters - Opcjonalne filtry (articleId, orderId, status, source, expectedWeek, etc.)
   * @returns Lista zapotrzebowań
   */
  getAll: (filters?: DemandFilters) => {
    const params = new URLSearchParams();
    if (filters?.articleId) params.append('articleId', String(filters.articleId));
    if (filters?.orderId) params.append('orderId', String(filters.orderId));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.expectedWeek) params.append('expectedWeek', filters.expectedWeek);
    if (filters?.fromWeek) params.append('fromWeek', filters.fromWeek);
    if (filters?.toWeek) params.append('toWeek', filters.toWeek);
    if (filters?.isManualEdit !== undefined) params.append('isManualEdit', String(filters.isManualEdit));

    const queryString = params.toString();
    return fetchApi<OkucDemand[]>(`/api/okuc/demand${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/demand/summary
   * Pobierz podsumowanie zapotrzebowania pogrupowane po tygodniach
   *
   * @param fromWeek - Początek zakresu (format: "2025-W08")
   * @param toWeek - Koniec zakresu (format: "2025-W10")
   * @returns Podsumowanie tygodniowe
   */
  getSummary: (fromWeek?: string, toWeek?: string) => {
    const params = new URLSearchParams();
    if (fromWeek) params.append('fromWeek', fromWeek);
    if (toWeek) params.append('toWeek', toWeek);

    const queryString = params.toString();
    return fetchApi<WeeklyDemandSummary[]>(`/api/okuc/demand/summary${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/demand/:id
   * Pobierz zapotrzebowanie po ID
   *
   * @param id - ID zapotrzebowania
   * @returns Zapotrzebowanie
   */
  getById: (id: number) =>
    fetchApi<OkucDemand>(`/api/okuc/demand/${id}`),

  /**
   * POST /api/okuc/demand
   * Utwórz nowe zapotrzebowanie
   *
   * @param data - Dane zapotrzebowania
   * @returns Utworzone zapotrzebowanie
   */
  create: (data: CreateDemandInput) =>
    fetchApi<OkucDemand>('/api/okuc/demand', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PUT /api/okuc/demand/:id
   * Zaktualizuj zapotrzebowanie (wymaga editReason)
   *
   * @param id - ID zapotrzebowania
   * @param data - Dane do aktualizacji (z editReason)
   * @returns Zaktualizowane zapotrzebowanie
   */
  update: (id: number, data: UpdateDemandInput) =>
    fetchApi<OkucDemand>(`/api/okuc/demand/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/okuc/demand/:id
   * Usuń zapotrzebowanie
   *
   * @param id - ID zapotrzebowania
   * @returns void
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/okuc/demand/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================================================
// ORDERS - Zarządzanie zamówieniami do dostawcy
// ============================================================================

export const okucOrdersApi = {
  /**
   * GET /api/okuc/orders
   * Pobierz wszystkie zamówienia z opcjonalnymi filtrami
   *
   * @param filters - Opcjonalne filtry (status, basketType, fromDate, toDate)
   * @returns Lista zamówień
   */
  getAll: (filters?: {
    status?: string;
    basketType?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.basketType) params.append('basketType', filters.basketType);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);

    const queryString = params.toString();
    return fetchApi<OkucOrder[]>(`/api/okuc/orders${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/orders/stats
   * Pobierz statystyki zamówień
   *
   * @returns Statystyki zamówień
   */
  getStats: () =>
    fetchApi<{
      total: number;
      byStatus: Record<string, number>;
      byBasketType: Record<string, number>;
    }>('/api/okuc/orders/stats'),

  /**
   * GET /api/okuc/orders/:id
   * Pobierz zamówienie po ID
   *
   * @param id - ID zamówienia
   * @returns Zamówienie z pozycjami
   */
  getById: (id: number) =>
    fetchApi<OkucOrder>(`/api/okuc/orders/${id}`),

  /**
   * POST /api/okuc/orders
   * Utwórz nowe zamówienie
   *
   * @param data - Dane zamówienia (basketType, items)
   * @returns Utworzone zamówienie
   */
  create: (data: CreateOkucOrderInput) =>
    fetchApi<OkucOrder>('/api/okuc/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PUT /api/okuc/orders/:id
   * Zaktualizuj zamówienie
   *
   * @param id - ID zamówienia
   * @param data - Dane do aktualizacji (status, items, editReason)
   * @returns Zaktualizowane zamówienie
   */
  update: (id: number, data: UpdateOkucOrderInput) =>
    fetchApi<OkucOrder>(`/api/okuc/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * POST /api/okuc/orders/:id/receive
   * Oznacz zamówienie jako odebrane i zaktualizuj odebrane ilości
   *
   * @param id - ID zamówienia
   * @param data - Dane odbioru (items z receivedQty)
   * @returns Zaktualizowane zamówienie
   */
  receive: (id: number, data: ReceiveOrderInput) =>
    fetchApi<OkucOrder>(`/api/okuc/orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/okuc/orders/:id
   * Usuń zamówienie (tylko jeśli jest w statusie draft)
   *
   * @param id - ID zamówienia
   * @returns void
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/okuc/orders/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================================================
// PROPORTIONS - Zarządzanie proporcjami między artykułami
// ============================================================================

export const okucProportionsApi = {
  /**
   * GET /api/okuc/proportions
   * Pobierz wszystkie proporcje z opcjonalnymi filtrami
   *
   * @param isActive - Filtr po statusie aktywności
   * @returns Lista proporcji
   */
  getAll: (isActive?: boolean) => {
    const params = new URLSearchParams();
    if (isActive !== undefined) params.append('isActive', String(isActive));

    const queryString = params.toString();
    return fetchApi<OkucProportion[]>(`/api/okuc/proportions${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * GET /api/okuc/proportions/chains/:sourceArticleId
   * Pobierz łańcuchy proporcji rozpoczynające się od artykułu źródłowego
   *
   * @param sourceArticleId - ID artykułu źródłowego
   * @returns Łańcuchy proporcji
   */
  getChains: (sourceArticleId: number) =>
    fetchApi<OkucProportion[]>(`/api/okuc/proportions/chains/${sourceArticleId}`),

  /**
   * GET /api/okuc/proportions/article/:articleId
   * Pobierz proporcje dla artykułu (zarówno jako źródło jak i cel)
   *
   * @param articleId - ID artykułu
   * @returns Lista proporcji
   */
  getByArticle: (articleId: number) =>
    fetchApi<{ asSource: OkucProportion[]; asTarget: OkucProportion[] }>(
      `/api/okuc/proportions/article/${articleId}`
    ),

  /**
   * GET /api/okuc/proportions/:id
   * Pobierz proporcję po ID
   *
   * @param id - ID proporcji
   * @returns Proporcja
   */
  getById: (id: number) =>
    fetchApi<OkucProportion>(`/api/okuc/proportions/${id}`),

  /**
   * POST /api/okuc/proportions
   * Utwórz nową proporcję
   *
   * @param data - Dane proporcji (sourceArticleId, targetArticleId, proportionType, etc.)
   * @returns Utworzona proporcja
   */
  create: (data: CreateProportionInput) =>
    fetchApi<OkucProportion>('/api/okuc/proportions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PUT /api/okuc/proportions/:id
   * Zaktualizuj proporcję
   *
   * @param id - ID proporcji
   * @param data - Dane do aktualizacji
   * @returns Zaktualizowana proporcja
   */
  update: (id: number, data: UpdateProportionInput) =>
    fetchApi<OkucProportion>(`/api/okuc/proportions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * POST /api/okuc/proportions/:id/deactivate
   * Dezaktywuj proporcję (soft delete)
   *
   * @param id - ID proporcji
   * @returns Zaktualizowana proporcja
   */
  deactivate: (id: number) =>
    fetchApi<OkucProportion>(`/api/okuc/proportions/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * POST /api/okuc/proportions/:id/activate
   * Aktywuj proporcję
   *
   * @param id - ID proporcji
   * @returns Zaktualizowana proporcja
   */
  activate: (id: number) =>
    fetchApi<OkucProportion>(`/api/okuc/proportions/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * DELETE /api/okuc/proportions/:id
   * Usuń proporcję (hard delete)
   *
   * @param id - ID proporcji
   * @returns void
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/okuc/proportions/${id}`, {
      method: 'DELETE',
    }),
};
