/**
 * API Client - wspólny helper do komunikacji z backendem
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

/**
 * Helper do wykonywania requestów do API
 *
 * @template T - Type of response data
 * @param endpoint - API endpoint (e.g. '/api/dashboard')
 * @param options - Fetch options
 * @returns Promise with typed response
 *
 * @example
 * ```typescript
 * const data = await fetchApi<DashboardResponse>('/api/dashboard');
 * ```
 */
export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
      const error: ApiError = new Error(data.error || `HTTP Error: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      const networkError: ApiError = new Error('Błąd połączenia sieciowego. Sprawdź połączenie internetowe.');
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  }
}

/**
 * Helper do uploadowania plików (FormData)
 */
export async function uploadFile<T>(endpoint: string, file: File): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
      const error: ApiError = new Error(data.error || `HTTP Error: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      const networkError: ApiError = new Error('Błąd połączenia sieciowego. Sprawdź połączenie internetowe.');
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  }
}

export { API_URL };
