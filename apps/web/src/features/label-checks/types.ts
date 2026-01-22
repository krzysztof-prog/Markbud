/**
 * Typy dla modułu sprawdzania etykiet (Label Checks)
 * Moduł OCR do weryfikacji dat na etykietach vs daty dostaw
 */

// Status sprawdzenia (całego procesu)
export type LabelCheckStatus = 'pending' | 'completed' | 'failed';

// Status pojedynczego wyniku OCR
export type LabelCheckResultStatus = 'OK' | 'MISMATCH' | 'NO_FOLDER' | 'NO_BMP' | 'OCR_ERROR';

// Wynik sprawdzenia pojedynczej etykiety
export interface LabelCheckResult {
  id: number;
  labelCheckId: number;
  orderId: number;
  orderNumber: string;
  status: LabelCheckResultStatus;
  expectedDate: string; // ISO date
  detectedDate: string | null;
  detectedText: string | null;
  imagePath: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// Sprawdzenie etykiet (lista)
export interface LabelCheckListItem {
  id: number;
  deliveryId: number;
  deliveryDate: string;
  status: LabelCheckStatus;
  totalOrders: number;
  checkedCount: number;
  okCount: number;
  mismatchCount: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
}

// Sprawdzenie etykiet ze szczegółami (detail view)
export interface LabelCheck extends LabelCheckListItem {
  results: LabelCheckResult[];
  delivery?: {
    id: number;
    deliveryDate: string;
    deliveryNumber: string | null;
  };
}

// Request do utworzenia sprawdzenia
export interface CreateLabelCheckRequest {
  deliveryId: number;
}

// Filtry dla listy
export interface LabelCheckFilters {
  status?: LabelCheckStatus;
  deliveryId?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

// Odpowiedź paginowana
export interface LabelCheckListResponse {
  data: LabelCheckListItem[];
  total: number;
  skip: number;
  take: number;
}

// Podsumowanie dla UI
export interface LabelCheckSummary {
  total: number;
  ok: number;
  mismatch: number;
  errors: number;
  successRate: number; // 0-100
}

// Helper do mapowania statusu na kolor/ikonę
export const RESULT_STATUS_CONFIG: Record<LabelCheckResultStatus, {
  label: string;
  color: 'green' | 'red' | 'yellow' | 'gray';
  icon: 'check' | 'x' | 'alert-triangle' | 'folder-x' | 'file-x';
}> = {
  OK: { label: 'OK', color: 'green', icon: 'check' },
  MISMATCH: { label: 'Niezgodna data', color: 'red', icon: 'x' },
  NO_FOLDER: { label: 'Brak folderu', color: 'yellow', icon: 'folder-x' },
  NO_BMP: { label: 'Brak zdjęć', color: 'yellow', icon: 'file-x' },
  OCR_ERROR: { label: 'Błąd OCR', color: 'gray', icon: 'alert-triangle' },
} as const;
