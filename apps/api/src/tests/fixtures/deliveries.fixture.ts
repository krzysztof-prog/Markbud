/**
 * Delivery Test Fixtures - Builder Pattern
 *
 * Provides fluent API for creating test deliveries with various configurations.
 * Use this for complex delivery setups in integration tests.
 *
 * @example
 * ```typescript
 * const delivery = new DeliveryBuilder()
 *   .withDeliveryNumber('D001')
 *   .withDeliveryDate(new Date('2026-01-15'))
 *   .withStatus('planned')
 *   .build();
 * ```
 */

import type { Delivery, Prisma, PrismaClient } from '@prisma/client';

type DeliveryStatus = 'planned' | 'loading' | 'shipped' | 'delivered' | 'cancelled';

export class DeliveryBuilder {
  private data: Partial<Delivery> = {
    status: 'planned',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * Set delivery number
   */
  withDeliveryNumber(deliveryNumber: string): this {
    this.data.deliveryNumber = deliveryNumber;
    return this;
  }

  /**
   * Set delivery date
   */
  withDeliveryDate(deliveryDate: Date): this {
    this.data.deliveryDate = deliveryDate;
    return this;
  }

  /**
   * Set delivery status
   */
  withStatus(status: DeliveryStatus): this {
    this.data.status = status;
    return this;
  }

  /**
   * Set notes
   */
  withNotes(notes: string): this {
    this.data.notes = notes;
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
   * Build delivery object (for mocking)
   */
  build(): Delivery {
    if (!this.data.deliveryNumber) {
      // Generate default delivery number if not provided
      this.data.deliveryNumber = `D-${Date.now()}`;
    }
    if (!this.data.deliveryDate) {
      // Default to today
      this.data.deliveryDate = new Date();
    }

    return {
      id: Math.floor(Math.random() * 100000),
      deliveryNumber: this.data.deliveryNumber,
      deliveryDate: this.data.deliveryDate,
      status: this.data.status || 'planned',
      notes: this.data.notes || null,
      createdAt: this.data.createdAt || new Date(),
      updatedAt: this.data.updatedAt || new Date(),
      deletedAt: null,
      version: 1,
    } as Delivery;
  }

  /**
   * Create delivery in database (for integration tests)
   */
  async create(prisma: PrismaClient): Promise<Delivery> {
    if (!this.data.deliveryNumber) {
      // Generate default delivery number if not provided
      this.data.deliveryNumber = `D-${Date.now()}`;
    }
    if (!this.data.deliveryDate) {
      // Default to today
      this.data.deliveryDate = new Date();
    }

    const createData: Prisma.DeliveryCreateInput = {
      deliveryNumber: this.data.deliveryNumber,
      deliveryDate: this.data.deliveryDate,
      status: this.data.status || 'planned',
      notes: this.data.notes || null,
    };

    return await prisma.delivery.create({
      data: createData,
    });
  }
}
