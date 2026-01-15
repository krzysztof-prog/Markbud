/**
 * Imports API module
 */

import type { Import, ImportPreview } from '@/types';
import { fetchApi, uploadFile } from '../api-client';

// Typy dla importu z folderu
interface FolderListResult {
  basePath: string;
  folders: Array<{
    name: string;
    path: string;
    hasDate: boolean;
    date: string | null;
  }>;
}

interface FolderScanResult {
  folderName: string;
  detectedDate: string | null;
  csvFiles: Array<{
    filename: string;
    relativePath: string;
    orderNumber: string;
    requirementsCount: number;
    windowsCount: number;
    existingDeliveryInfo?: {
      deliveryId: number;
      deliveryNumber: string | null;
      deliveryDate: string;
    };
  }>;
  existingDeliveries: Array<{
    id: number;
    deliveryNumber: string | null;
  }>;
}

interface FolderImportResult {
  success: boolean;
  delivery: {
    id: number;
    deliveryDate: string;
    deliveryNumber: string;
    created: boolean;
  };
  summary: {
    totalFiles: number;
    successCount: number;
    skippedCount: number;
    failCount: number;
  };
  results: Array<{
    filename: string;
    relativePath: string;
    success: boolean;
    orderId?: number;
    orderNumber?: string;
    error?: string;
    skipped?: boolean;
    skipReason?: string;
  }>;
  archivedPath: string | null;
}

// Importy
export const importsApi = {
  getPending: () => fetchApi<Import[]>('/api/imports/pending'),
  getAll: (status?: string) =>
    fetchApi<Import[]>(`/api/imports${status ? `?status=${status}` : ''}`),
  getPreview: (id: number) => fetchApi<ImportPreview>(`/api/imports/${id}/preview`),
  approve: (
    id: number,
    action?: 'overwrite' | 'add_new',
    resolution?: { type: 'keep_existing' | 'use_latest'; deleteOlder?: boolean }
  ) =>
    fetchApi<Import>(`/api/imports/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action, resolution }),
    }),
  reject: (id: number) =>
    fetchApi<Import>(`/api/imports/${id}/reject`, { method: 'POST', body: JSON.stringify({}) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/imports/${id}`, { method: 'DELETE' }),
  listFolders: () =>
    fetchApi<FolderListResult>('/api/imports/list-folders'),
  scanFolder: (folderPath: string) =>
    fetchApi<FolderScanResult>(`/api/imports/scan-folder?folderPath=${encodeURIComponent(folderPath)}`),
  importFolder: (folderPath: string, deliveryNumber: 'I' | 'II' | 'III') =>
    fetchApi<FolderImportResult>('/api/imports/folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath, deliveryNumber }),
    }),
  archiveFolder: (folderPath: string) =>
    fetchApi<{ success: boolean; archivedPath: string }>('/api/imports/archive-folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath }),
    }),
  deleteFolder: (folderPath: string) =>
    fetchApi<{ success: boolean }>('/api/imports/delete-folder', {
      method: 'DELETE',
      body: JSON.stringify({ folderPath }),
    }),
  upload: (file: File) => uploadFile<Import>('/api/imports/upload', file),
  bulkAction: (ids: number[], action: 'approve' | 'reject') =>
    fetchApi<{
      success: boolean;
      summary: { total: number; successCount: number; failCount: number };
      results: Array<{ id: number; success: boolean; error?: string }>;
    }>('/api/imports/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids, action }),
    }),
};
