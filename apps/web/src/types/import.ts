import type { ID, Timestamp, Status } from './common';

/**
 * Błąd parsowania CSV (TASK 7)
 */
export interface ParseError {
  row: number;
  field?: string;
  reason: string;
  rawData: any;
}

/**
 * Import pliku (CSV, PDF)
 */
export interface Import {
  id: ID;
  filename: string;
  fileName?: string; // Alias dla kompatybilności
  fileType: 'uzyte_bele' | 'ceny_pdf' | 'order_pdf' | 'other';
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

export interface OrderVariant {
  id?: number;
  orderNumber: string;
  windowCount?: number;
  requirementCount?: number;
  delivery?: {
    deliveryNumber: string;
    deliveryDate: Date | string;
  };
}

export interface VariantConflict {
  type: 'base_exists' | 'variant_exists' | 'multiple_variants';
  newOrder: OrderVariant;
  existingOrders: OrderVariant[];
  comparisonMetrics: {
    windowCountDiff: number;
    requirementCountDiff: number;
  };
  recommendation?: string;
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
  errors?: ParseError[]; // TASK 7: Błędy parsowania
  metadata?: Record<string, any>; // Additional metadata from parsers
  message?: string;
  variantConflict?: VariantConflict | null;
}

export interface UploadImportResponse {
  import: Import;
  preview?: ImportPreview;
}

export interface ApproveImportData {
  action?: 'overwrite' | 'add_new';
  resolution?: {
    type: 'keep_existing' | 'use_latest';
    deleteOlder?: boolean;
  };
}
