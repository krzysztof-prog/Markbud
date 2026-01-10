import type { ID, Timestamp, Priority } from './common';
import type { Import } from './import';
import type { Delivery } from './delivery';

/**
 * Statystyki dashboard
 */
export interface DashboardStats {
  activeOrders: number;
  upcomingDeliveriesCount: number;
  pendingImportsCount: number;
  shortagesCount: number;
}

/**
 * Alert systemowy
 */
export interface Alert {
  id: ID;
  message: string;
  details?: string;
  priority: Priority;
  timestamp: Timestamp;
  type: 'shortage' | 'delivery' | 'import' | 'system' | 'warning';
  isRead?: boolean;
}

/**
 * Dashboard response
 */
export interface DashboardResponse {
  stats: DashboardStats;
  pendingImports: Import[];
  upcomingDeliveries: Delivery[];
  alerts?: Alert[];
}
