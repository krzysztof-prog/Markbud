/**
 * Manager feature API service layer
 */

import { fetchApi } from '@/lib/api-client';
import type { ForProductionData, BulkUpdateStatusData, CompleteDeliveryData } from '@/types/manager';
import type { Order, Delivery } from '@/types';

/**
 * API endpoints for Manager panel
 */
export const managerApi = {
  /**
   * Get orders and deliveries for production view
   * @param params - Optional date range filters
   * @returns Production data with categorized orders and deliveries
   */
  getForProduction: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<ForProductionData>(`/api/orders/for-production${query ? `?${query}` : ''}`);
  },

  /**
   * Bulk update status for multiple orders
   * @param data - Order IDs and new status with optional production date
   * @returns Updated orders
   */
  bulkUpdateStatus: (data: BulkUpdateStatusData) =>
    fetchApi<Order[]>('/api/orders/bulk-update-status', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Get orders in production (status: in_progress)
   * @returns Orders currently in production
   */
  getOrdersInProduction: () =>
    fetchApi<Order[]>('/api/orders?status=in_progress'),

  /**
   * Get deliveries in production (status: in_progress)
   * @returns Deliveries currently in production
   */
  getDeliveriesInProduction: () =>
    fetchApi<Delivery[]>('/api/deliveries?status=in_progress'),

  /**
   * Complete all orders in a delivery
   * @param deliveryId - Delivery ID
   * @param data - Production date
   * @returns Updated delivery
   */
  completeDeliveryOrders: (deliveryId: number, data: CompleteDeliveryData) =>
    fetchApi<Delivery>(`/api/deliveries/${deliveryId}/complete-all-orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Cofnij produkcję - przywróć zlecenia z completed do in_progress
   * Cofa również RW (rozchody wewnętrzne) dla okuć, profili i stali
   * @param orderIds - IDs zleceń do cofnięcia
   * @returns Zaktualizowane zlecenia
   */
  revertProduction: (orderIds: number[]) =>
    fetchApi<Order[]>('/api/orders/revert-production', {
      method: 'POST',
      body: JSON.stringify({ orderIds }),
    }),
};
