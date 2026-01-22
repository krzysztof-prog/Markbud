/**
 * Okuc Demand API Client
 *
 * Backend routes: apps/api/src/routes/okuc/demand.ts
 *
 * Zarządzanie zapotrzebowaniem na okucia
 */

import { fetchApi } from '@/lib/api-client';
import type {
  OkucDemand,
  CreateDemandInput,
  UpdateDemandInput,
  DemandFilters,
  WeeklyDemandSummary,
} from '@/types/okuc';

export const okucDemandApi = {
  /**
   * GET /api/okuc/demand
   * Pobierz wszystkie zapotrzebowania z opcjonalnymi filtrami
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
   */
  getById: (id: number) =>
    fetchApi<OkucDemand>(`/api/okuc/demand/${id}`),

  /**
   * POST /api/okuc/demand
   * Utwórz nowe zapotrzebowanie
   */
  create: (data: CreateDemandInput) =>
    fetchApi<OkucDemand>('/api/okuc/demand', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PUT /api/okuc/demand/:id
   * Zaktualizuj zapotrzebowanie (wymaga editReason)
   */
  update: (id: number, data: UpdateDemandInput) =>
    fetchApi<OkucDemand>(`/api/okuc/demand/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/okuc/demand/:id
   * Usuń zapotrzebowanie
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/okuc/demand/${id}`, {
      method: 'DELETE',
    }),
};
