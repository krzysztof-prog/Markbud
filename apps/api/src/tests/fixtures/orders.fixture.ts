/**
 * Order Test Fixtures - Builder Pattern
 *
 * Provides fluent API for creating test orders with various configurations.
 * Use this for complex order setups in integration tests.
 *
 * @example
 * ```typescript
 * const order = new OrderBuilder()
 *   .withStatus('new')
 *   .withOrderNumber('12345')
 *   .withValue(10000, 40000)
 *   .build();
 * ```
 */

import type { Order, Prisma, PrismaClient } from '@prisma/client';

type OrderStatus = 'new' | 'in_progress' | 'completed' | 'archived';

export class OrderBuilder {
  private data: Partial<Order> = {
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * Set order number
   */
  withOrderNumber(orderNumber: string): this {
    this.data.orderNumber = orderNumber;
    return this;
  }

  /**
   * Set order status
   */
  withStatus(status: OrderStatus): this {
    this.data.status = status;
    return this;
  }

  /**
   * Set order value (EUR and PLN)
   */
  withValue(valueEur: number, valuePln: number): this {
    this.data.valueEur = valueEur;
    this.data.valuePln = valuePln;
    return this;
  }

  /**
   * Mark order as archived
   */
  archived(): this {
    this.data.status = 'archived';
    this.data.archivedAt = new Date();
    return this;
  }

  /**
   * Set custom timestamps
   */
  withTimestamps(createdAt: Date, updatedAt?: Date): this {
    this.data.createdAt = createdAt;
    this.data.updatedAt = updatedAt || createdAt;
    return this;
  }

  /**
   * Build order object (for mocking)
   */
  build(): Order {
    if (!this.data.orderNumber) {
      // Generate default order number if not provided
      this.data.orderNumber = `TEST-${Date.now()}`;
    }

    return {
      id: Math.floor(Math.random() * 100000),
      orderNumber: this.data.orderNumber,
      status: this.data.status || 'new',
      client: this.data.client || null,
      project: this.data.project || null,
      system: this.data.system || null,
      deadline: this.data.deadline || null,
      pvcDeliveryDate: this.data.pvcDeliveryDate || null,
      valueEur: this.data.valueEur || null,
      valuePln: this.data.valuePln || null,
      invoiceNumber: this.data.invoiceNumber || null,
      deliveryDate: this.data.deliveryDate || null,
      productionDate: this.data.productionDate || null,
      glassDeliveryDate: this.data.glassDeliveryDate || null,
      notes: this.data.notes || null,
      archivedAt: this.data.archivedAt || null,
      totalGlasses: this.data.totalGlasses || null,
      totalSashes: this.data.totalSashes || null,
      totalWindows: this.data.totalWindows || null,
      completedAt: this.data.completedAt || null,
      orderedGlassCount: this.data.orderedGlassCount || 0,
      deliveredGlassCount: this.data.deliveredGlassCount || 0,
      glassOrderStatus: this.data.glassOrderStatus || 'not_ordered',
      createdAt: this.data.createdAt || new Date(),
      updatedAt: this.data.updatedAt || new Date(),
    } as Order;
  }

  /**
   * Create order in database (for integration tests)
   */
  async create(prisma: PrismaClient): Promise<Order> {
    if (!this.data.orderNumber) {
      // Generate default order number if not provided
      this.data.orderNumber = `TEST-${Date.now()}`;
    }

    const createData: Prisma.OrderCreateInput = {
      orderNumber: this.data.orderNumber,
      status: this.data.status || 'new',
      valueEur: this.data.valueEur || null,
      valuePln: this.data.valuePln || null,
      archivedAt: this.data.archivedAt || null,
    };

    return await prisma.order.create({
      data: createData,
    });
  }
}
