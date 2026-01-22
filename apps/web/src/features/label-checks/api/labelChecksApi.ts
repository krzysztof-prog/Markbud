/**
 * API Client dla modułu sprawdzania etykiet (Label Checks)
 * Moduł OCR do weryfikacji dat na etykietach vs daty dostaw
 */

import { fetchApi, API_URL } from '@/lib/api-client';
import type {
  LabelCheck,
  LabelCheckListResponse,
  LabelCheckFilters,
  CreateLabelCheckRequest,
} from '../types';

const BASE_URL = '/api/label-checks';

/**
 * Pobiera listę sprawdzen z filtrami i paginacja
 * @param filters - Opcjonalne filtry (status, deliveryId, daty, paginacja)
 * @returns Lista sprawdzen z informacja o paginacji
 */
export async function getLabelChecks(filters?: LabelCheckFilters): Promise<LabelCheckListResponse> {
  const params = new URLSearchParams();

  if (filters?.status) params.set('status', filters.status);
  if (filters?.deliveryId) params.set('deliveryId', String(filters.deliveryId));
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.includeDeleted) params.set('includeDeleted', 'true');

  const query = params.toString();
  const url = query ? `${BASE_URL}?${query}` : BASE_URL;

  return fetchApi<LabelCheckListResponse>(url);
}

/**
 * Pobiera szczegoly sprawdzenia wraz z wynikami OCR
 * @param id - ID sprawdzenia
 * @returns Sprawdzenie ze szczegolami i lista wynikow
 */
export async function getLabelCheck(id: number): Promise<LabelCheck> {
  return fetchApi<LabelCheck>(`${BASE_URL}/${id}`);
}

/**
 * Uruchamia sprawdzanie etykiet dla dostawy
 * Proces OCR zostanie uruchomiony asynchronicznie
 * @param data - Dane do utworzenia sprawdzenia (deliveryId)
 * @returns Utworzone sprawdzenie w statusie 'pending'
 */
export async function checkLabels(data: CreateLabelCheckRequest): Promise<LabelCheck> {
  return fetchApi<LabelCheck>(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Usuwa sprawdzenie (soft delete)
 * @param id - ID sprawdzenia do usuniecia
 */
export async function deleteLabelCheck(id: number): Promise<void> {
  return fetchApi<void>(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Pobiera ostatnie sprawdzenie dla dostawy
 * @param deliveryId - ID dostawy
 * @returns Ostatnie sprawdzenie lub null jesli nie istnieje
 */
export async function getLatestForDelivery(deliveryId: number): Promise<LabelCheck | null> {
  return fetchApi<LabelCheck | null>(`${BASE_URL}/delivery/${deliveryId}`);
}

/**
 * Zwraca URL do pobrania raportu Excel
 * Uzyj tego URL bezposrednio w linku/przycisku do pobrania
 * @param id - ID sprawdzenia
 * @returns Pelny URL do eksportu Excel
 */
export function getExportUrl(id: number): string {
  return `${API_URL}${BASE_URL}/${id}/export`;
}

// Eksportuj wszystko jako obiekt dla spojnosci z innymi modułami
export const labelChecksApi = {
  /** Pobiera liste sprawdzen z filtrami i paginacja */
  getAll: getLabelChecks,
  /** Pobiera szczegoly sprawdzenia */
  getById: getLabelCheck,
  /** Uruchamia sprawdzanie etykiet dla dostawy */
  check: checkLabels,
  /** Usuwa sprawdzenie (soft delete) */
  delete: deleteLabelCheck,
  /** Pobiera ostatnie sprawdzenie dla dostawy */
  getLatestForDelivery,
  /** Zwraca URL do eksportu Excel */
  getExportUrl,
};
