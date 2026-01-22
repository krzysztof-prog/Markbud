/**
 * API client for Attendance (BZ) module
 * Moduł BZ - widok miesięczny obecności pracowników
 */

import { fetchApi } from '@/lib/api-client';
import { getAuthToken } from '@/lib/auth-token';
import type { MonthlyAttendanceResponse, UpdateDayRequest } from '../types';

const BASE_URL = '/api/attendance';

export const attendanceApi = {
  /**
   * Pobiera dane obecności dla miesiąca
   */
  getMonthlyAttendance: async (year: number, month: number): Promise<MonthlyAttendanceResponse> => {
    const response = await fetchApi<MonthlyAttendanceResponse>(
      `${BASE_URL}/monthly?year=${year}&month=${month}`
    );
    return response;
  },

  /**
   * Aktualizuje obecność dla pojedynczego dnia
   */
  updateDay: async (data: UpdateDayRequest): Promise<{ success: boolean }> => {
    const response = await fetchApi<{ success: boolean }>(`${BASE_URL}/day`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * Eksportuje dane obecności do Excel lub PDF i wywołuje pobieranie pliku
   */
  exportAttendance: async (year: number, month: number, format: 'xlsx' | 'pdf'): Promise<void> => {
    // Użyj relatywnego URL przez proxy Next.js (rewrites w next.config.js)
    const url = `${BASE_URL}/export?year=${year}&month=${month}&format=${format}`;

    // Pobierz token autoryzacji
    const token = await getAuthToken();

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error('Błąd eksportu danych obecności');
    }

    // Pobierz blob i wywołaj download
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Wyciągnij nazwę pliku z Content-Disposition lub użyj domyślnej
    const contentDisposition = response.headers.get('Content-Disposition');
    const monthNames = [
      'Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien',
    ];
    let filename = `obecnosci_${monthNames[month - 1]}_${year}.${format}`;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }

    // Stwórz link do pobrania
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
};
