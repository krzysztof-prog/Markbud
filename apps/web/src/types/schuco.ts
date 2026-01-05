/**
 * Schuco delivery types
 */

export interface SchucoDelivery {
  id: number;
  orderDate: string;
  orderNumber: string;
  projectNumber: string;
  orderName: string;
  shippingStatus: string;
  deliveryWeek: string | null;
  deliveryType: string | null;
  tracking: string | null;
  complaint: string | null;
  orderType: string | null;
  totalAmount: string | null;
  // Warehouse item flag - automatically detected based on order number format
  isWarehouseItem: boolean;
  extractedOrderNums: string | null; // JSON array of extracted 5-digit order numbers
  // Change tracking fields
  changeType: 'new' | 'updated' | null;
  changedAt: string | null;
  changedFields: string | null; // JSON array of changed field names
  previousValues: string | null; // JSON object of previous values
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchucoFetchLog {
  id: number;
  status: 'success' | 'error' | 'pending';
  triggerType: 'manual' | 'scheduled';
  recordsCount: number | null;
  newRecords: number | null;
  updatedRecords: number | null;
  unchangedRecords: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface SchucoRefreshResponse {
  message: string;
  recordsCount: number;
  newRecords?: number;
  updatedRecords?: number;
  unchangedRecords?: number;
  durationMs: number;
}

export interface SchucoDeliveriesResponse {
  data: SchucoDelivery[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Schuco delivery linked to an order
 */
export interface SchucoDeliveryLink {
  id: number;
  linkedAt: string;
  linkedBy: string | null;
  schucoDelivery: {
    id: number;
    orderNumber: string;
    orderName?: string;
    shippingStatus: string;
    deliveryWeek: string | null;
    totalAmount: string | null;
    isWarehouseItem: boolean;
    orderDateParsed?: string | null;
  };
}

/**
 * Sync links response
 */
export interface SchucoSyncLinksResponse {
  total: number;
  processed: number;
  linksCreated: number;
  warehouseItems: number;
}
