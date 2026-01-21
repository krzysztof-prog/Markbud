/**
 * OkucOrderRepository - Data access layer for order management
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export class OkucOrderRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find all orders with optional filters
   */
  async findAll(filters?: {
    status?: string;
    basketType?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const where: Prisma.OkucOrderWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.basketType) {
      where.basketType = filters.basketType;
    }

    if (filters?.fromDate || filters?.toDate) {
      where.expectedDeliveryDate = {};

      if (filters.fromDate) {
        where.expectedDeliveryDate.gte = filters.fromDate;
      }

      if (filters.toDate) {
        where.expectedDeliveryDate.lte = filters.toDate;
      }
    }

    const orders = await this.prisma.okucOrder.findMany({
      where,
      include: {
        items: {
          include: {
            article: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.debug('Found orders', { count: orders.length, filters });
    return orders;
  }

  /**
   * Find order by ID
   */
  async findById(id: number) {
    const order = await this.prisma.okucOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            article: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      logger.warn('Order not found', { id });
    }

    return order;
  }

  /**
   * Get order statistics
   */
  async getStats() {
    const [total, byStatus, byBasket] = await Promise.all([
      this.prisma.okucOrder.count(),
      this.prisma.okucOrder.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.okucOrder.groupBy({
        by: ['basketType'],
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      byBasket: byBasket.reduce(
        (acc, item) => {
          acc[item.basketType] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * Count orders by year (for order number generation)
   */
  async countByYear(year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const count = await this.prisma.okucOrder.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    return count;
  }

  /**
   * Create a new order
   */
  async create(data: {
    orderNumber: string;
    basketType: string;
    expectedDeliveryDate?: Date;
    notes?: string;
    createdById?: number;
    items: Array<{
      articleId: number;
      orderedQty: number;
      unitPrice?: number;
    }>;
  }) {
    const order = await this.prisma.okucOrder.create({
      data: {
        orderNumber: data.orderNumber,
        basketType: data.basketType,
        expectedDeliveryDate: data.expectedDeliveryDate,
        notes: data.notes,
        createdById: data.createdById,
        items: {
          create: data.items,
        },
      },
      include: {
        items: {
          include: {
            article: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info('Created order', {
      id: order.id,
      orderNumber: order.orderNumber,
      itemsCount: data.items.length,
    });

    return order;
  }

  /**
   * Update existing order
   */
  async update(
    id: number,
    data: {
      status?: string;
      expectedDeliveryDate?: Date;
      actualDeliveryDate?: Date;
      notes?: string;
      lastEditById?: number;
      isManualEdit?: boolean;
      editReason?: string;
    }
  ) {
    const updateData: Prisma.OkucOrderUpdateInput = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.expectedDeliveryDate !== undefined)
      updateData.expectedDeliveryDate = data.expectedDeliveryDate;
    if (data.actualDeliveryDate !== undefined)
      updateData.actualDeliveryDate = data.actualDeliveryDate;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.isManualEdit) {
      updateData.isManualEdit = true;
      updateData.editedAt = new Date();
      updateData.editedById = data.lastEditById;
      updateData.editReason = data.editReason;
    }

    const order = await this.prisma.okucOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            article: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info('Updated order', { id, changes: data });
    return order;
  }

  /**
   * Receive order - mark as received and update received quantities
   */
  async receiveOrder(
    id: number,
    data: {
      actualDeliveryDate: Date;
      items: Array<{
        articleId: number;
        receivedQty: number;
      }>;
      lastEditById?: number;
    }
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Update order status
      const order = await tx.okucOrder.update({
        where: { id },
        data: {
          status: 'received',
          actualDeliveryDate: data.actualDeliveryDate,
          updatedAt: new Date(),
        },
      });

      // Update received quantities for items
      for (const item of data.items) {
        await tx.okucOrderItem.updateMany({
          where: {
            okucOrderId: id,
            articleId: item.articleId,
          },
          data: {
            receivedQty: item.receivedQty,
          },
        });

        // Update stock
        await tx.okucStock.updateMany({
          where: {
            articleId: item.articleId,
          },
          data: {
            currentQuantity: {
              increment: item.receivedQty,
            },
            updatedAt: new Date(),
            updatedById: data.lastEditById,
          },
        });

        // Create history entry
        const stock = await tx.okucStock.findFirst({
          where: { articleId: item.articleId },
        });

        if (stock) {
          await tx.okucHistory.create({
            data: {
              articleId: item.articleId,
              warehouseType: stock.warehouseType,
              subWarehouse: stock.subWarehouse,
              eventType: 'order_received',
              previousQty: stock.currentQuantity - item.receivedQty,
              changeQty: item.receivedQty,
              newQty: stock.currentQuantity,
              reference: order.orderNumber,
              recordedById: data.lastEditById,
            },
          });
        }
      }

      // Return updated order with items
      const updatedOrder = await tx.okucOrder.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              article: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Received order', {
        id,
        orderNumber: order.orderNumber,
        itemsCount: data.items.length,
      });

      if (!updatedOrder) {
        throw new Error(`Order ${id} not found after update`);
      }
      return updatedOrder;
    });
  }

  /**
   * Delete order (SOFT DELETE - only if draft)
   */
  async delete(id: number) {
    // Soft delete: ustawiamy deletedAt zamiast usuwać
    const order = await this.prisma.okucOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info('Soft deleted order', { id, orderNumber: order.orderNumber });
    return order;
  }
}
