/**
 * Pallets API module
 */

import type { OptimizationResult } from '@/types/pallet';
import { fetchApi, API_URL, type ApiError } from '../api-client';
import { getAuthToken } from '../auth-token';

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
  createPalletType: (data: import('@/types/pallet').CreatePalletTypeRequest) =>
    fetchApi<import('@/types/pallet').PalletType>('/api/pallets/types', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/pallets/types/:id
   * Zaktualizuj typ palety
   */
  updatePalletType: (id: number, data: import('@/types/pallet').UpdatePalletTypeRequest) =>
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
