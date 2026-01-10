/**
 * Typy dla weryfikacji list dostaw Akrobud
 */

import type { ID, Timestamp } from './common';

// ===================
// Lista weryfikacyjna
// ===================

/**
 * Lista weryfikacyjna Akrobud
 */
export interface AkrobudVerificationList {
  id: ID;
  deliveryDate: Timestamp;
  deliveryId: number | null;
  title: string | null;
  notes: string | null;
  status: 'draft' | 'verified' | 'applied';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
  delivery?: {
    id: number;
    deliveryNumber: string | null;
  } | null;
  items: AkrobudVerificationItem[];
  _count?: {
    items: number;
  };
}

/**
 * Element listy weryfikacyjnej
 */
export interface AkrobudVerificationItem {
  id: ID;
  listId: number;
  orderNumberInput: string;
  orderNumberBase: string | null;
  orderNumberSuffix: string | null;
  matchedOrderId: number | null;
  matchStatus: 'pending' | 'found' | 'not_found' | 'variant_match';
  position: number;
  createdAt: Timestamp;
  matchedOrder?: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string;
  } | null;
}

// ===================
// Formularz
// ===================

export interface CreateVerificationListData {
  deliveryDate: string;
  title?: string;
  notes?: string;
}

export interface UpdateVerificationListData {
  deliveryDate?: string;
  title?: string | null;
  notes?: string | null;
}

export interface AddItemsData {
  items: Array<{ orderNumber: string }>;
  inputMode: 'textarea' | 'single';
}

// ===================
// Wyniki weryfikacji
// ===================

/**
 * Dopasowany element
 */
export interface MatchedItem {
  itemId: number;
  orderNumberInput: string;
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  position: number;
  matchStatus: 'found' | 'variant_match';
}

/**
 * Brakujący element (na liście klienta, ale nie w dostawie)
 */
export interface MissingItem {
  itemId: number;
  orderNumberInput: string;
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  position: number;
}

/**
 * Nadmiarowy element (w dostawie, ale nie na liście klienta)
 */
export interface ExcessItem {
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  deliveryPosition: number;
}

/**
 * Nieznaleziony element (nie ma w systemie)
 */
export interface NotFoundItem {
  itemId: number;
  orderNumberInput: string;
  position: number;
}

/**
 * Duplikat na liście
 */
export interface DuplicateItem {
  orderNumber: string;
  positions: number[];
}

/**
 * Wynik weryfikacji listy
 */
export interface VerificationResult {
  listId: number;
  deliveryDate: string;

  // Dostawa
  delivery: {
    id: number;
    deliveryNumber: string | null;
    status: string;
  } | null;
  needsDeliveryCreation: boolean;

  // Wyniki
  matched: MatchedItem[];
  missing: MissingItem[];
  excess: ExcessItem[];
  notFound: NotFoundItem[];
  duplicates: DuplicateItem[];

  // Podsumowanie
  summary: {
    totalItems: number;
    matchedCount: number;
    missingCount: number;
    excessCount: number;
    notFoundCount: number;
    duplicatesCount: number;
  };
}

/**
 * Wynik aplikowania zmian
 */
export interface ApplyChangesResult {
  added: number[];
  removed: number[];
  errors: Array<{ orderId: number; reason: string }>;
}

/**
 * Wynik dodania elementów
 */
export interface AddItemsResult {
  added: number;
  duplicates: DuplicateItem[];
  errors: Array<{ orderNumber: string; reason: string }>;
}

/**
 * Wynik parsowania textarea
 */
export interface ParseTextareaResult {
  orderNumbers: string[];
  count: number;
}

// ===================
// Query params
// ===================

export interface VerificationListFilters {
  deliveryDate?: string;
  status?: 'draft' | 'verified' | 'applied';
}

export interface VerifyListParams {
  createDeliveryIfMissing?: boolean;
}

export interface ApplyChangesParams {
  addMissing?: number[];
  removeExcess?: number[];
}
