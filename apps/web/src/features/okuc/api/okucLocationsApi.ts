/**
 * Okuc Locations API Client
 *
 * Backend routes: apps/api/src/routes/okuc/locations.ts
 *
 * Zarządzanie lokalizacjami magazynowymi okuć
 */

import { fetchApi } from '@/lib/api-client';
import type { OkucLocation } from '@/types/okuc';

export const okucLocationsApi = {
  /**
   * GET /api/okuc/locations
   * Pobierz wszystkie lokalizacje magazynowe
   * Posortowane po sortOrder, zawiera liczbę artykułów
   */
  getAll: () => fetchApi<OkucLocation[]>('/api/okuc/locations'),

  /**
   * POST /api/okuc/locations
   * Utwórz nową lokalizację magazynową
   */
  create: (data: { name: string; sortOrder?: number }) =>
    fetchApi<OkucLocation>('/api/okuc/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/okuc/locations/:id
   * Zaktualizuj lokalizację
   */
  update: (id: number, data: { name?: string; sortOrder?: number }) =>
    fetchApi<OkucLocation>(`/api/okuc/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/okuc/locations/:id
   * Usuń lokalizację (soft delete)
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/okuc/locations/${id}`, {
      method: 'DELETE',
    }),

  /**
   * POST /api/okuc/locations/reorder
   * Zmień kolejność lokalizacji
   */
  reorder: (ids: number[]) =>
    fetchApi<OkucLocation[]>('/api/okuc/locations/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};
