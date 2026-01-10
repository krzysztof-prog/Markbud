/**
 * Akrobud Verification API Service
 */

import { fetchApi } from '@/lib/api-client';
import type {
  AkrobudVerificationList,
  CreateVerificationListData,
  UpdateVerificationListData,
  AddItemsData,
  AddItemsResult,
  ParseTextareaResult,
  VerificationResult,
  ApplyChangesResult,
  VerificationListFilters,
  VerifyListParams,
  ApplyChangesParams,
} from '@/types';

export const verificationApi = {
  // ===================
  // List CRUD
  // ===================

  /**
   * Pobierz wszystkie listy weryfikacyjne
   */
  getAll: (filters?: VerificationListFilters) => {
    const params = new URLSearchParams();
    if (filters?.deliveryDate) params.set('deliveryDate', filters.deliveryDate);
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString();
    return fetchApi<AkrobudVerificationList[]>(
      `/api/akrobud-verification${query ? `?${query}` : ''}`
    );
  },

  /**
   * Pobierz listę po ID
   */
  getById: (id: number) =>
    fetchApi<AkrobudVerificationList>(`/api/akrobud-verification/${id}`),

  /**
   * Utwórz nową listę
   */
  create: (data: CreateVerificationListData) =>
    fetchApi<AkrobudVerificationList>('/api/akrobud-verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Aktualizuj listę
   */
  update: (id: number, data: UpdateVerificationListData) =>
    fetchApi<AkrobudVerificationList>(`/api/akrobud-verification/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń listę (soft delete)
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/akrobud-verification/${id}`, {
      method: 'DELETE',
    }),

  // ===================
  // Items Management
  // ===================

  /**
   * Dodaj elementy do listy
   */
  addItems: (listId: number, data: AddItemsData) =>
    fetchApi<AddItemsResult>(`/api/akrobud-verification/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Parsuj tekst (preview bez zapisywania)
   */
  parseTextarea: (listId: number, text: string) =>
    fetchApi<ParseTextareaResult>(
      `/api/akrobud-verification/${listId}/items/parse`,
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      }
    ),

  /**
   * Usuń element z listy
   */
  deleteItem: (listId: number, itemId: number) =>
    fetchApi<void>(`/api/akrobud-verification/${listId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  /**
   * Wyczyść wszystkie elementy
   */
  clearItems: (listId: number) =>
    fetchApi<void>(`/api/akrobud-verification/${listId}/items`, {
      method: 'DELETE',
    }),

  // ===================
  // Verification & Apply
  // ===================

  /**
   * Weryfikuj listę - porównaj z dostawą
   */
  verify: (listId: number, params?: VerifyListParams) =>
    fetchApi<VerificationResult>(`/api/akrobud-verification/${listId}/verify`, {
      method: 'POST',
      body: JSON.stringify(params ?? {}),
    }),

  /**
   * Zastosuj zmiany - dodaj/usuń zlecenia z dostawy
   */
  applyChanges: (listId: number, params: ApplyChangesParams) =>
    fetchApi<ApplyChangesResult>(`/api/akrobud-verification/${listId}/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};
