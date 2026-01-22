/**
 * API Client - wspólny helper do komunikacji z backendem
 *
 * Automatycznie dodaje token autoryzacji do wszystkich requestów
 */

import { getErrorMessage, getErrorAction } from './error-messages';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'auth_token';

/**
 * Pobierz token z localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export interface ApiError extends Error {
  status?: number;
  data?: Record<string, unknown>;
  userMessage?: string;
  userAction?: string;
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

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 210000); // 3.5 minutes timeout

  // Pobierz token autoryzacji
  const token = getAuthToken();
  const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
      // API zwraca `message` jako główny komunikat błędu, `error` to tylko nazwa kategorii
      const error: ApiError = new Error(data.message || data.error || `HTTP Error: ${response.status}`);
      error.status = response.status;
      error.data = data;

      // Add user-friendly messages
      error.userMessage = getErrorMessage({ response: { status: response.status, data } });
      error.userAction = getErrorAction({ response: { status: response.status, data } }) || undefined;

      throw error;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      // Timeout error
      const timeoutError: ApiError = new Error('Czas oczekiwania na odpowiedź serwera upłynął. Spróbuj ponownie.');
      timeoutError.status = 408;
      throw timeoutError;
    }

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

  console.log('[uploadFile] Starting upload to:', url);
  console.log('[uploadFile] File:', file.name, 'size:', file.size, 'type:', file.type);

  // Validate file size before upload (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    const error: ApiError = new Error(`Plik jest zbyt duży. Maksymalny rozmiar: ${maxSize / 1024 / 1024}MB`);
    error.status = 413;
    throw error;
  }

  const formData = new FormData();
  formData.append('file', file);

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 210000); // 3.5 minutes for file uploads

  // Pobierz token autoryzacji
  const token = getAuthToken();

  console.log('[uploadFile] Sending fetch request...');
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });

    console.log('[uploadFile] Response received after', Date.now() - startTime, 'ms, status:', response.status);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
      // API zwraca `message` jako główny komunikat błędu, `error` to tylko nazwa kategorii
      const error: ApiError = new Error(data.message || data.error || `HTTP Error: ${response.status}`);
      error.status = response.status;
      error.data = data;

      // Add user-friendly messages
      error.userMessage = getErrorMessage({ response: { status: response.status, data } });
      error.userAction = getErrorAction({ response: { status: response.status, data } }) || undefined;

      throw error;
    }

    return response.json();
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error('[uploadFile] Error after', elapsed, 'ms:', error);
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      // Timeout error
      console.error('[uploadFile] Request was aborted (timeout or manual)');
      const timeoutError: ApiError = new Error('Czas oczekiwania na upload pliku upłynął. Spróbuj ponownie.');
      timeoutError.status = 408;
      throw timeoutError;
    }

    if (error instanceof TypeError) {
      console.error('[uploadFile] Network/TypeError:', error.message);
      const networkError: ApiError = new Error('Błąd połączenia sieciowego. Sprawdź połączenie internetowe.');
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  }
}

/**
 * Helper do pobierania plików binarnych (PDF, Excel, etc.)
 */
export async function fetchBlob(endpoint: string): Promise<Blob> {
  const url = `${API_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 210000);

  // Pobierz token autoryzacji
  const token = getAuthToken();

  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
      // API zwraca `message` jako główny komunikat błędu, `error` to tylko nazwa kategorii
      const error: ApiError = new Error(data.message || data.error || `HTTP Error: ${response.status}`);
      error.status = response.status;
      error.data = data;

      // Add user-friendly messages
      error.userMessage = getErrorMessage({ response: { status: response.status, data } });
      error.userAction = getErrorAction({ response: { status: response.status, data } }) || undefined;

      throw error;
    }

    return response.blob();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError: ApiError = new Error('Czas oczekiwania na odpowiedź serwera upłynął.');
      timeoutError.status = 408;
      throw timeoutError;
    }

    if (error instanceof TypeError) {
      const networkError: ApiError = new Error('Błąd połączenia sieciowego.');
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  }
}

/**
 * Helper do sprawdzenia czy zasób istnieje (HEAD request)
 */
export async function checkExists(endpoint: string): Promise<boolean> {
  const url = `${API_URL}${endpoint}`;

  // Pobierz token autoryzacji
  const token = getAuthToken();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.ok;
  } catch {
    return false;
  }
}

export { API_URL };
