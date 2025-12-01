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
