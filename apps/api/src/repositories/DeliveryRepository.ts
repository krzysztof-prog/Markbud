/**
 * Delivery Repository - Database access layer
 */

import { PrismaClient } from '@prisma/client';
import type { Delivery } from '@prisma/client';

export interface DeliveryFilters {
  from?: Date;
  to?: Date;
  status?: string;
}

export class DeliveryRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters: DeliveryFilters = {}) {
    const where: any = {};

    if (filters.from || filters.to) {
      where.deliveryDate = {};
      if (filters.from) where.deliveryDate.gte = filters.from;
      if (filters.to) where.deliveryDate.lte = filters.to;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.delivery.findMany({
      where,
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        deliveryOrders: {
          select: {
            deliveryId: true,
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                valueEur: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { deliveryOrders: true },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.delivery.findUnique({
      where: { id },
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        deliveryOrders: {
          select: {
            deliveryId: true,
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                valueEur: true,
                status: true,
                windows: {
                  select: {
                    id: true,
                    widthMm: true,
                    heightMm: true,
                    quantity: true,
                  },
                },
                requirements: {
                  select: {
                    id: true,
                    profileId: true,
                    colorId: true,
                    beamsCount: true,
                    meters: true,
                    profile: {
                      select: { id: true, number: true, name: true },
                    },
                    color: {
                      select: { id: true, code: true, name: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        deliveryItems: {
          select: {
            id: true,
            deliveryId: true,
            itemType: true,
            description: true,
            quantity: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async create(data: { deliveryDate: Date; deliveryNumber?: string; notes?: string }) {
    return this.prisma.delivery.create({
      data,
    });
  }

  async update(id: number, data: { deliveryDate?: Date; status?: string; notes?: string }) {
    return this.prisma.delivery.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.delivery.delete({
      where: { id },
    });
  }

  async addOrderToDelivery(deliveryId: number, orderId: number, position: number) {
    return this.prisma.deliveryOrder.create({
      data: {
        deliveryId,
        orderId,
        position,
      },
      select: {
        deliveryId: true,
        orderId: true,
        position: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            valuePln: true,
          },
        },
      },
    });
  }

  async addOrderToDeliveryAtomic(deliveryId: number, orderId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Get max position atomically within transaction
      const result = await tx.deliveryOrder.aggregate({
        where: { deliveryId },
        _max: { position: true },
      });
      const maxPosition = result._max.position || 0;

      // Create delivery order with incremented position
      return tx.deliveryOrder.create({
        data: {
          deliveryId,
          orderId,
          position: maxPosition + 1,
        },
        select: {
          deliveryId: true,
          orderId: true,
          position: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              valuePln: true,
            },
          },
        },
      });
    });
  }

  async removeOrderFromDelivery(deliveryId: number, orderId: number): Promise<void> {
    await this.prisma.deliveryOrder.delete({
      where: {
        deliveryId_orderId: {
          deliveryId,
          orderId,
        },
      },
    });
  }

  async getMaxOrderPosition(deliveryId: number): Promise<number> {
    const result = await this.prisma.deliveryOrder.aggregate({
      where: { deliveryId },
      _max: { position: true },
    });
    return result._max.position || 0;
  }

  async reorderDeliveryOrders(deliveryId: number, orderIds: number[]): Promise<void> {
    const updates = orderIds.map((orderId, index) =>
      this.prisma.deliveryOrder.update({
        where: {
          deliveryId_orderId: {
            deliveryId,
            orderId,
          },
        },
        data: { position: index + 1 },
      })
    );

    try {
      await this.prisma.$transaction(updates);
    } catch (error) {
      throw new Error(`Failed to reorder delivery orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async moveOrderBetweenDeliveries(
    sourceDeliveryId: number,
    targetDeliveryId: number,
    orderId: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Remove from source delivery
      await tx.deliveryOrder.delete({
        where: {
          deliveryId_orderId: {
            deliveryId: sourceDeliveryId,
            orderId,
          },
        },
      });

      // Get max position in target delivery
      const result = await tx.deliveryOrder.aggregate({
        where: { deliveryId: targetDeliveryId },
        _max: { position: true },
      });
      const maxPosition = result._max.position || 0;

      // Add to target delivery with incremented position
      return tx.deliveryOrder.create({
        data: {
          deliveryId: targetDeliveryId,
          orderId,
          position: maxPosition + 1,
        },
        select: {
          deliveryId: true,
          orderId: true,
          position: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              valuePln: true,
            },
          },
        },
      });
    });
  }

  async addItem(deliveryId: number, data: { itemType: string; description: string; quantity: number }) {
    return this.prisma.deliveryItem.create({
      data: {
        deliveryId,
        ...data,
      },
    });
  }

  async removeItem(itemId: number): Promise<void> {
    await this.prisma.deliveryItem.delete({
      where: { id: itemId },
    });
  }

  async getDeliveryOrders(deliveryId: number) {
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        deliveryOrders: {
          select: {
            orderId: true,
          },
        },
      },
    });
  }

  async updateOrdersBatch(orderIds: number[], data: { productionDate: Date; status: string }) {
    return this.prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data,
    });
  }
}
