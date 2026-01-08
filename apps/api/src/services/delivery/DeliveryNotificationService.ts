/**
 * DeliveryNotificationService - Centralized notification handling for deliveries
 *
 * Responsibilities:
 * - Centralize all delivery-related notifications
 * - WebSocket event emission (via DeliveryEventEmitter)
 * - Email notifications (when implemented)
 * - Status change notifications
 * - Batch notification handling
 *
 * This service consolidates all notification logic to ensure consistent
 * notification patterns across all delivery operations.
 */

import { DeliveryEventEmitter, deliveryEventEmitter } from './DeliveryEventEmitter.js';
import { logger } from '../../utils/logger.js';

/**
 * Notification types for deliveries
 */
export type DeliveryNotificationType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'order_added'
  | 'order_removed'
  | 'order_moved'
  | 'orders_completed'
  | 'optimization_completed'
  | 'optimization_deleted';

/**
 * Base notification data structure
 */
export interface NotificationPayload extends Record<string, unknown> {
  type: DeliveryNotificationType;
  deliveryId: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Email notification configuration (for future implementation)
 */
export interface EmailNotificationConfig {
  enabled: boolean;
  recipients?: string[];
  templateId?: string;
}

/**
 * Status change notification details
 */
export interface StatusChangeNotification {
  deliveryId: number;
  previousStatus: string;
  newStatus: string;
  changedBy?: string;
}

/**
 * Order operation notification details
 */
export interface OrderOperationNotification {
  deliveryId: number;
  orderId: number;
  orderNumber?: string;
  operation: 'added' | 'removed' | 'moved';
  targetDeliveryId?: number;
}

/**
 * Batch notification for multiple updates
 */
export interface BatchNotification {
  type: 'deliveries_updated' | 'orders_updated';
  ids: number[];
  operation: string;
}

export class DeliveryNotificationService {
  private eventEmitter: DeliveryEventEmitter;
  private emailConfig: EmailNotificationConfig = { enabled: false };

  constructor(eventEmitter?: DeliveryEventEmitter) {
    this.eventEmitter = eventEmitter || deliveryEventEmitter;
  }

  // ===================
  // Configuration
  // ===================

  /**
   * Configure email notifications
   */
  configureEmail(config: EmailNotificationConfig): void {
    this.emailConfig = { ...this.emailConfig, ...config };
    logger.info('Email notification config updated', { enabled: config.enabled });
  }

  // ===================
  // Delivery Lifecycle Notifications
  // ===================

  /**
   * Notify when a delivery is created
   */
  notifyDeliveryCreated(delivery: {
    id: number;
    deliveryNumber?: string;
    deliveryDate?: Date;
  }): void {
    logger.debug('Notifying delivery created', { deliveryId: delivery.id });
    this.eventEmitter.emitDeliveryCreated(delivery);
    this.logNotification('created', delivery.id);

    // Future: Send email notification if configured
    if (this.emailConfig.enabled) {
      this.queueEmailNotification('created', delivery.id);
    }
  }

  /**
   * Notify when a delivery is updated
   */
  notifyDeliveryUpdated(deliveryId: number, changes?: Record<string, unknown>): void {
    logger.debug('Notifying delivery updated', { deliveryId, changes });
    this.eventEmitter.emitDeliveryUpdated({ id: deliveryId });
    this.logNotification('updated', deliveryId, changes);
  }

  /**
   * Notify when a delivery is deleted
   */
  notifyDeliveryDeleted(deliveryId: number): void {
    logger.debug('Notifying delivery deleted', { deliveryId });
    this.eventEmitter.emitDeliveryDeleted(deliveryId);
    this.logNotification('deleted', deliveryId);
  }

  /**
   * Notify when delivery status changes
   */
  notifyStatusChanged(notification: StatusChangeNotification): void {
    const { deliveryId, previousStatus, newStatus, changedBy } = notification;
    logger.info('Delivery status changed', {
      deliveryId,
      previousStatus,
      newStatus,
      changedBy,
    });

    this.eventEmitter.emitDeliveryUpdated({ id: deliveryId });
    this.logNotification('status_changed', deliveryId, { previousStatus, newStatus });

    // Future: Send email notification for important status changes
    if (this.emailConfig.enabled && this.isImportantStatusChange(previousStatus, newStatus)) {
      this.queueEmailNotification('status_changed', deliveryId, { previousStatus, newStatus });
    }
  }

  // ===================
  // Order-Delivery Operations Notifications
  // ===================

  /**
   * Notify when an order is added to a delivery
   */
  notifyOrderAdded(deliveryId: number, orderId: number, orderNumber?: string): void {
    logger.debug('Notifying order added to delivery', { deliveryId, orderId, orderNumber });
    this.eventEmitter.emitOrderAddedToDelivery(deliveryId, orderId);
    this.logNotification('order_added', deliveryId, { orderId, orderNumber });
  }

  /**
   * Notify when an order is removed from a delivery
   */
  notifyOrderRemoved(deliveryId: number, orderId: number, orderNumber?: string): void {
    logger.debug('Notifying order removed from delivery', { deliveryId, orderId, orderNumber });
    this.eventEmitter.emitOrderRemovedFromDelivery(deliveryId, orderId);
    this.logNotification('order_removed', deliveryId, { orderId, orderNumber });
  }

  /**
   * Notify when an order is moved between deliveries
   */
  notifyOrderMoved(
    sourceDeliveryId: number,
    targetDeliveryId: number,
    orderId: number,
    orderNumber?: string
  ): void {
    logger.debug('Notifying order moved between deliveries', {
      sourceDeliveryId,
      targetDeliveryId,
      orderId,
      orderNumber,
    });
    this.eventEmitter.emitOrderMovedBetweenDeliveries(sourceDeliveryId, targetDeliveryId, orderId);
    this.logNotification('order_moved', sourceDeliveryId, {
      targetDeliveryId,
      orderId,
      orderNumber,
    });
  }

  /**
   * Notify when delivery orders are completed
   */
  notifyOrdersCompleted(deliveryId: number, orderIds: number[], productionDate?: string): void {
    logger.info('Notifying delivery orders completed', {
      deliveryId,
      orderCount: orderIds.length,
      productionDate,
    });
    this.eventEmitter.emitDeliveryOrdersCompleted(deliveryId, orderIds);
    this.logNotification('orders_completed', deliveryId, { orderCount: orderIds.length });
  }

  // ===================
  // Optimization Notifications
  // ===================

  /**
   * Notify when pallet optimization is completed
   */
  notifyOptimizationCompleted(
    deliveryId: number,
    palletCount: number,
    utilizationPercent: number
  ): void {
    logger.info('Notifying optimization completed', {
      deliveryId,
      palletCount,
      utilizationPercent: utilizationPercent.toFixed(2),
    });
    this.eventEmitter.emitDeliveryUpdated({ id: deliveryId });
    this.logNotification('optimization_completed', deliveryId, {
      palletCount,
      utilizationPercent,
    });
  }

  /**
   * Notify when optimization is deleted
   */
  notifyOptimizationDeleted(deliveryId: number): void {
    logger.debug('Notifying optimization deleted', { deliveryId });
    this.eventEmitter.emitDeliveryUpdated({ id: deliveryId });
    this.logNotification('optimization_deleted', deliveryId);
  }

  // ===================
  // Batch Notifications
  // ===================

  /**
   * Notify when multiple deliveries are updated at once
   */
  notifyDeliveriesUpdated(deliveryIds: number[], operation: string): void {
    logger.info('Notifying batch delivery update', {
      deliveryCount: deliveryIds.length,
      operation,
    });
    this.eventEmitter.emitDeliveriesUpdated(deliveryIds);

    // Log each notification for tracking
    deliveryIds.forEach((id) => {
      this.logNotification('updated', id, { operation, batchUpdate: true });
    });
  }

  /**
   * Notify when multiple orders are updated at once
   */
  notifyOrdersUpdated(orderIds: number[], operation: string): void {
    logger.info('Notifying batch order update', {
      orderCount: orderIds.length,
      operation,
    });
    this.eventEmitter.emitOrdersUpdated(orderIds);
  }

  // ===================
  // Private Helpers
  // ===================

  /**
   * Log notification for audit/debugging
   */
  private logNotification(
    type: DeliveryNotificationType,
    deliveryId: number,
    metadata?: Record<string, unknown>
  ): void {
    const payload: NotificationPayload = {
      type,
      deliveryId,
      timestamp: new Date(),
      metadata,
    };

    // Log for debugging/audit trail
    logger.debug('Notification sent', payload);
  }

  /**
   * Check if a status change is important enough for email
   */
  private isImportantStatusChange(previousStatus: string, newStatus: string): boolean {
    const importantTransitions = [
      { from: 'planned', to: 'loading' },
      { from: 'loading', to: 'shipped' },
      { from: 'shipped', to: 'delivered' },
    ];

    return importantTransitions.some(
      (t) => t.from === previousStatus && t.to === newStatus
    );
  }

  /**
   * Queue email notification (placeholder for future implementation)
   */
  private queueEmailNotification(
    type: DeliveryNotificationType,
    deliveryId: number,
    data?: Record<string, unknown>
  ): void {
    // TODO: Implement actual email sending when email service is available
    logger.debug('Email notification queued (not implemented)', {
      type,
      deliveryId,
      data,
      recipients: this.emailConfig.recipients,
    });
  }
}

// Export singleton instance for convenience
export const deliveryNotificationService = new DeliveryNotificationService();
