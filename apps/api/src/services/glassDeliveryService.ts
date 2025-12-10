import { PrismaClient } from '@prisma/client';
import { parseGlassDeliveryCsv } from './parsers/glass-delivery-csv-parser.js';

export class GlassDeliveryService {
  constructor(private prisma: PrismaClient) {}

  async importFromCsv(fileContent: string, filename: string, deliveryDate?: Date) {
    const parsed = parseGlassDeliveryCsv(fileContent);

    // Use transaction for atomicity
    return this.prisma.$transaction(async (tx) => {
      // Create GlassDelivery with items
      const glassDelivery = await tx.glassDelivery.create({
        data: {
          rackNumber: parsed.metadata.rackNumber || filename,
          customerOrderNumber: parsed.metadata.customerOrderNumber,
          supplierOrderNumber: parsed.metadata.supplierOrderNumber || null,
          deliveryDate: deliveryDate || new Date(),
          items: {
            create: parsed.items.map((item) => ({
              orderNumber: item.orderNumber,
              orderSuffix: item.orderSuffix || null,
              position: String(item.position),
              widthMm: item.widthMm,
              heightMm: item.heightMm,
              quantity: item.quantity,
              glassComposition: item.glassComposition || null,
              serialNumber: item.serialNumber || null,
              clientCode: item.clientCode || null,
              matchStatus: 'pending',
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Match with orders (within transaction)
      await this.matchWithOrdersTx(tx, glassDelivery.id);

      // Update glass delivery dates if orders are complete
      const deliveryItems = await tx.glassDeliveryItem.findMany({
        where: { glassDeliveryId: glassDelivery.id },
        select: { orderNumber: true },
        distinct: ['orderNumber'],
      });
      const orderNumbers = deliveryItems.map((item) => item.orderNumber);
      await this.updateGlassDeliveryDateIfComplete(tx, orderNumbers, glassDelivery.deliveryDate);

      return glassDelivery;
    });
  }

  // Transaction-aware version for import (optimized - batch fetch order items)
  private async matchWithOrdersTx(
    tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    deliveryId: number
  ) {
    const deliveryItems = await tx.glassDeliveryItem.findMany({
      where: { glassDeliveryId: deliveryId },
    });

    // Batch fetch all potentially matching order items at once (avoid N+1)
    const orderNumbers = [...new Set(deliveryItems.map((i) => i.orderNumber))];
    const allOrderItems = await tx.glassOrderItem.findMany({
      where: { orderNumber: { in: orderNumbers } },
    });

    // Group by orderNumber for quick lookup
    const orderItemsByNumber = new Map<string, typeof allOrderItems>();
    for (const item of allOrderItems) {
      const key = item.orderNumber;
      if (!orderItemsByNumber.has(key)) {
        orderItemsByNumber.set(key, []);
      }
      orderItemsByNumber.get(key)!.push(item);
    }

    for (const deliveryItem of deliveryItems) {
      const candidates = orderItemsByNumber.get(deliveryItem.orderNumber) || [];

      // STEP 1: Try exact match
      const exactMatch = candidates.find(
        (c) =>
          c.orderSuffix === deliveryItem.orderSuffix &&
          c.widthMm === deliveryItem.widthMm &&
          c.heightMm === deliveryItem.heightMm
      );

      if (exactMatch) {
        await tx.glassDeliveryItem.update({
          where: { id: deliveryItem.id },
          data: {
            matchStatus: 'matched',
            matchedItemId: exactMatch.id,
            glassOrderId: exactMatch.glassOrderId,
          },
        });
        await this.updateOrderDeliveredCountTx(tx, deliveryItem.orderNumber, deliveryItem.quantity);
        continue;
      }

      // STEP 2: Check for SUFFIX CONFLICT
      const conflictMatch = candidates.find(
        (c) =>
          c.orderSuffix !== deliveryItem.orderSuffix &&
          c.widthMm === deliveryItem.widthMm &&
          c.heightMm === deliveryItem.heightMm
      );

      if (conflictMatch) {
        await tx.glassDeliveryItem.update({
          where: { id: deliveryItem.id },
          data: {
            matchStatus: 'conflict',
            matchedItemId: conflictMatch.id,
            glassOrderId: conflictMatch.glassOrderId,
          },
        });

        await tx.glassOrderValidation.create({
          data: {
            glassOrderId: conflictMatch.glassOrderId,
            orderNumber: deliveryItem.orderNumber,
            validationType: 'suffix_mismatch',
            severity: 'warning',
            message: `Konflikt suffixu: zamówione '${conflictMatch.orderSuffix || 'brak'}', dostarczone '${deliveryItem.orderSuffix || 'brak'}'`,
            details: JSON.stringify({
              dimensions: `${deliveryItem.widthMm}x${deliveryItem.heightMm}`,
              deliveryItemId: deliveryItem.id,
              orderItemId: conflictMatch.id,
            }),
          },
        });

        await this.updateOrderDeliveredCountTx(tx, deliveryItem.orderNumber, deliveryItem.quantity);
        continue;
      }

      // STEP 3: No match found
      await tx.glassDeliveryItem.update({
        where: { id: deliveryItem.id },
        data: { matchStatus: 'unmatched' },
      });

      await tx.glassOrderValidation.create({
        data: {
          orderNumber: deliveryItem.orderNumber,
          validationType: 'unmatched_delivery',
          severity: 'error',
          deliveredQuantity: deliveryItem.quantity,
          message: `Dostawa bez zamówienia: ${deliveryItem.orderNumber}${deliveryItem.orderSuffix ? '-' + deliveryItem.orderSuffix : ''} (${deliveryItem.widthMm}x${deliveryItem.heightMm})`,
        },
      });
    }

    // Update Order statuses
    await this.updateOrderStatusesTx(tx, deliveryItems);
  }

  // Legacy non-transaction version
  async matchWithOrders(deliveryId: number) {
    const deliveryItems = await this.prisma.glassDeliveryItem.findMany({
      where: { glassDeliveryId: deliveryId },
    });

    const orderNumbers = [...new Set(deliveryItems.map((i) => i.orderNumber))];
    const allOrderItems = await this.prisma.glassOrderItem.findMany({
      where: { orderNumber: { in: orderNumbers } },
    });

    const orderItemsByNumber = new Map<string, typeof allOrderItems>();
    for (const item of allOrderItems) {
      const key = item.orderNumber;
      if (!orderItemsByNumber.has(key)) {
        orderItemsByNumber.set(key, []);
      }
      orderItemsByNumber.get(key)!.push(item);
    }

    for (const deliveryItem of deliveryItems) {
      const candidates = orderItemsByNumber.get(deliveryItem.orderNumber) || [];

      const exactMatch = candidates.find(
        (c) =>
          c.orderSuffix === deliveryItem.orderSuffix &&
          c.widthMm === deliveryItem.widthMm &&
          c.heightMm === deliveryItem.heightMm
      );

      if (exactMatch) {
        await this.prisma.glassDeliveryItem.update({
          where: { id: deliveryItem.id },
          data: {
            matchStatus: 'matched',
            matchedItemId: exactMatch.id,
            glassOrderId: exactMatch.glassOrderId,
          },
        });
        await this.updateOrderDeliveredCount(deliveryItem.orderNumber, deliveryItem.quantity);
        continue;
      }

      const conflictMatch = candidates.find(
        (c) =>
          c.orderSuffix !== deliveryItem.orderSuffix &&
          c.widthMm === deliveryItem.widthMm &&
          c.heightMm === deliveryItem.heightMm
      );

      if (conflictMatch) {
        await this.prisma.glassDeliveryItem.update({
          where: { id: deliveryItem.id },
          data: {
            matchStatus: 'conflict',
            matchedItemId: conflictMatch.id,
            glassOrderId: conflictMatch.glassOrderId,
          },
        });

        await this.prisma.glassOrderValidation.create({
          data: {
            glassOrderId: conflictMatch.glassOrderId,
            orderNumber: deliveryItem.orderNumber,
            validationType: 'suffix_mismatch',
            severity: 'warning',
            message: `Konflikt suffixu: zamówione '${conflictMatch.orderSuffix || 'brak'}', dostarczone '${deliveryItem.orderSuffix || 'brak'}'`,
            details: JSON.stringify({
              dimensions: `${deliveryItem.widthMm}x${deliveryItem.heightMm}`,
              deliveryItemId: deliveryItem.id,
              orderItemId: conflictMatch.id,
            }),
          },
        });

        await this.updateOrderDeliveredCount(deliveryItem.orderNumber, deliveryItem.quantity);
        continue;
      }

      await this.prisma.glassDeliveryItem.update({
        where: { id: deliveryItem.id },
        data: { matchStatus: 'unmatched' },
      });

      await this.prisma.glassOrderValidation.create({
        data: {
          orderNumber: deliveryItem.orderNumber,
          validationType: 'unmatched_delivery',
          severity: 'error',
          deliveredQuantity: deliveryItem.quantity,
          message: `Dostawa bez zamówienia: ${deliveryItem.orderNumber}${deliveryItem.orderSuffix ? '-' + deliveryItem.orderSuffix : ''} (${deliveryItem.widthMm}x${deliveryItem.heightMm})`,
        },
      });
    }

    await this.updateOrderStatuses(deliveryItems);
  }

  // Transaction-aware helpers
  private async updateOrderDeliveredCountTx(
    tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    orderNumber: string,
    quantity: number
  ) {
    await tx.order.updateMany({
      where: { orderNumber },
      data: {
        deliveredGlassCount: { increment: quantity },
      },
    });
  }

  private async updateOrderStatusesTx(
    tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    deliveryItems: { orderNumber: string }[]
  ) {
    const orderNumbers = [...new Set(deliveryItems.map((i) => i.orderNumber))];

    for (const orderNumber of orderNumbers) {
      const order = await tx.order.findUnique({
        where: { orderNumber },
      });

      if (!order) continue;

      const ordered = order.orderedGlassCount || 0;
      const delivered = order.deliveredGlassCount || 0;

      let newStatus = 'not_ordered';

      if (ordered === 0) {
        newStatus = 'not_ordered';
      } else if (delivered === 0) {
        newStatus = 'ordered';
      } else if (delivered < ordered) {
        newStatus = 'partially_delivered';
      } else if (delivered === ordered) {
        newStatus = 'delivered';
      } else {
        newStatus = 'over_delivered';
      }

      await tx.order.update({
        where: { orderNumber },
        data: { glassOrderStatus: newStatus },
      });
    }
  }

  // Non-transaction helpers
  private async updateOrderDeliveredCount(orderNumber: string, quantity: number) {
    await this.prisma.order.updateMany({
      where: { orderNumber },
      data: {
        deliveredGlassCount: { increment: quantity },
      },
    });
  }

  private async updateOrderStatuses(deliveryItems: { orderNumber: string }[]) {
    const orderNumbers = [...new Set(deliveryItems.map((i) => i.orderNumber))];

    for (const orderNumber of orderNumbers) {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
      });

      if (!order) continue;

      const ordered = order.orderedGlassCount || 0;
      const delivered = order.deliveredGlassCount || 0;

      let newStatus = 'not_ordered';

      if (ordered === 0) {
        newStatus = 'not_ordered';
      } else if (delivered === 0) {
        newStatus = 'ordered';
      } else if (delivered < ordered) {
        newStatus = 'partially_delivered';
      } else if (delivered === ordered) {
        newStatus = 'delivered';
      } else {
        newStatus = 'over_delivered';
      }

      await this.prisma.order.update({
        where: { orderNumber },
        data: { glassOrderStatus: newStatus },
      });
    }
  }

  async findAll(filters?: { dateFrom?: string; dateTo?: string }) {
    return this.prisma.glassDelivery.findMany({
      where: {
        deliveryDate: {
          gte: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
          lte: filters?.dateTo ? new Date(filters.dateTo) : undefined,
        },
      },
      include: {
        items: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: { deliveryDate: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.glassDelivery.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async delete(id: number) {
    const delivery = await this.prisma.glassDelivery.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!delivery) {
      throw new Error('Dostawa nie istnieje');
    }

    // Decrement Order.deliveredGlassCount
    const byOrder = new Map<string, number>();
    for (const item of delivery.items) {
      if (item.matchStatus === 'matched' || item.matchStatus === 'conflict') {
        const current = byOrder.get(item.orderNumber) || 0;
        byOrder.set(item.orderNumber, current + item.quantity);
      }
    }

    for (const [orderNumber, quantity] of byOrder) {
      await this.prisma.order.updateMany({
        where: { orderNumber },
        data: {
          deliveredGlassCount: { decrement: quantity },
        },
      });
    }

    await this.prisma.glassDelivery.delete({
      where: { id },
    });
  }

  /**
   * Aktualizuje Order.glassDeliveryDate gdy wszystkie szyby dostarczone
   */
  private async updateGlassDeliveryDateIfComplete(
    tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    orderNumbers: string[],
    currentDeliveryDate: Date
  ) {
    for (const orderNumber of orderNumbers) {
      const order = await tx.order.findUnique({
        where: { orderNumber },
        select: {
          orderNumber: true,
          orderedGlassCount: true,
          deliveredGlassCount: true,
          glassDeliveryDate: true,
        },
      });

      if (!order) continue;

      const { orderedGlassCount, deliveredGlassCount, glassDeliveryDate } = order;

      // Jeśli komplet dostarczono i nie ma jeszcze daty
      if (
        orderedGlassCount &&
        orderedGlassCount > 0 &&
        deliveredGlassCount &&
        deliveredGlassCount === orderedGlassCount &&
        !glassDeliveryDate
      ) {
        await tx.order.update({
          where: { orderNumber },
          data: { glassDeliveryDate: currentDeliveryDate },
        });
      }
    }
  }
}
