/**
 * DeliveryEventEmitter - Centralized event emission for delivery operations
 *
 * Responsibilities:
 * - Centralize all delivery-related event emissions
 * - Ensure consistent event data structure
 * - Provide clear interface for event tracking
 */

import {
  emitDeliveryCreated as emitCreated,
  emitDeliveryUpdated as emitUpdated,
  emitDeliveryDeleted as emitDeleted,
  emitOrderUpdated as emitOrderUpdatedEvent,
  type EventData,
} from '../event-emitter.js';

export interface DeliveryEventData extends EventData {
  id: number;
  deliveryNumber?: string;
  deliveryDate?: Date;
}

export interface OrderEventData extends EventData {
  id: number;
}

/**
 * Centralized event emitter for delivery-related operations.
 * Wraps the global event emitter with delivery-specific methods.
 */
export class DeliveryEventEmitter {
  /**
   * Emit event when a new delivery is created
   */
  emitDeliveryCreated(delivery: DeliveryEventData): void {
    emitCreated(delivery);
  }

  /**
   * Emit event when a delivery is updated
   */
  emitDeliveryUpdated(delivery: { id: number }): void {
    emitUpdated(delivery);
  }

  /**
   * Emit event when a delivery is deleted
   */
  emitDeliveryDeleted(deliveryId: number): void {
    emitDeleted(deliveryId);
  }

  /**
   * Emit event when an order is updated (e.g., added to or removed from delivery)
   */
  emitOrderUpdated(order: { id: number }): void {
    emitOrderUpdatedEvent(order);
  }

  /**
   * Emit events when an order is added to a delivery
   */
  emitOrderAddedToDelivery(deliveryId: number, orderId: number): void {
    this.emitDeliveryUpdated({ id: deliveryId });
    this.emitOrderUpdated({ id: orderId });
  }

  /**
   * Emit events when an order is removed from a delivery
   */
  emitOrderRemovedFromDelivery(deliveryId: number, orderId: number): void {
    this.emitDeliveryUpdated({ id: deliveryId });
    this.emitOrderUpdated({ id: orderId });
  }

  /**
   * Emit events when an order is moved between deliveries
   */
  emitOrderMovedBetweenDeliveries(
    sourceDeliveryId: number,
    targetDeliveryId: number,
    orderId: number
  ): void {
    this.emitDeliveryUpdated({ id: sourceDeliveryId });
    this.emitDeliveryUpdated({ id: targetDeliveryId });
    this.emitOrderUpdated({ id: orderId });
  }

  /**
   * Emit events for multiple deliveries updated at once (batch operations)
   */
  emitDeliveriesUpdated(deliveryIds: number[]): void {
    deliveryIds.forEach((id) => this.emitDeliveryUpdated({ id }));
  }

  /**
   * Emit events for multiple orders updated at once (batch operations)
   */
  emitOrdersUpdated(orderIds: number[]): void {
    orderIds.forEach((id) => this.emitOrderUpdated({ id }));
  }

  /**
   * Emit events when delivery orders are completed
   */
  emitDeliveryOrdersCompleted(deliveryId: number, orderIds: number[]): void {
    this.emitDeliveryUpdated({ id: deliveryId });
    this.emitOrdersUpdated(orderIds);
  }
}

// Export singleton instance for convenience
export const deliveryEventEmitter = new DeliveryEventEmitter();
