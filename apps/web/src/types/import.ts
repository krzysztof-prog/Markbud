import type { ID, Timestamp, Status } from './common';

/**
 * Import pliku (CSV, PDF)
 */
export interface Import {
  id: ID;
  filename: string;
  fileName?: string; // Alias dla kompatybilności
  fileType: 'uzyte_bele' | 'ceny_pdf' | 'okuc_csv' | 'order_pdf' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'error' | 'rejected';
  createdAt: Timestamp;
  uploadedAt?: Timestamp;
  processedAt?: Timestamp;
  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  error?: string;
  recordsCount?: number;
  metadata?: Record<string, any>;
}

export interface ImportPreview {
  import: Import;
  data: Record<string, unknown>[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    warnings?: string[];
  };
  message?: string;
}

export interface UploadImportResponse {
  import: Import;
  preview?: ImportPreview;
}

export interface ApproveImportData {
  action?: 'overwrite' | 'add_new';
}
