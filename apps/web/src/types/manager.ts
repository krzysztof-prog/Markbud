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
  /** Opcjonalne - gdy użytkownik zaznaczył całe dostawy, zmień też ich status */
  deliveryIds?: number[];
  status: 'new' | 'in_progress' | 'completed' | 'archived';
  productionDate?: string;
  /** Pomiń walidację magazynu - gdy użytkownik potwierdził mimo braków */
  skipWarehouseValidation?: boolean;
}

/**
 * Complete all orders in a delivery
 */
export interface CompleteDeliveryData {
  productionDate: string;
}
