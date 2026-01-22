/**
 * Okuc Articles API Client
 *
 * Backend routes: apps/api/src/routes/okuc/articles.ts
 * Backend validators: apps/api/src/validators/okuc.ts
 *
 * Zarządzanie artykułami okuć PVC i ALU
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
  ImportArticlesPreviewResponse,
  ImportArticlesInput,
  ImportArticlesResult,
} from '@/types/okuc';

export const okucArticlesApi = {
  /**
   * GET /api/okuc/articles
   * Pobierz wszystkie artykuły z opcjonalnymi filtrami
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
   */
  getById: (id: number) =>
    fetchApi<OkucArticle>(`/api/okuc/articles/${id}`),

  /**
   * GET /api/okuc/articles/by-article-id/:articleId
   * Pobierz artykuł po articleId (numer artykułu, np. "A123")
   */
  getByArticleId: (articleId: string) =>
    fetchApi<OkucArticle>(`/api/okuc/articles/by-article-id/${articleId}`),

  /**
   * POST /api/okuc/articles
   * Utwórz nowy artykuł
   */
  create: (data: CreateArticleInput) =>
    fetchApi<OkucArticle>('/api/okuc/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/okuc/articles/:id
   * Zaktualizuj artykuł
   */
  update: (id: number, data: UpdateArticleInput) =>
    fetchApi<OkucArticle>(`/api/okuc/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/okuc/articles/:id
   * Usuń artykuł
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
   */
  getAliases: (id: number) =>
    fetchApi<OkucArticleAlias[]>(`/api/okuc/articles/${id}/aliases`),

  /**
   * POST /api/okuc/articles/:id/aliases
   * Dodaj alias do artykułu (mapowanie starych numerów na nowe)
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
   * POST /api/okuc/articles/import/preview
   * Podgląd importu artykułów z pliku CSV - wykrywa konflikty
   */
  importPreview: (file: File) =>
    uploadFile<ImportArticlesPreviewResponse>('/api/okuc/articles/import/preview', file),

  /**
   * POST /api/okuc/articles/import
   * Importuj artykuły z rozwiązaniem konfliktów
   */
  import: (input: ImportArticlesInput) =>
    fetchApi<ImportArticlesResult>('/api/okuc/articles/import', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * @deprecated Używaj importPreview + import zamiast tego
   */
  importCsv: (file: File) =>
    uploadFile<ImportArticlesResponse>('/api/okuc/articles/import', file),

  /**
   * GET /api/okuc/articles/export
   * Eksportuj artykuły do pliku CSV
   */
  exportCsv: (warehouseType?: 'pvc' | 'alu') => {
    const params = new URLSearchParams();
    if (warehouseType) params.append('warehouseType', warehouseType);

    const queryString = params.toString();
    return fetchBlob(`/api/okuc/articles/export${queryString ? `?${queryString}` : ''}`);
  },

  // ============================================================================
  // PENDING REVIEW - Artykuły oczekujące na weryfikację orderClass
  // ============================================================================

  /**
   * GET /api/okuc/articles/pending-review
   * Pobierz artykuły utworzone podczas importu, oczekujące na weryfikację orderClass
   */
  getPendingReview: () =>
    fetchApi<OkucArticle[]>('/api/okuc/articles/pending-review'),

  /**
   * POST /api/okuc/articles/batch-update-order-class
   * Zaktualizuj orderClass dla wielu artykułów jednocześnie
   */
  batchUpdateOrderClass: (articles: Array<{ id: number; orderClass: 'typical' | 'atypical' }>) =>
    fetchApi<{ updated: number; failed: number; errors: Array<{ id: number; error: string }> }>(
      '/api/okuc/articles/batch-update-order-class',
      {
        method: 'POST',
        body: JSON.stringify({ articles }),
      }
    ),
};
