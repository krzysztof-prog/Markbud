/**
 * Okuc Proportions API Client
 *
 * Backend routes: apps/api/src/routes/okuc/proportions.ts
 *
 * Zarządzanie proporcjami między artykułami okuć
 */

import { fetchApi } from '@/lib/api-client';
import type {
  OkucProportion,
  CreateProportionInput,
  UpdateProportionInput,
} from '@/types/okuc';

export const okucProportionsApi = {
  /**
   * GET /api/okuc/proportions
   * Pobierz wszystkie proporcje z opcjonalnymi filtrami
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
   */
  getChains: (sourceArticleId: number) =>
    fetchApi<OkucProportion[]>(`/api/okuc/proportions/chains/${sourceArticleId}`),

  /**
   * GET /api/okuc/proportions/article/:articleId
   * Pobierz proporcje dla artykułu (zarówno jako źródło jak i cel)
   */
  getByArticle: (articleId: number) =>
    fetchApi<{ asSource: OkucProportion[]; asTarget: OkucProportion[] }>(
      `/api/okuc/proportions/article/${articleId}`
    ),

  /**
   * GET /api/okuc/proportions/:id
   * Pobierz proporcję po ID
   */
  getById: (id: number) =>
    fetchApi<OkucProportion>(`/api/okuc/proportions/${id}`),

  /**
   * POST /api/okuc/proportions
   * Utwórz nową proporcję
   */
  create: (data: CreateProportionInput) =>
    fetchApi<OkucProportion>('/api/okuc/proportions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PUT /api/okuc/proportions/:id
   * Zaktualizuj proporcję
   */
  update: (id: number, data: UpdateProportionInput) =>
    fetchApi<OkucProportion>(`/api/okuc/proportions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * POST /api/okuc/proportions/:id/deactivate
   * Dezaktywuj proporcję (soft delete)
   */
  deactivate: (id: number) =>
    fetchApi<OkucProportion>(`/api/okuc/proportions/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * POST /api/okuc/proportions/:id/activate
   * Aktywuj proporcję
   */
  activate: (id: number) =>
    fetchApi<OkucProportion>(`/api/okuc/proportions/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * DELETE /api/okuc/proportions/:id
   * Usuń proporcję (hard delete)
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/okuc/proportions/${id}`, {
      method: 'DELETE',
    }),
};
