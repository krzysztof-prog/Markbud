/**
 * DeliveryService - Main orchestrator for delivery operations
 *
 * Responsibilities:
 * - Core CRUD operations for deliveries
 * - Orchestrate complex multi-service operations
 * - Delegate specialized operations to sub-services
 *
 * This service has been refactored from a 682-line monolith into focused modules:
 * - DeliveryStatisticsService: Analytics and statistics
 * - DeliveryCalendarService: Calendar data aggregation
 * - DeliveryEventEmitter: Event emission (low-level)
 * - DeliveryNotificationService: Notification handling (high-level, WebSocket, email)
 * - DeliveryNumberGenerator: Delivery number generation
 * - DeliveryOptimizationService: Pallet packing and optimization algorithms
 * - DeliveryOrderService: Order-Delivery association management
 */

import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import { OrderRepository } from '../../repositories/OrderRepository.js';
import { PalletOptimizerRepository } from '../../repositories/PalletOptimizerRepository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { parseDate, parseDateSafe } from '../../utils/date-helpers.js';
import { OrderService } from '../orderService.js';
import { deliveryTotalsService } from '../deliveryTotalsService.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../index.js';
import { groszeToPln, type Grosze } from '../../utils/money.js';
import {
  validateDeliveryStatusTransition,
  validateOrdersForDeliveryStatus,
  type DeliveryStatus,
} from '../../utils/delivery-status-machine.js';

// Import sub-services
import { DeliveryNumberGenerator } from './DeliveryNumberGenerator.js';
import { DeliveryStatisticsService } from './DeliveryStatisticsService.js';
import { DeliveryCalendarService, type CalendarMonth } from './DeliveryCalendarService.js';
import { DeliveryNotificationService, deliveryNotificationService } from './DeliveryNotificationService.js';
import { DeliveryOptimizationService, type OptimizationStatus } from './DeliveryOptimizationService.js';
import { DeliveryOrderService } from './DeliveryOrderService.js';
import { PalletValidationService } from '../palletValidationService.js';
import { CalendarService } from '../calendar/CalendarService.js';
import type { OptimizationOptions, OptimizationResult } from '../pallet-optimizer/PalletOptimizerService.js';

export class DeliveryService {
  private orderService: OrderService;
  private notificationService: DeliveryNotificationService;
  private numberGenerator: DeliveryNumberGenerator;
  private statisticsService: DeliveryStatisticsService;
  private calendarService: DeliveryCalendarService;
  private optimizationService: DeliveryOptimizationService;
  private deliveryOrderService: DeliveryOrderService;
  private palletValidationService: PalletValidationService;

  constructor(private repository: DeliveryRepository, orderService?: OrderService) {
    // Allow injection for testing, otherwise create internally
    this.orderService = orderService || new OrderService(new OrderRepository(prisma));
    this.notificationService = deliveryNotificationService;
    this.numberGenerator = new DeliveryNumberGenerator(prisma);
    this.statisticsService = new DeliveryStatisticsService(repository);
    // CalendarService do logiki świąt (obliczane, nie z DB)
    const calendarSvc = new CalendarService(prisma);
    this.calendarService = new DeliveryCalendarService(repository, calendarSvc);
    this.optimizationService = new DeliveryOptimizationService(
      repository,
      new PalletOptimizerRepository(prisma),
      prisma
    );
    this.deliveryOrderService = new DeliveryOrderService(repository, prisma);
    this.palletValidationService = new PalletValidationService(prisma);
  }

  // ===================
  // CRUD Operations
  // ===================

  async getAllDeliveries(filters: { from?: string; to?: string; status?: string }) {
    const deliveryFilters = {
      from: parseDateSafe(filters.from),
      to: parseDateSafe(filters.to),
      status: filters.status,
    };

    return this.repository.findAll(deliveryFilters);
  }

  async getDeliveryById(id: number) {
    const delivery = await this.repository.findById(id);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    // Add calculated totals
    const totals = await deliveryTotalsService.getDeliveryTotals(id);

    return {
      ...delivery,
      ...totals,
    };
  }

  async createDelivery(data: { deliveryDate: string; deliveryNumber?: string; notes?: string }) {
    const deliveryDate = parseDate(data.deliveryDate);

    // Generate delivery number if not provided
    let deliveryNumber = data.deliveryNumber;
    if (!deliveryNumber) {
      deliveryNumber = await this.numberGenerator.generateDeliveryNumber(deliveryDate);
    }

    const delivery = await this.repository.create({
      deliveryDate,
      deliveryNumber,
      notes: data.notes,
    });

    this.notificationService.notifyDeliveryCreated({
      id: delivery.id,
      deliveryNumber: delivery.deliveryNumber ?? undefined,
      deliveryDate: delivery.deliveryDate,
    });

    return delivery;
  }

  async updateDelivery(id: number, data: { deliveryDate?: string; status?: string; notes?: string }) {
    // Verify delivery exists and get previous status for status change notifications
    const existingDelivery = await this.getDeliveryById(id);
    const previousStatus = existingDelivery.status;

    // Validate status transition if status is being changed
    if (data.status && data.status !== previousStatus) {
      validateDeliveryStatusTransition(previousStatus || 'planned', data.status);

      // When completing delivery, validate that all orders are ready
      if (data.status === 'completed') {
        const orderStatuses = existingDelivery.deliveryOrders?.map(
          (dOrder: { order?: { status?: string } }) => dOrder.order?.status || 'new'
        ) || [];
        validateOrdersForDeliveryStatus(data.status as DeliveryStatus, orderStatuses);
      }

      // P0-R2: When shipping delivery, validate pallet optimization
      if (data.status === 'shipped' || data.status === 'in_transit') {
        const palletCheck = await this.palletValidationService.canShipDelivery(id);
        if (!palletCheck.canShip) {
          throw new ValidationError(
            palletCheck.reason || 'Nie można wysłać dostawy - weryfikacja palet nie powiodła się'
          );
        }
      }
    }

    const delivery = await this.repository.update(id, {
      deliveryDate: parseDateSafe(data.deliveryDate),
      status: data.status,
      notes: data.notes,
    });

    // Notify about update
    this.notificationService.notifyDeliveryUpdated(delivery.id, {
      deliveryDate: data.deliveryDate,
      status: data.status,
      notes: data.notes,
    });

    // If status changed, also send status change notification
    if (data.status && data.status !== previousStatus) {
      this.notificationService.notifyStatusChanged({
        deliveryId: delivery.id,
        previousStatus: previousStatus || 'unknown',
        newStatus: data.status,
      });
    }

    return delivery;
  }

  async deleteDelivery(id: number) {
    // Verify delivery exists
    await this.getDeliveryById(id);

    await this.repository.delete(id);

    this.notificationService.notifyDeliveryDeleted(id);
  }

  // ===================
  // Order-Delivery Operations (delegated to DeliveryOrderService)
  // ===================

  async addOrderToDelivery(deliveryId: number, orderId: number) {
    // Verify delivery exists first
    const delivery = await this.getDeliveryById(deliveryId);
    return this.deliveryOrderService.addOrderToDelivery(deliveryId, orderId, delivery.deliveryNumber ?? undefined);
  }

  async removeOrderFromDelivery(deliveryId: number, orderId: number) {
    return this.deliveryOrderService.removeOrderFromDelivery(deliveryId, orderId);
  }

  async reorderDeliveryOrders(deliveryId: number, orderIds: number[]) {
    // Get existing orders for validation
    const delivery = await this.getDeliveryById(deliveryId);
    const existingOrderInfos = delivery.deliveryOrders.map((d: { orderId: number }) => ({
      orderId: d.orderId,
    }));
    return this.deliveryOrderService.reorderDeliveryOrders(deliveryId, orderIds, existingOrderInfos);
  }

  async moveOrderBetweenDeliveries(
    sourceDeliveryId: number,
    targetDeliveryId: number,
    orderId: number
  ) {
    return this.deliveryOrderService.moveOrderBetweenDeliveries(
      sourceDeliveryId,
      targetDeliveryId,
      orderId
    );
  }

  // ===================
  // Item Operations
  // ===================

  async addItemToDelivery(deliveryId: number, data: { itemType: string; description: string; quantity: number }) {
    // Verify delivery exists
    await this.getDeliveryById(deliveryId);

    const item = await this.repository.addItem(deliveryId, data);

    this.notificationService.notifyDeliveryUpdated(deliveryId, { itemAdded: data.itemType });

    return item;
  }

  async removeItemFromDelivery(deliveryId: number, itemId: number) {
    await this.repository.removeItem(itemId);

    this.notificationService.notifyDeliveryUpdated(deliveryId, { itemRemoved: itemId });
  }

  // ===================
  // Completion Operations
  // ===================

  async completeDelivery(deliveryId: number, productionDate: string) {
    const delivery = await this.repository.getDeliveryOrders(deliveryId);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    const orderIds = delivery.deliveryOrders.map((d: { orderId: number }) => d.orderId);

    await this.repository.updateOrdersBatch(orderIds, {
      productionDate: parseDate(productionDate),
      status: 'completed',
    });

    // Notify about orders completion
    this.notificationService.notifyOrdersCompleted(deliveryId, orderIds, productionDate);

    return { success: true, updatedOrders: orderIds.length };
  }

  /**
   * Complete all orders in a delivery using orderService.bulkUpdateStatus
   */
  async completeAllOrders(deliveryId: number, productionDate?: string) {
    // Get delivery with orders
    const delivery = await this.repository.getDeliveryOrders(deliveryId);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    // Extract order IDs
    const orderIds = delivery.deliveryOrders.map((d: { orderId: number }) => d.orderId);

    if (orderIds.length === 0) {
      return { success: true, updatedOrders: 0 };
    }

    // Use orderService to update all orders
    await this.orderService.bulkUpdateStatus(orderIds, 'completed', productionDate);

    // Notify about orders completion
    this.notificationService.notifyOrdersCompleted(deliveryId, orderIds, productionDate);

    return { success: true, updatedOrders: orderIds.length };
  }

  // ===================
  // Calendar Operations (delegated)
  // ===================

  async getCalendarData(year: number, month: number) {
    return this.calendarService.getCalendarData(year, month);
  }

  async getCalendarDataBatch(months: CalendarMonth[]) {
    return this.calendarService.getCalendarDataBatch(months);
  }

  // ===================
  // Statistics Operations (delegated)
  // ===================

  async getProfileRequirements(fromDate?: string) {
    return this.statisticsService.getProfileRequirements(fromDate);
  }

  async getWindowsStatsByWeekday(monthsBack: number) {
    return this.statisticsService.getWindowsStatsByWeekday(monthsBack);
  }

  async getMonthlyWindowsStats(monthsBack: number) {
    return this.statisticsService.getMonthlyWindowsStats(monthsBack);
  }

  async getMonthlyProfileStats(monthsBack: number) {
    return this.statisticsService.getMonthlyProfileStats(monthsBack);
  }

  // ===================
  // Bulk Operations
  // ===================

  async bulkUpdateDeliveryDates(fromDate: Date, toDate: Date, yearOffset: number) {
    logger.info(
      `Bulk updating delivery dates from ${fromDate.toISOString()} to ${toDate.toISOString()} with offset ${yearOffset} years`
    );

    // Find deliveries in the date range
    const result = await this.repository.findAll({
      from: fromDate,
      to: toDate,
    });

    if (result.data.length === 0) {
      return { updated: 0, deliveries: [] };
    }

    // Update each delivery
    const updates = await Promise.all(
      result.data.map(async (delivery) => {
        const newDate = new Date(delivery.deliveryDate);
        newDate.setFullYear(newDate.getFullYear() + yearOffset);

        const updated = await this.repository.update(delivery.id, {
          deliveryDate: newDate,
        });

        return {
          id: updated.id,
          oldDate: delivery.deliveryDate,
          newDate: updated.deliveryDate,
          deliveryNumber: updated.deliveryNumber,
        };
      })
    );

    // Batch notify all updated deliveries
    const deliveryIds = updates.map((u) => u.id);
    this.notificationService.notifyDeliveriesUpdated(deliveryIds, 'bulk_date_update');

    logger.info(`Successfully updated ${updates.length} deliveries`);

    return {
      updated: updates.length,
      deliveries: updates,
    };
  }

  // ===================
  // Optimization Operations (delegated)
  // ===================

  /**
   * Run pallet optimization for a delivery
   */
  async optimizeDelivery(
    deliveryId: number,
    options?: Partial<OptimizationOptions>
  ): Promise<OptimizationResult> {
    const result = await this.optimizationService.optimizeDelivery(deliveryId, options);

    // Notify about optimization completion
    this.notificationService.notifyOptimizationCompleted(
      deliveryId,
      result.totalPallets,
      result.summary.averageUtilization
    );

    return result;
  }

  /**
   * Get existing optimization for a delivery
   */
  async getOptimization(deliveryId: number): Promise<OptimizationResult | null> {
    return this.optimizationService.getOptimization(deliveryId);
  }

  /**
   * Delete optimization for a delivery
   */
  async deleteOptimization(deliveryId: number): Promise<void> {
    await this.optimizationService.deleteOptimization(deliveryId);
    this.notificationService.notifyOptimizationDeleted(deliveryId);
  }

  /**
   * Get optimization status for a delivery
   */
  async getOptimizationStatus(deliveryId: number): Promise<OptimizationStatus> {
    return this.optimizationService.getOptimizationStatus(deliveryId);
  }

  /**
   * Validate if a delivery is ready for optimization
   */
  async validateForOptimization(deliveryId: number) {
    return this.optimizationService.validateForOptimization(deliveryId);
  }

  /**
   * Estimate number of pallets needed (rough estimate for planning)
   */
  async estimatePalletCount(deliveryId: number): Promise<number> {
    return this.optimizationService.estimatePalletCount(deliveryId);
  }

  // ===================
  // Protocol Operations
  // ===================

  async getProtocolData(deliveryId: number) {
    const delivery = await this.repository.getDeliveryForProtocol(deliveryId);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    let totalWindows = 0;
    let totalValue = 0;

    const orders = delivery.deliveryOrders.map((dOrder: {
      order: {
        orderNumber: string;
        windows: Array<{ quantity: number }>;
        valuePln?: number | null;
      };
    }) => {
      const windowsCount = dOrder.order.windows.reduce((sum, w) => sum + w.quantity, 0);
      totalWindows += windowsCount;

      // Convert grosze to PLN for display (values stored as integers in DB)
      const value = dOrder.order.valuePln ? groszeToPln(dOrder.order.valuePln as Grosze) : 0;
      totalValue += value;

      return {
        orderNumber: dOrder.order.orderNumber,
        windowsCount,
        value,
        isReclamation: false,
      };
    });

    // Get total pallets from totals service
    const totalPallets = await deliveryTotalsService.getTotalPallets(deliveryId);

    return {
      deliveryId,
      deliveryDate: delivery.deliveryDate,
      orders,
      totalWindows,
      totalPallets,
      totalValue,
      generatedAt: new Date(),
    };
  }
}
