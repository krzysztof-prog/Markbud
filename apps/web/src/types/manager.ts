import type { Order, Delivery } from './index';

/**
 * Data for the production manager view
 */
export interface ForProductionData {
  overdueOrders: Order[];
  upcomingOrders: Order[];
  privateOrders: Order[];
  upcomingDeliveries: Delivery[];
}

/**
 * Bulk update status for multiple orders
 */
export interface BulkUpdateStatusData {
  orderIds: number[];
  status: 'new' | 'in_progress' | 'completed' | 'archived';
  productionDate?: string;
}

/**
 * Complete all orders in a delivery
 */
export interface CompleteDeliveryData {
  productionDate: string;
}
