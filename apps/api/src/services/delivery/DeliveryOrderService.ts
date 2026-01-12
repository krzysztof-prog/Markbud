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
import { PalletOptimizerRepository } from '../../repositories/PalletOptimizerRepository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { OrderVariantService, type VariantType } from '../orderVariantService.js';
import { CsvParser } from '../parsers/csv-parser.js';
import { DeliveryNotificationService, deliveryNotificationService } from './DeliveryNotificationService.js';
import { logger } from '../../utils/logger.js';
import type { PrismaClient } from '@prisma/client';

/**
 * P1-2: Variant conflict check result
 */
export interface VariantConflictResult {
  hasConflict: boolean;
  requiresVariantTypeSelection?: boolean;
  conflictingOrder?: {
    orderNumber: string;
    variantType?: VariantType;
    deliveryAssignment?: {
      deliveryId: number;
      deliveryNumber?: string;
    };
  };
  originalDelivery?: {
    deliveryId: number;
    deliveryNumber: string;
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
  private palletOptimizerRepository: PalletOptimizerRepository;

  constructor(
    private repository: DeliveryRepository,
    private prisma: PrismaClient
  ) {
    this.variantService = new OrderVariantService(prisma);
    this.csvParser = new CsvParser();
    this.notificationService = deliveryNotificationService;
    this.palletOptimizerRepository = new PalletOptimizerRepository(prisma);
  }

  // ===================
  // Order-Delivery Operations
  // ===================

  /**
   * Add an order to a delivery with variant conflict checking
   * P1-2: Now respects variantType for conflict validation
   */
  async addOrderToDelivery(
    deliveryId: number,
    orderId: number,
    deliveryNumber?: string
  ): Promise<{ deliveryId: number; orderId: number; position: number }> {
    // Get order details to extract order number and variant type
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, variantType: true },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // P0-R1: Wymuszenie variantType dla zleceń z sufixem
    const { suffix } = this.csvParser.parseOrderNumber(order.orderNumber);
    if (suffix && !order.variantType) {
      throw new ValidationError(
        `Zlecenie ${order.orderNumber} jest wariantem (ma sufix "${suffix}"). ` +
          `Przed przypisaniem do dostawy musisz określić typ wariantu: ` +
          `korekta (correction) lub dodatkowy plik (additional_file).`,
        { code: 'VARIANT_TYPE_REQUIRED_FOR_SUFFIX' }
      );
    }

    // P1-2: Check for variant conflicts with variant type
    await this.validateNoVariantConflict(
      order.orderNumber,
      deliveryId,
      deliveryNumber,
      order.variantType as VariantType
    );

    logger.info('No variant conflicts found, proceeding to add order to delivery', {
      orderId,
      orderNumber: order.orderNumber,
      variantType: order.variantType,
      deliveryId,
    });

    // Add order with atomic position calculation to prevent race conditions
    const deliveryOrder = await this.repository.addOrderToDeliveryAtomic(deliveryId, orderId);

    // P1-4: Invalidate pallet optimization when orders change
    await this.invalidatePalletOptimization(deliveryId);

    // Notify about order addition
    this.notificationService.notifyOrderAdded(deliveryId, orderId, order.orderNumber);

    return deliveryOrder;
  }

  /**
   * Remove an order from a delivery
   */
  async removeOrderFromDelivery(deliveryId: number, orderId: number): Promise<void> {
    await this.repository.removeOrderFromDelivery(deliveryId, orderId);

    // P1-4: Invalidate pallet optimization when orders change
    await this.invalidatePalletOptimization(deliveryId);

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

    // P1-4: Invalidate pallet optimization when order positions change
    // Pozycja okien na paletach zależy od kolejności zamówień
    await this.invalidatePalletOptimization(deliveryId);

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

    // P1-4: Invalidate pallet optimization for BOTH deliveries when order moves
    await Promise.all([
      this.invalidatePalletOptimization(sourceDeliveryId),
      this.invalidatePalletOptimization(targetDeliveryId),
    ]);

    // Notify about order move after successful transaction
    this.notificationService.notifyOrderMoved(sourceDeliveryId, targetDeliveryId, orderId);

    return deliveryOrder;
  }

  // ===================
  // Validation Methods
  // ===================

  /**
   * P1-2: Validate variant conflict with support for variant types
   *
   * Logika:
   * - 'additional_file' → może być w innej dostawie (brak konfliktu)
   * - 'correction' → musi być w tej samej dostawie co oryginał
   * - null/undefined → wymaga wyboru typu przez użytkownika
   */
  async validateNoVariantConflict(
    orderNumber: string,
    deliveryId: number,
    deliveryNumber?: string,
    variantType?: VariantType
  ): Promise<void> {
    // Parse order number to get base number
    const { base: baseNumber, suffix } = this.csvParser.parseOrderNumber(orderNumber);

    // Jeśli to zlecenie bazowe (bez sufixu) - nie sprawdzamy konfliktów wariantów
    if (!suffix) {
      logger.info('Base order (no suffix) - skipping variant conflict check', {
        orderNumber,
        baseNumber,
      });
      return;
    }

    logger.info('Checking for order variant conflicts before adding to delivery', {
      orderNumber,
      baseNumber,
      suffix,
      variantType,
      deliveryId,
      deliveryNumber,
    });

    // P1-2: Check if any variant of this order is already in a delivery
    const variantCheck = await this.variantService.checkVariantInDelivery(baseNumber, variantType);

    // Brak konfliktu - można dodać
    if (!variantCheck.hasConflict) {
      return;
    }

    // P1-2: Wymaga wyboru typu wariantu przez użytkownika
    if (variantCheck.requiresVariantTypeSelection) {
      const conflictingOrder = variantCheck.conflictingOrder;

      logger.warn('Variant type selection required', {
        newOrder: orderNumber,
        conflictingOrder: conflictingOrder?.orderNumber,
        originalDelivery: variantCheck.originalDelivery,
      });

      // Rzucamy specjalny błąd z informacją że wymaga wyboru typu
      throw new ValidationError(
        `Zlecenie ${orderNumber} jest wariantem zlecenia ${conflictingOrder?.orderNumber} ` +
          `(przypisanego do dostawy ${variantCheck.originalDelivery?.deliveryNumber || variantCheck.originalDelivery?.deliveryId}). ` +
          `Wybierz typ wariantu: korekta (musi byc w tej samej dostawie) lub dodatkowy plik (moze byc w innej).`,
        { code: 'VARIANT_TYPE_REQUIRED', originalDelivery: variantCheck.originalDelivery }
      );
    }

    // P1-2: Konflikt - korekta musi być w tej samej dostawie
    if (variantCheck.conflictingOrder) {
      const conflictingOrder = variantCheck.conflictingOrder;
      const conflictingDelivery = conflictingOrder.deliveryAssignment;

      // Sprawdź czy próbujemy dodać do tej samej dostawy - wtedy OK
      if (conflictingDelivery?.deliveryId === deliveryId) {
        logger.info('Correction variant added to same delivery as original - OK', {
          orderNumber,
          deliveryId,
        });
        return;
      }

      logger.warn('Order variant conflict detected - correction must be in same delivery', {
        newOrder: orderNumber,
        conflictingOrder: conflictingOrder.orderNumber,
        deliveryNumber: conflictingDelivery?.deliveryNumber,
        deliveryId: conflictingDelivery?.deliveryId,
        targetDeliveryId: deliveryId,
      });

      throw new ValidationError(
        `Zlecenie ${orderNumber} jest korekta zlecenia ${conflictingOrder.orderNumber}. ` +
          `Korekty musza byc w tej samej dostawie co oryginal ` +
          `(${conflictingDelivery?.deliveryNumber || conflictingDelivery?.deliveryId}).`
      );
    }
  }

  /**
   * P1-2: Check if an order can be added to a delivery (without throwing)
   * Supports variant type validation
   */
  async canAddOrderToDelivery(
    orderNumber: string,
    deliveryId: number,
    variantType?: VariantType
  ): Promise<{
    canAdd: boolean;
    reason?: string;
    requiresVariantTypeSelection?: boolean;
    originalDelivery?: { deliveryId: number; deliveryNumber: string };
  }> {
    try {
      await this.validateNoVariantConflict(orderNumber, deliveryId, undefined, variantType);
      return { canAdd: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        // P1-2: Extract metadata from ValidationError if present
        return {
          canAdd: false,
          reason: error.message,
          requiresVariantTypeSelection: error.metadata?.code === 'VARIANT_TYPE_REQUIRED',
          originalDelivery: error.metadata?.originalDelivery as
            | { deliveryId: number; deliveryNumber: string }
            | undefined,
        };
      }
      throw error;
    }
  }

  // ===================
  // Private Helper Methods
  // ===================

  /**
   * P1-4: Invalidate pallet optimization when delivery orders change
   * Zapisana optymalizacja palet jest nieaktualna gdy:
   * - Dodano zamówienie do dostawy
   * - Usunięto zamówienie z dostawy
   * - Zmieniono kolejność zamówień
   * - Przeniesiono zamówienie między dostawami
   */
  private async invalidatePalletOptimization(deliveryId: number): Promise<void> {
    const deleted = await this.palletOptimizerRepository.deleteOptimization(deliveryId);
    if (deleted) {
      logger.info('Pallet optimization invalidated due to delivery order change', {
        deliveryId,
      });
    }
  }
}
