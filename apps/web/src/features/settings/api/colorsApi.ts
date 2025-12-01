/**
 * Colors API Service
 */

import { fetchApi } from '@/lib/api-client';
import type { Color, CreateColorData, UpdateColorData } from '@/types';

export const colorsApi = {
  /**
   * Pobierz wszystkie kolory z opcjonalnym filtrem typu
   */
  getAll: (type?: 'typical' | 'atypical') =>
    fetchApi<Color[]>(`/api/colors${type ? `?type=${type}` : ''}`),

  /**
   * Pobierz kolor po ID
   */
  getById: (id: number) =>
    fetchApi<Color>(`/api/colors/${id}`),

  /**
   * Utwórz nowy kolor
   */
  create: (data: CreateColorData) =>
    fetchApi<Color>('/api/colors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Zaktualizuj kolor
   */
  update: (id: number, data: UpdateColorData) =>
    fetchApi<Color>(`/api/colors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń kolor
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/colors/${id}`, { method: 'DELETE' }),
};
