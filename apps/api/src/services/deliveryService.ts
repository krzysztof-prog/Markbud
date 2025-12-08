/**
 * Delivery Service - Business logic layer
 */

import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { NotFoundError } from '../utils/errors.js';
import {
  emitDeliveryCreated,
  emitDeliveryUpdated,
  emitDeliveryDeleted,
  emitOrderUpdated,
} from './event-emitter.js';

export class DeliveryService {
  constructor(private repository: DeliveryRepository) {}

  async getAllDeliveries(filters: { from?: string; to?: string; status?: string }) {
    const deliveryFilters = {
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      status: filters.status,
    };

    return this.repository.findAll(deliveryFilters);
  }

  async getDeliveryById(id: number) {
    const delivery = await this.repository.findById(id);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    return delivery;
  }

  async createDelivery(data: { deliveryDate: string; deliveryNumber?: string; notes?: string }) {
    const deliveryDate = new Date(data.deliveryDate);

    // Generate delivery number if not provided: DD.MM.YYYY_X
    let deliveryNumber = data.deliveryNumber;
    if (!deliveryNumber) {
      deliveryNumber = await this.generateDeliveryNumber(deliveryDate);
    }

    const delivery = await this.repository.create({
      deliveryDate,
      deliveryNumber,
      notes: data.notes,
    });

    emitDeliveryCreated(delivery);

    return delivery;
  }

  /**
   * Generate delivery number in format DD.MM.YYYY_X
   * where X is I, II, III, IV etc. for multiple deliveries on same day
   */
  private async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
    // Format: DD.MM.YYYY
    const day = String(deliveryDate.getDate()).padStart(2, '0');
    const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
    const year = deliveryDate.getFullYear();
    const datePrefix = `${day}.${month}.${year}`;

    // Get all deliveries on the same day
    const startOfDay = new Date(deliveryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(deliveryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingDeliveries = await this.repository.findAll({
      from: startOfDay,
      to: endOfDay,
    });

    // Count existing deliveries on same day
    const count = existingDeliveries.length;

    // Roman numerals for the sequence
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const suffix = romanNumerals[count] || String(count + 1);

    return `${datePrefix}_${suffix}`;
  }

  async updateDelivery(id: number, data: { deliveryDate?: string; status?: string; notes?: string }) {
    // Verify delivery exists
    await this.getDeliveryById(id);

    const delivery = await this.repository.update(id, {
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      status: data.status,
      notes: data.notes,
    });

    emitDeliveryUpdated(delivery);

    return delivery;
  }

  async deleteDelivery(id: number) {
    // Verify delivery exists
    await this.getDeliveryById(id);

    await this.repository.delete(id);

    emitDeliveryDeleted(id);
  }

  async addOrderToDelivery(deliveryId: number, orderId: number) {
    // Verify delivery exists
    await this.getDeliveryById(deliveryId);

    // Add order with atomic position calculation to prevent race conditions
    const deliveryOrder = await this.repository.addOrderToDeliveryAtomic(deliveryId, orderId);

    // Emit events
    emitDeliveryUpdated({ id: deliveryId });
    emitOrderUpdated({ id: orderId });

    return deliveryOrder;
  }

  async removeOrderFromDelivery(deliveryId: number, orderId: number) {
    await this.repository.removeOrderFromDelivery(deliveryId, orderId);

    // Emit events
    emitDeliveryUpdated({ id: deliveryId });
    emitOrderUpdated({ id: orderId });
  }

  async reorderDeliveryOrders(deliveryId: number, orderIds: number[]) {
    await this.repository.reorderDeliveryOrders(deliveryId, orderIds);
    return { success: true };
  }

  async moveOrderBetweenDeliveries(
    sourceDeliveryId: number,
    targetDeliveryId: number,
    orderId: number
  ) {
    // Execute as atomic transaction to prevent data loss
    const deliveryOrder = await this.repository.moveOrderBetweenDeliveries(
      sourceDeliveryId,
      targetDeliveryId,
      orderId
    );

    // Emit events after successful transaction
    emitDeliveryUpdated({ id: sourceDeliveryId });
    emitDeliveryUpdated({ id: targetDeliveryId });
    emitOrderUpdated({ id: orderId });

    return deliveryOrder;
  }

  async addItemToDelivery(deliveryId: number, data: { itemType: string; description: string; quantity: number }) {
    // Verify delivery exists
    await this.getDeliveryById(deliveryId);

    const item = await this.repository.addItem(deliveryId, data);

    emitDeliveryUpdated({ id: deliveryId });

    return item;
  }

  async removeItemFromDelivery(deliveryId: number, itemId: number) {
    await this.repository.removeItem(itemId);

    emitDeliveryUpdated({ id: deliveryId });
  }

  async completeDelivery(deliveryId: number, productionDate: string) {
    const delivery = await this.repository.getDeliveryOrders(deliveryId);

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    const orderIds = delivery.deliveryOrders.map((d) => d.orderId);

    await this.repository.updateOrdersBatch(orderIds, {
      productionDate: new Date(productionDate),
      status: 'completed',
    });

    // Emit events
    emitDeliveryUpdated({ id: deliveryId });
    orderIds.forEach((orderId) => {
      emitOrderUpdated({ id: orderId });
    });

    return { success: true, updatedOrders: orderIds.length };
  }
}
