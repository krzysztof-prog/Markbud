/**
 * Order Service - Business logic layer
 */

import { Prisma } from '@prisma/client';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { NotFoundError } from '../utils/errors.js';
import {
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderDeleted,
} from './event-emitter.js';

export class OrderService {
  constructor(private repository: OrderRepository) {}

  async getAllOrders(filters: { status?: string; archived?: string; colorId?: string }) {
    return this.repository.findAll(filters);
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
    await this.getOrderById(id);

    const order = await this.repository.update(id, data);

    emitOrderUpdated(order);

    return order;
  }

  async deleteOrder(id: number) {
    // Verify order exists
    await this.getOrderById(id);

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
}
