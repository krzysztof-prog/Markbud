/**
 * DeliveryOrderService - Order-Delivery association management
 *
 * Responsibilities:
 * - Add/remove orders from deliveries
 * - Handle variant conflict validation
 * - Reorder delivery orders
 * - Move orders between deliveries
 *
 * This service handles all order-delivery association logic,
 * keeping the main DeliveryService focused on core CRUD operations.
 */

import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { OrderVariantService } from '../orderVariantService.js';
import { CsvParser } from '../parsers/csv-parser.js';
import { DeliveryNotificationService, deliveryNotificationService } from './DeliveryNotificationService.js';
import { logger } from '../../utils/logger.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Variant conflict check result
 */
export interface VariantConflictResult {
  hasConflict: boolean;
  conflictingOrder?: {
    orderNumber: string;
    deliveryAssignment?: {
      deliveryId: number;
      deliveryNumber?: string;
    };
  };
}

/**
 * Delivery order info for validation
 */
interface DeliveryOrderInfo {
  orderId: number;
  orderNumber?: string;
}

export class DeliveryOrderService {
  private variantService: OrderVariantService;
  private csvParser: CsvParser;
  private notificationService: DeliveryNotificationService;

  constructor(
    private repository: DeliveryRepository,
    private prisma: PrismaClient
  ) {
    this.variantService = new OrderVariantService(prisma);
    this.csvParser = new CsvParser();
    this.notificationService = deliveryNotificationService;
  }

  // ===================
  // Order-Delivery Operations
  // ===================

  /**
   * Add an order to a delivery with variant conflict checking
   */
  async addOrderToDelivery(
    deliveryId: number,
    orderId: number,
    deliveryNumber?: string
  ): Promise<{ deliveryId: number; orderId: number; position: number }> {
    // Get order details to extract order number
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Check for variant conflicts
    await this.validateNoVariantConflict(order.orderNumber, deliveryId, deliveryNumber);

    logger.info('No variant conflicts found, proceeding to add order to delivery', {
      orderId,
      orderNumber: order.orderNumber,
      deliveryId,
    });

    // Add order with atomic position calculation to prevent race conditions
    const deliveryOrder = await this.repository.addOrderToDeliveryAtomic(deliveryId, orderId);

    // Notify about order addition
    this.notificationService.notifyOrderAdded(deliveryId, orderId, order.orderNumber);

    return deliveryOrder;
  }

  /**
   * Remove an order from a delivery
   */
  async removeOrderFromDelivery(deliveryId: number, orderId: number): Promise<void> {
    await this.repository.removeOrderFromDelivery(deliveryId, orderId);

    // Notify about order removal
    this.notificationService.notifyOrderRemoved(deliveryId, orderId);
  }

  /**
   * Reorder orders within a delivery
   */
  async reorderDeliveryOrders(
    deliveryId: number,
    orderIds: number[],
    existingOrderInfos: DeliveryOrderInfo[]
  ): Promise<{ success: boolean }> {
    // Validation 1: Remove duplicates
    const uniqueOrderIds = [...new Set(orderIds)];

    if (uniqueOrderIds.length !== orderIds.length) {
      throw new ValidationError('Lista zlecen zawiera duplikaty');
    }

    // Validation 2: Get existing orders in this delivery
    const existingOrderIds = new Set(existingOrderInfos.map((d) => d.orderId));

    // Validation 3: Check if all orderIds belong to this delivery
    const invalidOrders = uniqueOrderIds.filter((id) => !existingOrderIds.has(id));
    if (invalidOrders.length > 0) {
      throw new ValidationError(
        `Nastepujace zlecenia nie naleza do tej dostawy: ${invalidOrders.join(', ')}`
      );
    }

    // Validation 4: Are all orders included?
    if (uniqueOrderIds.length !== existingOrderIds.size) {
      throw new ValidationError(
        `Lista zlecen jest niepelna. Oczekiwano ${existingOrderIds.size} zlecen, otrzymano ${uniqueOrderIds.length}`
      );
    }

    await this.repository.reorderDeliveryOrders(deliveryId, uniqueOrderIds);
    return { success: true };
  }

  /**
   * Move an order between deliveries
   */
  async moveOrderBetweenDeliveries(
    sourceDeliveryId: number,
    targetDeliveryId: number,
    orderId: number
  ): Promise<{ deliveryId: number; orderId: number; position: number }> {
    // Execute as atomic transaction to prevent data loss
    const deliveryOrder = await this.repository.moveOrderBetweenDeliveries(
      sourceDeliveryId,
      targetDeliveryId,
      orderId
    );

    // Notify about order move after successful transaction
    this.notificationService.notifyOrderMoved(sourceDeliveryId, targetDeliveryId, orderId);

    return deliveryOrder;
  }

  // ===================
  // Validation Methods
  // ===================

  /**
   * Validate that no variant of this order is already in a delivery
   */
  async validateNoVariantConflict(
    orderNumber: string,
    deliveryId: number,
    deliveryNumber?: string
  ): Promise<void> {
    // Parse order number to get base number
    const { base: baseNumber } = this.csvParser.parseOrderNumber(orderNumber);

    logger.info('Checking for order variant conflicts before adding to delivery', {
      orderNumber,
      baseNumber,
      deliveryId,
      deliveryNumber,
    });

    // Check if any variant of this order is already in a delivery
    const variantCheck = await this.variantService.checkVariantInDelivery(baseNumber);

    if (variantCheck.hasConflict && variantCheck.conflictingOrder) {
      const conflictingOrder = variantCheck.conflictingOrder;
      const conflictingDelivery = conflictingOrder.deliveryAssignment;

      logger.warn('Order variant conflict detected', {
        newOrder: orderNumber,
        conflictingOrder: conflictingOrder.orderNumber,
        deliveryNumber: conflictingDelivery?.deliveryNumber,
        deliveryId: conflictingDelivery?.deliveryId,
      });

      throw new ValidationError(
        `Zlecenie ${conflictingOrder.orderNumber} (wariant tego samego zlecenia bazowego ${baseNumber}) jest juz przypisane do dostawy ${conflictingDelivery?.deliveryNumber || conflictingDelivery?.deliveryId}`
      );
    }
  }

  /**
   * Check if an order can be added to a delivery (without throwing)
   */
  async canAddOrderToDelivery(
    orderNumber: string,
    deliveryId: number
  ): Promise<{ canAdd: boolean; reason?: string }> {
    try {
      await this.validateNoVariantConflict(orderNumber, deliveryId);
      return { canAdd: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { canAdd: false, reason: error.message };
      }
      throw error;
    }
  }
}
