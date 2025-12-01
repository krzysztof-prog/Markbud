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
    const delivery = await this.repository.create({
      deliveryDate: new Date(data.deliveryDate),
      deliveryNumber: data.deliveryNumber,
      notes: data.notes,
    });

    emitDeliveryCreated(delivery);

    return delivery;
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

    // Get max position and add order
    const maxPosition = await this.repository.getMaxOrderPosition(deliveryId);
    const deliveryOrder = await this.repository.addOrderToDelivery(deliveryId, orderId, maxPosition + 1);

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
    // Remove from source delivery
    await this.repository.removeOrderFromDelivery(sourceDeliveryId, orderId);

    // Get max position in target delivery
    const maxPosition = await this.repository.getMaxOrderPosition(targetDeliveryId);

    // Add to target delivery
    const deliveryOrder = await this.repository.addOrderToDelivery(
      targetDeliveryId,
      orderId,
      maxPosition + 1
    );

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
