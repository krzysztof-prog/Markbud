/**
 * Order Service - Business logic layer
 */

import { Prisma } from '@prisma/client';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { validateStatusTransition, ORDER_STATUSES } from '../utils/order-status-machine.js';
import { validateSufficientStock } from '../utils/warehouse-validation.js';
import { prisma } from '../index.js';
import {
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderDeleted,
} from './event-emitter.js';
import { ReadinessOrchestrator } from './readinessOrchestrator.js';

export class OrderService {
  constructor(private repository: OrderRepository) {}

  async getAllOrders(filters: { status?: string; archived?: string; colorId?: string; documentAuthorUserId?: string }) {
    return this.repository.findAll(filters);
  }

  /**
   * Wyszukiwanie zleceń - zoptymalizowane dla GlobalSearch
   * Filtruje po stronie serwera, zwraca tylko niezbędne pola
   */
  async searchOrders(query: string, includeArchived: boolean = true) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.repository.search(query, includeArchived);
  }

  async getOrderById(id: number) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  }

  async getOrderByNumber(orderNumber: string) {
    const order = await this.repository.findByOrderNumber(orderNumber);

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  }

  async createOrder(data: { orderNumber: string; status?: string; valuePln?: number; valueEur?: number }) {
    const order = await this.repository.create(data);

    emitOrderCreated(order);

    return order;
  }

  async updateOrder(id: number, data: Prisma.OrderUpdateInput) {
    // Verify order exists
    const currentOrder = await this.getOrderById(id);

    // Validate status transition if status is being updated
    if (data.status && typeof data.status === 'string') {
      validateStatusTransition(currentOrder.status, data.status);

      // P1-R5: Full production readiness check including Glass + Okuc
      // Prevents edge case: start production without sufficient materials/glass/okuc → deadline missed
      if (data.status === ORDER_STATUSES.IN_PROGRESS) {
        // Legacy warehouse check (fast, critical)
        // Fixed: ignoruje requirements z beamsCount = 0
        await validateSufficientStock(prisma, id);

        // P1-R5: Extended readiness check (glass + okuc status)
        const orchestrator = new ReadinessOrchestrator(prisma);
        const readiness = await orchestrator.canStartProduction(id);

        if (!readiness.ready) {
          const blockingMessages = readiness.blocking.map((b) => b.message).join('; ');
          throw new ValidationError(
            `Nie można rozpocząć produkcji: ${blockingMessages}`,
            { code: 'PRODUCTION_NOT_READY', blocking: readiness.blocking }
          );
        }
      }
    }

    const order = await this.repository.update(id, data);

    emitOrderUpdated(order);

    return order;
  }

  async deleteOrder(id: number) {
    // Verify order exists
    const order = await this.getOrderById(id);

    // Safety check: Sprawdź czy zlecenie nie jest powiązane z wysłaną/dostarczoną dostawą
    const deliveries = await this.repository.getOrderDeliveries(id);
    const hasShippedOrDelivered = deliveries.some(
      d => d.status === 'shipped' || d.status === 'delivered'
    );

    if (hasShippedOrDelivered) {
      throw new ValidationError(
        'Nie można usunąć zlecenia przypisanego do wysłanej lub dostarczonej dostawy. ' +
        'Archiwizuj zlecenie zamiast je usuwać.'
      );
    }

    // Safety check: Ostrzeżenie jeśli zlecenie jest w trakcie produkcji
    if (order.status === 'in_progress' || order.status === 'completed') {
      throw new ValidationError(
        `Nie można usunąć zlecenia o statusie "${order.status}". ` +
        'Archiwizuj zlecenie zamiast je usuwać.'
      );
    }

    await this.repository.delete(id);

    emitOrderDeleted(id);
  }

  async archiveOrder(id: number) {
    // Verify order exists
    await this.getOrderById(id);

    const order = await this.repository.archive(id);

    emitOrderUpdated(order);

    return order;
  }

  async unarchiveOrder(id: number) {
    // Verify order exists
    await this.getOrderById(id);

    const order = await this.repository.unarchive(id);

    emitOrderUpdated(order);

    return order;
  }

  async bulkUpdateStatus(
    orderIds: number[],
    status: string,
    productionDate?: string
  ) {
    // Validate that all orders exist
    const orders = await Promise.all(
      orderIds.map(id => this.repository.findById(id))
    );

    // Check if any orders don't exist
    const notFoundIds = orderIds.filter((id, index) => !orders[index]);
    if (notFoundIds.length > 0) {
      throw new NotFoundError(`Orders with IDs ${notFoundIds.join(', ')} not found`);
    }

    // Validate status transitions for all orders BEFORE updating any
    const invalidTransitions: Array<{ id: number; orderNumber: string; currentStatus: string }> = [];

    orders.forEach((order) => {
      if (order) {
        try {
          validateStatusTransition(order.status, status);
        } catch (error) {
          invalidTransitions.push({
            id: order.id,
            orderNumber: order.orderNumber,
            currentStatus: order.status,
          });
        }
      }
    });

    // If any transitions are invalid, fail the entire operation
    if (invalidTransitions.length > 0) {
      const errorDetails = invalidTransitions
        .map(({ orderNumber, currentStatus }) =>
          `${orderNumber} (${currentStatus} → ${status})`
        )
        .join(', ');

      throw new ValidationError(
        `Niedozwolone zmiany statusu dla ${invalidTransitions.length} zlecenia/zleceń: ${errorDetails}. ` +
        `Wszystkie zlecenia muszą mieć dozwoloną zmianę statusu.`
      );
    }

    // CRITICAL: Validate warehouse stock for ALL orders if starting production
    // Check BEFORE transaction to fail fast
    // Fixed: ignoruje requirements z beamsCount = 0
    if (status === ORDER_STATUSES.IN_PROGRESS) {
      for (const order of orders) {
        if (order) {
          await validateSufficientStock(prisma, order.id);
        }
      }
    }

    // Use transaction to update all orders atomically
    const updatedOrders = await this.repository.bulkUpdateStatus(
      orderIds,
      status,
      productionDate
    );

    // Emit update events for all orders
    updatedOrders.forEach(order => emitOrderUpdated(order));

    return updatedOrders;
  }

  async getForProduction(params: {
    overdueDays: number;
    upcomingDays: number;
    deliveriesLimit: number;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingDate = new Date(today);
    upcomingDate.setDate(upcomingDate.getDate() + params.upcomingDays);

    // Fetch deliveries first to get order IDs that are already in deliveries
    const upcomingDeliveries = await this.repository.findUpcomingDeliveries({
      deliveryDate: { gte: today },
      status: { in: ['planned', 'in_progress'] },
      limit: params.deliveriesLimit,
    });

    // Extract all order IDs from deliveries to exclude them from other sections
    const deliveryOrderIds = new Set<number>();
    upcomingDeliveries.forEach((delivery) => {
      delivery.deliveryOrders?.forEach((dOrder) => {
        if (dOrder.order?.id) {
          deliveryOrderIds.add(dOrder.order.id);
        }
      });
    });

    const excludeDeliveryOrders = deliveryOrderIds.size > 0
      ? { id: { notIn: Array.from(deliveryOrderIds) } }
      : {};

    const [overdueOrders, upcomingOrders, privateOrders] = await Promise.all([
      // Overdue orders: deadline < today, status = new (not yet in production), NOT AKROBUD
      this.repository.findPrivateOrders({
        deadline: { lt: today },
        status: 'new',
        archivedAt: null,
      }),

      // Upcoming orders: deadline between today and upcoming date, status = new, NOT AKROBUD
      this.repository.findPrivateOrders({
        deadline: { gte: today, lte: upcomingDate },
        status: 'new',
        archivedAt: null,
      }),

      // Private orders (all non-AKROBUD): status = new (waiting to be added to production)
      this.repository.findPrivateOrders({
        status: 'new',
        archivedAt: null,
      }),
    ]);

    return {
      overdueOrders,
      upcomingOrders,
      privateOrders,
      upcomingDeliveries,
    };
  }

  /**
   * Get orders completed in a specific month/year for production reports
   * Optimized to only fetch orders from the selected month
   */
  async getMonthlyProduction(year: number, month: number) {
    // Validate input
    if (year < 2000 || year > 2100) {
      throw new ValidationError('Year must be between 2000 and 2100');
    }
    if (month < 1 || month > 12) {
      throw new ValidationError('Month must be between 1 and 12');
    }

    return this.repository.findMonthlyProduction(year, month);
  }

  /**
   * Get completeness statistics for operator dashboard
   * Shows how many orders have files, glass, and hardware ready
   *
   * @param userId - User ID to filter by (null = all orders)
   */
  async getCompletenessStats(userId: number | null) {
    return this.repository.getCompletenessStats(userId);
  }

  /**
   * Partial update of order (PATCH)
   * Handles conversion of PLN/EUR strings to grosze/centy
   */
  async patchOrder(
    id: number,
    data: {
      valuePln?: string | null;
      valueEur?: string | null;
      deadline?: string | null;
      status?: string | null;
    }
  ) {
    // Verify order exists
    await this.getOrderById(id);

    // Import money conversion functions lazily to avoid circular deps
    const { plnToGrosze, eurToCenty } = await import('../utils/money.js');

    // Build update data with proper conversions
    const updateData: Prisma.OrderUpdateInput = {};

    if (data.valuePln !== undefined) {
      // Convert PLN string (e.g., "123.45") to grosze (12345)
      updateData.valuePln = data.valuePln !== null ? plnToGrosze(Number(data.valuePln)) : null;
    }
    if (data.valueEur !== undefined) {
      // Convert EUR string (e.g., "123.45") to cents (12345)
      updateData.valueEur = data.valueEur !== null ? eurToCenty(Number(data.valueEur)) : null;
    }
    if (data.deadline !== undefined) {
      // Convert deadline string to Date or null
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    if (data.status !== undefined) {
      updateData.status = data.status ?? undefined;
    }

    const order = await this.repository.update(id, updateData);

    emitOrderUpdated(order);

    return order;
  }
}
