/**
 * Imports API Service
 */

import { fetchApi, uploadFile } from '@/lib/api-client';
import type {
  Import,
  ImportPreview,
  UploadImportResponse,
  ApproveImportData,
} from '@/types';

export const importsApi = {
  /**
   * Pobierz oczekujące importy
   */
  getPending: () =>
    fetchApi<Import[]>('/api/imports/pending'),

  /**
   * Pobierz wszystkie importy z opcjonalnym filtrem statusu
   */
  getAll: (status?: string) =>
    fetchApi<Import[]>(`/api/imports${status ? `?status=${status}` : ''}`),

  /**
   * Pobierz podgląd importu
   */
  getPreview: (id: number) =>
    fetchApi<ImportPreview>(`/api/imports/${id}/preview`),

  /**
   * Zaakceptuj import
   */
  approve: (id: number, action?: 'overwrite' | 'add_new') =>
    fetchApi<Import>(`/api/imports/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action } as ApproveImportData),
    }),

  /**
   * Odrzuć import
   */
  reject: (id: number) =>
    fetchApi<Import>(`/api/imports/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * Usuń import
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/imports/${id}`, { method: 'DELETE' }),

  /**
   * Upload pliku do importu
   */
  upload: (file: File) =>
    uploadFile<UploadImportResponse>('/api/imports/upload', file),
};
