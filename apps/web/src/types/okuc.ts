import type { ID, Timestamp } from './common';

/**
 * Artykuł okuć
 */
export interface OkucArticle {
  id: ID;
  articleNumber: string;
  name: string;
  group?: string;
  warehouse?: string;
  unit?: string;
  minimumStock?: number;
  isHidden: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateOkucArticleData {
  articleNumber: string;
  name: string;
  group?: string;
  warehouse?: string;
  unit?: string;
  minimumStock?: number;
  isHidden?: boolean;
}

export interface UpdateOkucArticleData {
  articleNumber?: string;
  name?: string;
  group?: string;
  warehouse?: string;
  unit?: string;
  minimumStock?: number;
  isHidden?: boolean;
}

/**
 * Stan magazynu okuć
 */
export interface OkucStock {
  id: ID;
  articleId: ID;
  quantity: number;
  status: 'available' | 'reserved' | 'critical';
  lastUpdated: Timestamp;
  article?: OkucArticle;
}

export interface UpdateOkucStockData {
  quantity: number;
  status?: 'available' | 'reserved' | 'critical';
}

/**
 * Podsumowanie stanu magazynu
 */
export interface OkucStockSummary {
  totalArticles: number;
  criticalStockCount: number;
  availableStockCount: number;
  reservedStockCount: number;
}

/**
 * Krytyczny stan magazynu
 */
export interface OkucCriticalStock extends OkucStock {
  article: OkucArticle;
  shortage: number;
}

/**
 * Zamówienie okuć
 */
export interface OkucOrder {
  id: ID;
  articleId: ID;
  orderedQuantity: number;
  receivedQuantity?: number;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  status: 'pending' | 'received' | 'cancelled';
  supplier?: string;
  notes?: string;
  article?: OkucArticle;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateOkucOrderData {
  articleId: number;
  orderedQuantity: number;
  expectedDeliveryDate: string;
  supplier?: string;
  notes?: string;
}

export interface UpdateOkucOrderData {
  orderedQuantity?: number;
  receivedQuantity?: number;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status?: 'pending' | 'received' | 'cancelled';
  supplier?: string;
  notes?: string;
}

/**
 * Dashboard okuć
 */
export interface OkucDashboard {
  summary: OkucStockSummary;
  criticalArticles: OkucCriticalStock[];
  recentOrders: OkucOrder[];
}

/**
 * Import history okuć
 */
export interface OkucImportHistory {
  id: ID;
  fileName: string;
  recordsImported: number;
  importedAt: Timestamp;
  importedBy?: string;
}
