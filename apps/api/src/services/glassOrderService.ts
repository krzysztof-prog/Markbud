import { PrismaClient, Prisma } from '@prisma/client';
import { parseGlassOrderTxt } from './parsers/glass-order-txt-parser.js';

export class GlassOrderService {
  constructor(private prisma: PrismaClient) {}

  async importFromTxt(fileContent: string | Buffer, filename: string) {
    const parsed = parseGlassOrderTxt(fileContent);

    // Check if already exists
    const existing = await this.prisma.glassOrder.findUnique({
      where: { glassOrderNumber: parsed.metadata.glassOrderNumber },
    });

    if (existing) {
      throw new Error(`Zamówienie ${parsed.metadata.glassOrderNumber} już istnieje`);
    }

    // Use transaction for atomicity
    return this.prisma.$transaction(async (tx) => {
      // Create GlassOrder with items
      const glassOrder = await tx.glassOrder.create({
        data: {
          glassOrderNumber: parsed.metadata.glassOrderNumber,
          orderDate: parsed.metadata.orderDate,
          supplier: parsed.metadata.supplier,
          orderedBy: parsed.metadata.orderedBy || null,
          expectedDeliveryDate: parsed.metadata.expectedDeliveryDate,
          status: 'ordered',
          items: {
            create: parsed.items.map((item) => ({
              orderNumber: item.orderNumber,
              orderSuffix: item.orderSuffix || null,
              position: item.position,
              glassType: item.glassType,
              widthMm: item.widthMm,
              heightMm: item.heightMm,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Match with production orders and update counts (within transaction)
      await this.matchWithProductionOrdersTx(tx, glassOrder.id);

      return glassOrder;
    });
  }

  // Transaction-aware version for import
  private async matchWithProductionOrdersTx(
    tx: Prisma.TransactionClient,
    glassOrderId: number
  ) {
    const items = await tx.glassOrderItem.findMany({
      where: { glassOrderId },
    });

    // Group by orderNumber
    const byOrder = new Map<string, number>();
    for (const item of items) {
      const current = byOrder.get(item.orderNumber) || 0;
      byOrder.set(item.orderNumber, current + item.quantity);
    }

    // Batch fetch all orders at once (avoid N+1)
    const orderNumbers = [...byOrder.keys()];
    const existingOrders = await tx.order.findMany({
      where: { orderNumber: { in: orderNumbers } },
      select: { orderNumber: true },
    });
    const existingSet = new Set(existingOrders.map((o) => o.orderNumber));

    // Update existing orders
    for (const [orderNumber, quantity] of byOrder) {
      if (existingSet.has(orderNumber)) {
        await tx.order.update({
          where: { orderNumber },
          data: {
            orderedGlassCount: { increment: quantity },
            glassOrderStatus: 'ordered',
          },
        });
      } else {
        // Create validation warning for missing order
        await tx.glassOrderValidation.create({
          data: {
            glassOrderId,
            orderNumber,
            validationType: 'missing_production_order',
            severity: 'warning',
            orderedQuantity: quantity,
            message: `Nie znaleziono zlecenia produkcyjnego ${orderNumber}`,
          },
        });
      }
    }
  }

  // Legacy non-transaction version (kept for compatibility)
  async matchWithProductionOrders(glassOrderId: number) {
    const items = await this.prisma.glassOrderItem.findMany({
      where: { glassOrderId },
    });

    const byOrder = new Map<string, number>();
    for (const item of items) {
      const current = byOrder.get(item.orderNumber) || 0;
      byOrder.set(item.orderNumber, current + item.quantity);
    }

    const orderNumbers = [...byOrder.keys()];
    const existingOrders = await this.prisma.order.findMany({
      where: { orderNumber: { in: orderNumbers } },
      select: { orderNumber: true },
    });
    const existingSet = new Set(existingOrders.map((o) => o.orderNumber));

    for (const [orderNumber, quantity] of byOrder) {
      if (existingSet.has(orderNumber)) {
        await this.prisma.order.update({
          where: { orderNumber },
          data: {
            orderedGlassCount: { increment: quantity },
            glassOrderStatus: 'ordered',
          },
        });
      } else {
        await this.prisma.glassOrderValidation.create({
          data: {
            glassOrderId,
            orderNumber,
            validationType: 'missing_production_order',
            severity: 'warning',
            orderedQuantity: quantity,
            message: `Nie znaleziono zlecenia produkcyjnego ${orderNumber}`,
          },
        });
      }
    }
  }

  async findAll(filters?: { status?: string; orderNumber?: string }) {
    return this.prisma.glassOrder.findMany({
      where: {
        status: filters?.status,
        glassOrderNumber: filters?.orderNumber
          ? { contains: filters.orderNumber }
          : undefined,
      },
      include: {
        items: true,
        validationResults: {
          where: { resolved: false },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.glassOrder.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { orderNumber: 'asc' },
        },
        validationResults: true,
        deliveryItems: true,
      },
    });
  }

  async delete(id: number) {
    // Get items to decrement order counts
    const glassOrder = await this.prisma.glassOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!glassOrder) {
      throw new Error('Zamówienie nie istnieje');
    }

    // Use transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      // Decrement Order.orderedGlassCount and update status
      const byOrder = new Map<string, number>();
      for (const item of glassOrder.items) {
        const current = byOrder.get(item.orderNumber) || 0;
        byOrder.set(item.orderNumber, current + item.quantity);
      }

      for (const [orderNumber, quantity] of byOrder) {
        const order = await tx.order.findUnique({
          where: { orderNumber },
        });

        if (order) {
          const newOrderedCount = Math.max(0, (order.orderedGlassCount || 0) - quantity);
          const delivered = order.deliveredGlassCount || 0;

          // Recalculate status
          let newStatus = 'not_ordered';
          if (newOrderedCount === 0) {
            newStatus = delivered > 0 ? 'over_delivered' : 'not_ordered';
          } else if (delivered === 0) {
            newStatus = 'ordered';
          } else if (delivered < newOrderedCount) {
            newStatus = 'partially_delivered';
          } else if (delivered === newOrderedCount) {
            newStatus = 'delivered';
          } else {
            newStatus = 'over_delivered';
          }

          await tx.order.update({
            where: { orderNumber },
            data: {
              orderedGlassCount: newOrderedCount,
              glassOrderStatus: newStatus,
            },
          });
        }
      }

      // Delete glass order (cascade deletes items and validations)
      await tx.glassOrder.delete({
        where: { id },
      });
    });
  }

  async getSummary(id: number) {
    const glassOrder = await this.prisma.glassOrder.findUnique({
      where: { id },
      include: {
        items: true,
        deliveryItems: true,
        validationResults: true,
      },
    });

    if (!glassOrder) {
      throw new Error('Zamówienie nie istnieje');
    }

    // Group by order number
    const orderBreakdown: Record<string, {
      orderNumber: string;
      ordered: number;
      delivered: number;
      status: string;
    }> = {};

    for (const item of glassOrder.items) {
      const key = item.orderSuffix
        ? `${item.orderNumber}-${item.orderSuffix}`
        : item.orderNumber;

      if (!orderBreakdown[key]) {
        orderBreakdown[key] = {
          orderNumber: key,
          ordered: 0,
          delivered: 0,
          status: 'pending',
        };
      }
      orderBreakdown[key].ordered += item.quantity;
    }

    for (const item of glassOrder.deliveryItems) {
      const key = item.orderSuffix
        ? `${item.orderNumber}-${item.orderSuffix}`
        : item.orderNumber;

      if (orderBreakdown[key]) {
        orderBreakdown[key].delivered += item.quantity;
      }
    }

    // Calculate statuses
    for (const order of Object.values(orderBreakdown)) {
      if (order.delivered === 0) {
        order.status = 'pending';
      } else if (order.delivered < order.ordered) {
        order.status = 'partial';
      } else if (order.delivered === order.ordered) {
        order.status = 'complete';
      } else {
        order.status = 'excess';
      }
    }

    return {
      glassOrderNumber: glassOrder.glassOrderNumber,
      totalOrdered: glassOrder.items.reduce((sum, i) => sum + i.quantity, 0),
      totalDelivered: glassOrder.deliveryItems.reduce((sum, i) => sum + i.quantity, 0),
      orderBreakdown: Object.values(orderBreakdown),
      issues: glassOrder.validationResults.filter(v => !v.resolved),
    };
  }

  async getValidations(id: number) {
    return this.prisma.glassOrderValidation.findMany({
      where: { glassOrderId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.glassOrder.update({
      where: { id },
      data: { status },
    });
  }
}
