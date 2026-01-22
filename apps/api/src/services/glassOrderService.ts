import { PrismaClient, Prisma } from '@prisma/client';
import { parseGlassOrderTxt } from './parsers/glass-order-txt-parser.js';
import { ConflictError } from '../utils/errors.js';
import { GlassDeliveryMatchingService } from './glass-delivery/GlassDeliveryMatchingService.js';

export class GlassOrderService {
  private matchingService: GlassDeliveryMatchingService;

  constructor(private prisma: PrismaClient) {
    this.matchingService = new GlassDeliveryMatchingService(prisma);
  }

  async importFromTxt(fileContent: string | Buffer, filename: string, replaceExisting = false) {
    const parsed = parseGlassOrderTxt(fileContent);

    // Check if already exists
    const existing = await this.prisma.glassOrder.findUnique({
      where: { glassOrderNumber: parsed.metadata.glassOrderNumber },
      include: {
        items: true,
      },
    });

    if (existing && !replaceExisting) {
      throw new ConflictError(
        `Zamówienie ${parsed.metadata.glassOrderNumber} już istnieje`,
        {
          existingOrder: {
            id: existing.id,
            glassOrderNumber: existing.glassOrderNumber,
            orderDate: existing.orderDate,
            supplier: existing.supplier,
            status: existing.status,
            itemsCount: existing.items.length,
          },
          newOrder: {
            glassOrderNumber: parsed.metadata.glassOrderNumber,
            orderDate: parsed.metadata.orderDate,
            supplier: parsed.metadata.supplier,
            itemsCount: parsed.items.length,
          },
        }
      );
    }

    // Use transaction for atomicity (delete + create in same transaction)
    return this.prisma.$transaction(async (tx) => {
      // If replacing, delete the old one first (WITHIN transaction for atomicity)
      if (existing && replaceExisting) {
        await this.deleteTx(tx, existing.id, existing.items);
      }

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
      await this.matchWithProductionOrdersTx(tx, glassOrder.id, glassOrder.expectedDeliveryDate);

      return glassOrder;
    });
  }

  // Transaction-aware version for import
  private async matchWithProductionOrdersTx(
    tx: Prisma.TransactionClient,
    glassOrderId: number,
    expectedDeliveryDate: Date | null
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
            // Copy expected delivery date from glass order to production order
            // (will be updated later from delivery confirmation)
            glassDeliveryDate: expectedDeliveryDate,
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

    // Re-match unmatched delivery items for these orders
    // (gdy dostawa szyb przyszła przed zamówieniem)
    if (orderNumbers.length > 0) {
      const rematchResult = await this.matchingService.rematchUnmatchedForOrders(orderNumbers);
      if (rematchResult.rematched > 0) {
        console.log(
          `[GlassOrderService] Re-matched ${rematchResult.rematched} delivery items for orders: ${orderNumbers.join(', ')}`
        );
      }
    }
  }

  // Legacy non-transaction version (kept for compatibility)
  async matchWithProductionOrders(glassOrderId: number) {
    // Get glass order with expected delivery date
    const glassOrder = await this.prisma.glassOrder.findUnique({
      where: { id: glassOrderId },
      select: { expectedDeliveryDate: true },
    });

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
            // Copy expected delivery date from glass order
            glassDeliveryDate: glassOrder?.expectedDeliveryDate ?? null,
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
        deletedAt: null, // Exclude soft-deleted glass orders
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
      await this.deleteTx(tx, id, glassOrder.items);
    });
  }

  /**
   * Transaction-aware delete - do użycia wewnątrz istniejącej transakcji
   * Używane w importFromTxt z replaceExisting=true dla atomowości
   */
  private async deleteTx(
    tx: Prisma.TransactionClient,
    id: number,
    items: Array<{ orderNumber: string; quantity: number }>
  ) {
    // Decrement Order.orderedGlassCount and update status
    const byOrder = new Map<string, number>();
    for (const item of items) {
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

    // Soft delete: set deletedAt instead of hard delete
    await tx.glassOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
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
