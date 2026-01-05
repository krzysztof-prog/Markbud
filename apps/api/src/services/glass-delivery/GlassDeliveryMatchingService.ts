import type { PrismaClient } from '@prisma/client';
import type { TransactionClient, RematchResult } from './types.js';

/**
 * Type for creating new validations (without auto-generated fields)
 */
type ValidationCreateInput = {
  glassOrderId: number | null;
  orderNumber: string;
  validationType: string;
  severity: string;
  message: string;
  details: string | null;
  orderedQuantity: number | null;
  deliveredQuantity: number | null;
  expectedQuantity: number | null;
  resolvedBy: string | null;
};

/**
 * Service responsible for matching glass delivery items with orders
 */
export class GlassDeliveryMatchingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Transaction-aware version for import (OPTIMIZED - batch operations)
   */
  async matchWithOrdersTx(tx: TransactionClient, deliveryId: number): Promise<void> {
    const deliveryItems = await tx.glassDeliveryItem.findMany({
      where: { glassDeliveryId: deliveryId },
    });

    // Batch fetch all potentially matching order items at once
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

    // Prepare batch data structures
    const matchedUpdates: { id: number; matchedItemId: number; glassOrderId: number }[] = [];
    const conflictUpdates: { id: number; matchedItemId: number; glassOrderId: number }[] = [];
    const unmatchedIds: number[] = [];
    const validationsToCreate: ValidationCreateInput[] = [];
    const deliveredCountByOrder = new Map<string, number>();

    // Process all items in memory (no DB calls in loop)
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
        matchedUpdates.push({
          id: deliveryItem.id,
          matchedItemId: exactMatch.id,
          glassOrderId: exactMatch.glassOrderId,
        });
        const current = deliveredCountByOrder.get(deliveryItem.orderNumber) || 0;
        deliveredCountByOrder.set(deliveryItem.orderNumber, current + deliveryItem.quantity);
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
        conflictUpdates.push({
          id: deliveryItem.id,
          matchedItemId: conflictMatch.id,
          glassOrderId: conflictMatch.glassOrderId,
        });
        validationsToCreate.push({
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
          orderedQuantity: null,
          deliveredQuantity: null,
          expectedQuantity: null,
          resolvedBy: null,
        });
        const current = deliveredCountByOrder.get(deliveryItem.orderNumber) || 0;
        deliveredCountByOrder.set(deliveryItem.orderNumber, current + deliveryItem.quantity);
        continue;
      }

      // STEP 3: No match found
      unmatchedIds.push(deliveryItem.id);
      validationsToCreate.push({
        glassOrderId: null,
        orderNumber: deliveryItem.orderNumber,
        validationType: 'unmatched_delivery',
        severity: 'error',
        deliveredQuantity: deliveryItem.quantity,
        orderedQuantity: null,
        expectedQuantity: null,
        resolvedBy: null,
        details: null,
        message: `Dostawa bez zamówienia: ${deliveryItem.orderNumber}${deliveryItem.orderSuffix ? '-' + deliveryItem.orderSuffix : ''} (${deliveryItem.widthMm}x${deliveryItem.heightMm})`,
      });
    }

    // BATCH EXECUTE: Sequential operations within transaction
    // Using sequential instead of parallel to reduce SQLite lock contention

    // 1. Update matched items sequentially to avoid SQLite write locks
    // Batch size reduced to 10 for better SQLite compatibility
    const BATCH_SIZE = 10;
    for (let i = 0; i < matchedUpdates.length; i += BATCH_SIZE) {
      const batch = matchedUpdates.slice(i, i + BATCH_SIZE);
      // Sequential updates to avoid SQLite deadlocks
      for (const update of batch) {
        await tx.glassDeliveryItem.update({
          where: { id: update.id },
          data: {
            matchStatus: 'matched',
            matchedItemId: update.matchedItemId,
            glassOrderId: update.glassOrderId,
          },
        });
      }
    }

    // 2. Update conflict items sequentially
    for (let i = 0; i < conflictUpdates.length; i += BATCH_SIZE) {
      const batch = conflictUpdates.slice(i, i + BATCH_SIZE);
      // Sequential updates to avoid SQLite deadlocks
      for (const update of batch) {
        await tx.glassDeliveryItem.update({
          where: { id: update.id },
          data: {
            matchStatus: 'conflict',
            matchedItemId: update.matchedItemId,
            glassOrderId: update.glassOrderId,
          },
        });
      }
    }

    // 3. Batch update unmatched items (single query - most efficient)
    if (unmatchedIds.length > 0) {
      await tx.glassDeliveryItem.updateMany({
        where: { id: { in: unmatchedIds } },
        data: { matchStatus: 'unmatched' },
      });
    }

    // 4. Batch create validations (single query)
    if (validationsToCreate.length > 0) {
      await tx.glassOrderValidation.createMany({
        data: validationsToCreate,
      });
    }

    // 5. Update delivered counts per order (sequential)
    for (const [orderNumber, quantity] of deliveredCountByOrder) {
      await tx.order.updateMany({
        where: { orderNumber },
        data: { deliveredGlassCount: { increment: quantity } },
      });
    }

    // Update Order statuses (optimized)
    await this.updateOrderStatusesTx(tx, deliveryItems);
  }

  /**
   * Legacy non-transaction version
   */
  async matchWithOrders(deliveryId: number): Promise<void> {
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

  /**
   * Re-match unmatched delivery items after orders are imported
   * Called automatically when orders are created/updated via uzyte_bele import
   */
  async rematchUnmatchedForOrders(orderNumbers: string[]): Promise<RematchResult> {
    if (orderNumbers.length === 0) {
      return { rematched: 0, stillUnmatched: 0 };
    }

    // 1. Find all unmatched delivery items for these orders
    const unmatchedItems = await this.prisma.glassDeliveryItem.findMany({
      where: {
        matchStatus: 'unmatched',
        orderNumber: { in: orderNumbers },
      },
    });

    if (unmatchedItems.length === 0) {
      return { rematched: 0, stillUnmatched: 0 };
    }

    // 2. Batch fetch GlassOrderItems for these orders
    const allOrderItems = await this.prisma.glassOrderItem.findMany({
      where: { orderNumber: { in: orderNumbers } },
    });

    // 3. Group by orderNumber for quick lookup
    const orderItemsByNumber = new Map<string, typeof allOrderItems>();
    for (const item of allOrderItems) {
      if (!orderItemsByNumber.has(item.orderNumber)) {
        orderItemsByNumber.set(item.orderNumber, []);
      }
      orderItemsByNumber.get(item.orderNumber)!.push(item);
    }

    let rematched = 0;
    let stillUnmatched = 0;

    // 4. Process in transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const deliveryItem of unmatchedItems) {
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

          // Update Order.deliveredGlassCount
          await tx.order.updateMany({
            where: { orderNumber: deliveryItem.orderNumber },
            data: { deliveredGlassCount: { increment: deliveryItem.quantity } },
          });

          // Mark validation as resolved
          await tx.glassOrderValidation.updateMany({
            where: {
              orderNumber: deliveryItem.orderNumber,
              validationType: 'unmatched_delivery',
              resolved: false,
              message: { contains: `${deliveryItem.widthMm}x${deliveryItem.heightMm}` },
            },
            data: { resolved: true, resolvedAt: new Date() },
          });

          rematched++;
          continue;
        }

        // STEP 2: Check for suffix conflict match
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

          // Create conflict validation
          await tx.glassOrderValidation.create({
            data: {
              glassOrderId: conflictMatch.glassOrderId,
              orderNumber: deliveryItem.orderNumber,
              validationType: 'suffix_mismatch',
              severity: 'warning',
              message: `Konflikt suffixu (re-match): zamówione '${conflictMatch.orderSuffix || 'brak'}', dostarczone '${deliveryItem.orderSuffix || 'brak'}'`,
              details: JSON.stringify({
                dimensions: `${deliveryItem.widthMm}x${deliveryItem.heightMm}`,
                deliveryItemId: deliveryItem.id,
                orderItemId: conflictMatch.id,
              }),
            },
          });

          // Mark old unmatched validation as resolved
          await tx.glassOrderValidation.updateMany({
            where: {
              orderNumber: deliveryItem.orderNumber,
              validationType: 'unmatched_delivery',
              resolved: false,
              message: { contains: `${deliveryItem.widthMm}x${deliveryItem.heightMm}` },
            },
            data: { resolved: true, resolvedAt: new Date() },
          });

          await tx.order.updateMany({
            where: { orderNumber: deliveryItem.orderNumber },
            data: { deliveredGlassCount: { increment: deliveryItem.quantity } },
          });

          rematched++;
          continue;
        }

        // No match found - still unmatched
        stillUnmatched++;
      }

      // 5. Update Order statuses
      const uniqueOrders = [...new Set(unmatchedItems.map((i) => i.orderNumber))];
      for (const orderNumber of uniqueOrders) {
        const order = await tx.order.findUnique({ where: { orderNumber } });
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
    });

    return { rematched, stillUnmatched };
  }

  /**
   * Update Order.glassDeliveryDate when all glass is delivered (OPTIMIZED)
   */
  async updateGlassDeliveryDateIfComplete(
    tx: TransactionClient,
    orderNumbers: string[],
    currentDeliveryDate: Date
  ): Promise<void> {
    if (orderNumbers.length === 0) return;

    // Batch fetch all orders at once
    const orders = await tx.order.findMany({
      where: { orderNumber: { in: orderNumbers } },
      select: {
        orderNumber: true,
        orderedGlassCount: true,
        deliveredGlassCount: true,
        glassDeliveryDate: true,
      },
    });

    // Find orders that need date update
    const ordersToUpdate = orders
      .filter(
        (order) =>
          order.orderedGlassCount &&
          order.orderedGlassCount > 0 &&
          order.deliveredGlassCount &&
          order.deliveredGlassCount === order.orderedGlassCount &&
          !order.glassDeliveryDate
      )
      .map((o) => o.orderNumber);

    // Single batch update
    if (ordersToUpdate.length > 0) {
      await tx.order.updateMany({
        where: { orderNumber: { in: ordersToUpdate } },
        data: { glassDeliveryDate: currentDeliveryDate },
      });
    }
  }

  /**
   * Transaction-aware order status update (OPTIMIZED - batch operations)
   */
  private async updateOrderStatusesTx(
    tx: TransactionClient,
    deliveryItems: { orderNumber: string }[]
  ): Promise<void> {
    const orderNumbers = [...new Set(deliveryItems.map((i) => i.orderNumber))];

    // Batch fetch all orders at once (1 query instead of N)
    const orders = await tx.order.findMany({
      where: { orderNumber: { in: orderNumbers } },
      select: {
        orderNumber: true,
        orderedGlassCount: true,
        deliveredGlassCount: true,
      },
    });

    // Group updates by status to use updateMany
    const statusGroups: Record<string, string[]> = {
      not_ordered: [],
      ordered: [],
      partially_delivered: [],
      delivered: [],
      over_delivered: [],
    };

    for (const order of orders) {
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

      statusGroups[newStatus].push(order.orderNumber);
    }

    // Execute batch updates per status (max 5 queries instead of N)
    const updatePromises: Promise<unknown>[] = [];
    for (const [status, numbers] of Object.entries(statusGroups)) {
      if (numbers.length > 0) {
        updatePromises.push(
          tx.order.updateMany({
            where: { orderNumber: { in: numbers } },
            data: { glassOrderStatus: status },
          })
        );
      }
    }

    await Promise.all(updatePromises);
  }

  /**
   * Non-transaction helper for updating delivered count
   */
  private async updateOrderDeliveredCount(orderNumber: string, quantity: number): Promise<void> {
    await this.prisma.order.updateMany({
      where: { orderNumber },
      data: {
        deliveredGlassCount: { increment: quantity },
      },
    });
  }

  /**
   * Non-transaction helper for updating order statuses
   */
  private async updateOrderStatuses(deliveryItems: { orderNumber: string }[]): Promise<void> {
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
}
