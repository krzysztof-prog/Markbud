import { PrismaClient, Prisma } from '@prisma/client';
import { parseGlassOrderTxt } from './parsers/glass-order-txt-parser.js';
import { ConflictError } from '../utils/errors.js';
import { GlassDeliveryMatchingService } from './glass-delivery/GlassDeliveryMatchingService.js';
import { matchingQueue } from './import/MatchingQueueService.js';
import { logger } from '../utils/logger.js';
import { emitOrderUpdated } from './event-emitter.js';

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
    // Zwiększony timeout (60s) - przy wielu pozycjach transakcja może trwać dłużej
    const result = await this.prisma.$transaction(async (tx) => {
      // If replacing, HARD delete the old one (soft delete leaves glassOrderNumber in DB → unique constraint)
      if (existing && replaceExisting) {
        await this.deleteTx(tx, existing.id, existing.items);
        // Hard delete items and order (deleteTx only soft-deletes)
        await tx.glassOrderItem.deleteMany({ where: { glassOrderId: existing.id } });
        await tx.glassOrder.delete({ where: { id: existing.id } });
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
      // This only does BASIC matching - heavy re-matching is queued separately
      const orderNumbers = await this.matchWithProductionOrdersTx(tx, glassOrder.id, glassOrder.expectedDeliveryDate);

      return { glassOrder, orderNumbers };
    }, {
      timeout: 60000, // 60 sekund - przy wielu pozycjach transakcja może trwać dłużej
      maxWait: 10000, // max 10 sekund czekania na dostępność połączenia
    });

    // AFTER transaction completes: queue heavy matching (re-match unmatched delivery items)
    // This is done OUTSIDE the transaction to avoid nested transaction deadlocks
    if (result.orderNumbers.length > 0) {
      this.enqueueHeavyMatching(result.glassOrder.id, result.orderNumbers);
    }

    return result.glassOrder;
  }

  /**
   * Queue heavy matching operation to MatchingQueue.
   * Runs OUTSIDE transaction to avoid SQLite nested transaction deadlocks.
   */
  private enqueueHeavyMatching(glassOrderId: number, orderNumbers: string[]): void {
    if (orderNumbers.length === 0) return;

    matchingQueue.enqueue({
      type: 'glass_order_matching',
      priority: 10, // Normal priority
      metadata: {
        glassOrderId,
        orderNumbers,
        source: 'glass_order_import',
      },
      execute: async () => {
        try {
          const result = await this.matchingService.rematchUnmatchedForOrdersStandalone(orderNumbers);
          logger.info(`[GlassOrderService] Heavy matching completed`, {
            glassOrderId,
            rematched: result.rematched,
            stillUnmatched: result.stillUnmatched,
            orderNumbers: orderNumbers.slice(0, 5), // Log first 5 for brevity
          });
          return {
            success: true,
            matchedCount: result.rematched,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`[GlassOrderService] Heavy matching failed`, {
            glassOrderId,
            error: errorMessage,
            orderNumbers: orderNumbers.slice(0, 5),
          });
          return {
            success: false,
            error: errorMessage,
            shouldRetry: true, // Retry on failure
          };
        }
      },
    });

    logger.info(`[GlassOrderService] Queued heavy matching for glass order`, {
      glassOrderId,
      orderCount: orderNumbers.length,
    });
  }

  /**
   * Transaction-aware basic matching for import.
   * Only updates Order counts - does NOT do heavy re-matching (queued separately).
   * Returns orderNumbers for subsequent queued matching.
   */
  private async matchWithProductionOrdersTx(
    tx: Prisma.TransactionClient,
    glassOrderId: number,
    expectedDeliveryDate: Date | null
  ): Promise<string[]> {
    const items = await tx.glassOrderItem.findMany({
      where: { glassOrderId },
    });

    // Group by full orderNumber (with suffix, e.g. "53818-a")
    const byOrder = new Map<string, number>();
    for (const item of items) {
      const fullOrderNumber = item.orderSuffix
        ? `${item.orderNumber}-${item.orderSuffix}`
        : item.orderNumber;
      const current = byOrder.get(fullOrderNumber) || 0;
      byOrder.set(fullOrderNumber, current + item.quantity);
    }

    // Batch fetch all orders at once (avoid N+1)
    // Also try base numbers (without suffix) as fallback
    const orderNumbers = [...byOrder.keys()];
    const baseNumbers = orderNumbers
      .filter(n => n.includes('-'))
      .map(n => n.split('-')[0]);
    const allLookups = [...new Set([...orderNumbers, ...baseNumbers])];

    const existingOrders = await tx.order.findMany({
      where: { orderNumber: { in: allLookups } },
      select: { orderNumber: true, deliveredGlassCount: true, orderedGlassCount: true },
    });
    const existingMap = new Map(existingOrders.map((o) => [o.orderNumber, o]));

    // Update existing orders
    for (const [orderNumber, quantity] of byOrder) {
      // Try full order number first, then base number as fallback
      const baseNumber = orderNumber.includes('-') ? orderNumber.split('-')[0] : null;
      const matchedOrderNumber = existingMap.has(orderNumber)
        ? orderNumber
        : (baseNumber && existingMap.has(baseNumber) ? baseNumber : null);

      if (matchedOrderNumber) {
        const existingOrder = existingMap.get(matchedOrderNumber)!;
        const newOrderedCount = (existingOrder.orderedGlassCount || 0) + quantity;
        const delivered = existingOrder.deliveredGlassCount || 0;

        // Oblicz status uwzględniając istniejące dostawy
        let newStatus = 'ordered';
        if (delivered > 0 && delivered < newOrderedCount) {
          newStatus = 'partially_delivered';
        } else if (delivered > 0 && delivered >= newOrderedCount) {
          newStatus = delivered > newOrderedCount ? 'over_delivered' : 'delivered';
        }

        // Przygotuj dane do aktualizacji
        const updateData: Record<string, unknown> = {
          orderedGlassCount: { increment: quantity },
          glassOrderStatus: newStatus,
        };

        // Ustaw glassDeliveryDate TYLKO jeśli nowa wartość nie jest null
        // Zapobiega nadpisaniu istniejącej daty przez późniejszy import PDF (który nie ma daty)
        if (expectedDeliveryDate !== null) {
          updateData.glassDeliveryDate = expectedDeliveryDate;
        }

        await tx.order.update({
          where: { orderNumber: matchedOrderNumber },
          data: updateData,
        });

        // Zaktualizuj cache mapy (orderedGlassCount zmieniony)
        existingOrder.orderedGlassCount = newOrderedCount;
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

    // Return orderNumbers for subsequent queued matching
    // (re-match unmatched delivery items is done OUTSIDE transaction via MatchingQueue)
    return orderNumbers;
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
      const fullOrderNumber = item.orderSuffix
        ? `${item.orderNumber}-${item.orderSuffix}`
        : item.orderNumber;
      const current = byOrder.get(fullOrderNumber) || 0;
      byOrder.set(fullOrderNumber, current + item.quantity);
    }

    const orderNumbers = [...byOrder.keys()];
    const baseNumbers = orderNumbers
      .filter(n => n.includes('-'))
      .map(n => n.split('-')[0]);
    const allLookups = [...new Set([...orderNumbers, ...baseNumbers])];

    const existingOrders = await this.prisma.order.findMany({
      where: { orderNumber: { in: allLookups } },
      select: { orderNumber: true, deliveredGlassCount: true, orderedGlassCount: true, id: true },
    });
    const existingMap = new Map(existingOrders.map((o) => [o.orderNumber, o]));

    for (const [orderNumber, quantity] of byOrder) {
      const baseNumber = orderNumber.includes('-') ? orderNumber.split('-')[0] : null;
      const matchedOrderNumber = existingMap.has(orderNumber)
        ? orderNumber
        : (baseNumber && existingMap.has(baseNumber) ? baseNumber : null);

      if (matchedOrderNumber) {
        const existingOrder = existingMap.get(matchedOrderNumber)!;
        const newOrderedCount = (existingOrder.orderedGlassCount || 0) + quantity;
        const delivered = existingOrder.deliveredGlassCount || 0;

        // Oblicz status uwzględniając istniejące dostawy
        let newStatus = 'ordered';
        if (delivered > 0 && delivered < newOrderedCount) {
          newStatus = 'partially_delivered';
        } else if (delivered > 0 && delivered >= newOrderedCount) {
          newStatus = delivered > newOrderedCount ? 'over_delivered' : 'delivered';
        }

        // Przygotuj dane do aktualizacji
        const updateData: Record<string, unknown> = {
          orderedGlassCount: { increment: quantity },
          glassOrderStatus: newStatus,
        };

        // Ustaw glassDeliveryDate TYLKO jeśli nowa wartość nie jest null
        // Zapobiega nadpisaniu istniejącej daty przez późniejszy import PDF (który nie ma daty)
        if (glassOrder?.expectedDeliveryDate) {
          updateData.glassDeliveryDate = glassOrder.expectedDeliveryDate;
        }

        const updatedOrder = await this.prisma.order.update({
          where: { orderNumber: matchedOrderNumber },
          data: updateData,
        });

        // Zaktualizuj cache mapy
        existingOrder.orderedGlassCount = newOrderedCount;

        // Emit realtime update
        emitOrderUpdated({ id: updatedOrder.id });
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
    }, {
      timeout: 60000, // 60 sekund timeout
      maxWait: 10000,
    });
  }

  /**
   * Transaction-aware delete - do użycia wewnątrz istniejącej transakcji
   * Używane w importFromTxt z replaceExisting=true dla atomowości
   */
  private async deleteTx(
    tx: Prisma.TransactionClient,
    id: number,
    items: Array<{ orderNumber: string; orderSuffix?: string | null; quantity: number }>
  ) {
    // Decrement Order.orderedGlassCount and update status
    const byOrder = new Map<string, number>();
    for (const item of items) {
      const fullOrderNumber = item.orderSuffix
        ? `${item.orderNumber}-${item.orderSuffix}`
        : item.orderNumber;
      const current = byOrder.get(fullOrderNumber) || 0;
      byOrder.set(fullOrderNumber, current + item.quantity);
    }

    for (const [orderNumber, quantity] of byOrder) {
      // Try full number first, then base number as fallback
      let order = await tx.order.findUnique({
        where: { orderNumber },
      });
      if (!order && orderNumber.includes('-')) {
        order = await tx.order.findUnique({
          where: { orderNumber: orderNumber.split('-')[0] },
        });
      }

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

  /**
   * Aktualizuje datę dostawy zamówienia szyb i powiązanych zleceń produkcyjnych
   */
  async updateExpectedDeliveryDate(id: number, expectedDeliveryDate: Date) {
    const glassOrder = await this.prisma.glassOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!glassOrder) {
      throw new Error('Zamówienie nie istnieje');
    }

    // Aktualizuj datę w GlassOrder
    await this.prisma.glassOrder.update({
      where: { id },
      data: { expectedDeliveryDate },
    });

    // Aktualizuj glassDeliveryDate w powiązanych zleceniach produkcyjnych
    const orderNumbers = [...new Set(glassOrder.items.map(i => i.orderNumber))];
    const baseNumbers = orderNumbers.filter(n => n.includes('-')).map(n => n.split('-')[0]);
    const allNumbers = [...new Set([...orderNumbers, ...baseNumbers])];

    const result = await this.prisma.order.updateMany({
      where: { orderNumber: { in: allNumbers } },
      data: { glassDeliveryDate: expectedDeliveryDate },
    });

    // Emituj aktualizacje
    const orders = await this.prisma.order.findMany({
      where: { orderNumber: { in: allNumbers } },
      select: { id: true },
    });
    for (const order of orders) {
      emitOrderUpdated({ id: order.id });
    }

    return { updatedOrders: result.count, orderNumbers: allNumbers };
  }

  /**
   * Re-match all glass orders to production orders.
   * Recalculates orderedGlassCount from scratch for all affected orders.
   */
  async rematchAllGlassOrders(): Promise<{
    glassOrdersProcessed: number;
    ordersUpdated: number;
    ordersNotFound: string[];
    details: Array<{ orderNumber: string; quantity: number; matched: boolean; matchedAs?: string }>;
  }> {
    // 1. Get all non-deleted glass orders with items
    const glassOrders = await this.prisma.glassOrder.findMany({
      where: { deletedAt: null },
      include: { items: true },
    });

    // 2. Build map: fullOrderNumber → total quantity across all glass orders
    const totalByOrder = new Map<string, number>();
    for (const go of glassOrders) {
      for (const item of go.items) {
        const fullOrderNumber = item.orderSuffix
          ? `${item.orderNumber}-${item.orderSuffix}`
          : item.orderNumber;
        const current = totalByOrder.get(fullOrderNumber) || 0;
        totalByOrder.set(fullOrderNumber, current + item.quantity);
      }
    }

    // 3. Batch fetch all potentially matching orders
    const orderNumbers = [...totalByOrder.keys()];
    const baseNumbers = orderNumbers
      .filter(n => n.includes('-'))
      .map(n => n.split('-')[0]);
    const allLookups = [...new Set([...orderNumbers, ...baseNumbers])];

    const existingOrders = await this.prisma.order.findMany({
      where: { orderNumber: { in: allLookups } },
      select: { id: true, orderNumber: true, orderedGlassCount: true, deliveredGlassCount: true },
    });
    const existingMap = new Map(existingOrders.map(o => [o.orderNumber, o]));

    // 4. Reset orderedGlassCount for all previously matched orders
    await this.prisma.order.updateMany({
      where: { orderNumber: { in: allLookups }, glassOrderStatus: { not: 'not_ordered' } },
      data: { orderedGlassCount: 0, glassOrderStatus: 'not_ordered' },
    });

    // 5. Apply new counts
    const ordersNotFound: string[] = [];
    const details: Array<{ orderNumber: string; quantity: number; matched: boolean; matchedAs?: string }> = [];
    const updatedOrderIds = new Set<number>();

    for (const [orderNumber, quantity] of totalByOrder) {
      const baseNumber = orderNumber.includes('-') ? orderNumber.split('-')[0] : null;
      const order = existingMap.get(orderNumber)
        || (baseNumber ? existingMap.get(baseNumber) : undefined);

      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            orderedGlassCount: { increment: quantity },
            glassOrderStatus: 'ordered',
          },
        });
        updatedOrderIds.add(order.id);
        details.push({
          orderNumber,
          quantity,
          matched: true,
          matchedAs: order.orderNumber,
        });
      } else {
        ordersNotFound.push(orderNumber);
        details.push({ orderNumber, quantity, matched: false });
      }
    }

    // 6. Recalculate glassOrderStatus for updated orders based on delivered counts
    for (const orderId of updatedOrderIds) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { orderedGlassCount: true, deliveredGlassCount: true },
      });
      if (order) {
        const ordered = order.orderedGlassCount || 0;
        const delivered = order.deliveredGlassCount || 0;
        let status = 'ordered';
        if (delivered > 0 && delivered < ordered) status = 'partially_delivered';
        else if (delivered > 0 && delivered >= ordered) status = 'delivered';
        if (delivered > ordered) status = 'over_delivered';

        await this.prisma.order.update({
          where: { id: orderId },
          data: { glassOrderStatus: status },
        });

        emitOrderUpdated({ id: orderId });
      }
    }

    logger.info(`[GlassOrderService] Rematch completed: ${glassOrders.length} glass orders, ${updatedOrderIds.size} orders updated, ${ordersNotFound.length} not found`);

    return {
      glassOrdersProcessed: glassOrders.length,
      ordersUpdated: updatedOrderIds.size,
      ordersNotFound,
      details,
    };
  }

  /**
   * Ręcznie oznacza szyby zlecenia jako dostarczone.
   * Używane gdy szyby przyszły bez sufiksu i nie zostały automatycznie dopasowane.
   */
  async markOrderGlassDelivered(orderId: number): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderedGlassCount: true, totalGlasses: true },
    });

    if (!order) {
      throw new Error('Zlecenie nie istnieje');
    }

    const glassCount = Math.max(order.orderedGlassCount || 0, order.totalGlasses || 0);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveredGlassCount: glassCount,
        glassOrderStatus: 'delivered',
      },
    });

    emitOrderUpdated({ id: orderId });
  }
}
