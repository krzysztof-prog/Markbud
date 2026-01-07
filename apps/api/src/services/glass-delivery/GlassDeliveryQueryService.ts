import type { PrismaClient } from '@prisma/client';
import type {
  GlassDeliveryFilters,
  GlassDeliveryWithItems,
  GlassDeliveryWithItemsAndCount,
  ImportSummary,
} from './types.js';

/**
 * Service responsible for querying glass deliveries
 */
export class GlassDeliveryQueryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find all glass deliveries with optional date filtering
   */
  async findAll(filters?: GlassDeliveryFilters): Promise<GlassDeliveryWithItemsAndCount[]> {
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

  /**
   * Find glass delivery by ID
   */
  async findById(id: number): Promise<GlassDeliveryWithItems | null> {
    return this.prisma.glassDelivery.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Delete a glass delivery and update related order counts
   * Używa transakcji dla atomowości i batch updates dla wydajności
   */
  async delete(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.glassDelivery.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!delivery) {
        throw new Error('Dostawa nie istnieje');
      }

      // Collect order updates - grupuj ilości po numerze zlecenia
      const orderUpdates = new Map<string, number>();
      for (const item of delivery.items) {
        if (item.matchStatus === 'matched' || item.matchStatus === 'conflict') {
          const current = orderUpdates.get(item.orderNumber) || 0;
          orderUpdates.set(item.orderNumber, current + item.quantity);
        }
      }

      // Batch update orders - wykonaj wszystkie updateMany równolegle
      const updatePromises = Array.from(orderUpdates.entries()).map(
        ([orderNumber, quantity]) =>
          tx.order.updateMany({
            where: { orderNumber },
            data: { deliveredGlassCount: { decrement: quantity } },
          })
      );
      await Promise.all(updatePromises);

      // Delete validations related to this delivery's order numbers
      const orderNumbers = [...new Set(delivery.items.map((item) => item.orderNumber))];
      if (orderNumbers.length > 0) {
        await tx.glassOrderValidation.deleteMany({
          where: { orderNumber: { in: orderNumbers } },
        });
      }

      // Hard delete - model GlassDelivery nie ma pola deletedAt
      // TODO: Rozważyć dodanie soft delete do modelu GlassDelivery w przyszłości
      await tx.glassDelivery.delete({
        where: { id },
      });
    });
  }

  /**
   * Get the latest import summary with statistics
   */
  async getLatestImportSummary(): Promise<ImportSummary | null> {
    const delivery = await this.prisma.glassDelivery.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!delivery) {
      return null;
    }

    const stats = {
      total: delivery.items.length,
      matched: delivery.items.filter((i) => i.matchStatus === 'matched').length,
      conflict: delivery.items.filter((i) => i.matchStatus === 'conflict').length,
      unmatched: delivery.items.filter((i) => i.matchStatus === 'unmatched').length,
      pending: delivery.items.filter((i) => i.matchStatus === 'pending').length,
    };

    // Group items by order number
    const byOrder = new Map<string, typeof delivery.items>();
    for (const item of delivery.items) {
      if (!byOrder.has(item.orderNumber)) {
        byOrder.set(item.orderNumber, []);
      }
      byOrder.get(item.orderNumber)!.push(item);
    }

    const orderSummary = Array.from(byOrder.entries()).map(([orderNumber, items]) => ({
      orderNumber,
      itemCount: items.length,
      quantity: items.reduce((sum, i) => sum + i.quantity, 0),
      matchStatus: {
        matched: items.filter((i) => i.matchStatus === 'matched').length,
        conflict: items.filter((i) => i.matchStatus === 'conflict').length,
        unmatched: items.filter((i) => i.matchStatus === 'unmatched').length,
        pending: items.filter((i) => i.matchStatus === 'pending').length,
      },
    }));

    return {
      delivery: {
        id: delivery.id,
        rackNumber: delivery.rackNumber,
        customerOrderNumber: delivery.customerOrderNumber,
        supplierOrderNumber: delivery.supplierOrderNumber,
        deliveryDate: delivery.deliveryDate,
        createdAt: delivery.createdAt,
      },
      stats,
      orderSummary,
    };
  }
}
