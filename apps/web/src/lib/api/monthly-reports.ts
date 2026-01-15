/**
 * Monthly Reports API module
 */

import { fetchApi, API_URL, type ApiError } from '../api-client';
import { getAuthToken } from '../auth-token';

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
