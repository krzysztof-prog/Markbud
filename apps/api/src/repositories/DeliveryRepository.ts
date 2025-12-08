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

  /**
   * Get calendar data for a specific month/year
   */
  async getCalendarData(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        deliveryOrders: {
          select: {
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalWindows: true,
                totalSashes: true,
                totalGlasses: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        deliveryItems: {
          select: {
            id: true,
            itemType: true,
            description: true,
            quantity: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });

    const unassignedOrders = await this.prisma.order.findMany({
      where: {
        archivedAt: null,
        status: { notIn: ['archived'] },
        deliveryOrders: {
          none: {},
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryDate: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
      },
      orderBy: { orderNumber: 'asc' },
    });

    return { deliveries, unassignedOrders };
  }

  /**
   * Get deliveries with profile requirements
   */
  async getDeliveriesWithRequirements(fromDate?: Date) {
    const whereCondition: any = {};
    if (fromDate) {
      whereCondition.deliveryDate = { gte: fromDate };
    }

    return this.prisma.delivery.findMany({
      where: whereCondition,
      select: {
        id: true,
        deliveryDate: true,
        deliveryOrders: {
          select: {
            order: {
              select: {
                id: true,
                requirements: {
                  select: {
                    profileId: true,
                    colorId: true,
                    beamsCount: true,
                    meters: true,
                    color: {
                      select: { code: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get deliveries with order windows for stats
   */
  async getDeliveriesWithWindows(startDate: Date, endDate?: Date) {
    const where: any = {
      deliveryDate: { gte: startDate },
    };
    if (endDate) {
      where.deliveryDate.lte = endDate;
    }

    return this.prisma.delivery.findMany({
      where,
      include: {
        deliveryOrders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalWindows: true,
                totalSashes: true,
                totalGlasses: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get deliveries with profile requirements for stats
   */
  async getDeliveriesWithProfileStats(startDate: Date, endDate: Date) {
    return this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        deliveryOrders: {
          include: {
            order: {
              include: {
                requirements: {
                  include: {
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
        },
      },
    });
  }

  /**
   * Get delivery for protocol generation
   */
  async getDeliveryForProtocol(deliveryId: number) {
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        deliveryDate: true,
        deliveryOrders: {
          select: {
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                windows: {
                  select: {
                    id: true,
                    quantity: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }
}
