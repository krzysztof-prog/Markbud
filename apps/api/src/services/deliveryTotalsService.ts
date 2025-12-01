import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Dynamically calculates delivery totals from related records
 * instead of storing stale calculated fields in the database
 */
export class DeliveryTotalsService {
  /**
   * Calculate total windows in a delivery
   * Sum all windows across all orders in the delivery
   * @param deliveryId - The delivery ID
   * @returns Total window quantity
   */
  async getTotalWindows(deliveryId: number): Promise<number> {
    const deliveryOrders = await prisma.deliveryOrder.findMany({
      where: { deliveryId },
      select: { orderId: true },
    });

    const orderIds = deliveryOrders.map((do_) => do_.orderId);

    if (orderIds.length === 0) return 0;

    const result = await prisma.orderWindow.aggregate({
      where: { orderId: { in: orderIds } },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity ?? 0;
  }

  /**
   * Calculate total glass items in a delivery
   * Sum all delivery items where itemType is 'glass'
   * @param deliveryId - The delivery ID
   * @returns Total glass quantity
   */
  async getTotalGlass(deliveryId: number): Promise<number> {
    const result = await prisma.deliveryItem.aggregate({
      where: {
        deliveryId,
        itemType: 'glass',
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity ?? 0;
  }

  /**
   * Calculate total pallets needed for a delivery
   * Sum all delivery items where itemType is 'pallet' (or similar logic)
   * @param deliveryId - The delivery ID
   * @returns Total pallet count
   */
  async getTotalPallets(deliveryId: number): Promise<number> {
    // If pallet information is stored in delivery_items with itemType='pallet'
    const result = await prisma.deliveryItem.aggregate({
      where: {
        deliveryId,
        itemType: 'pallet',
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity ?? 0;
  }

  /**
   * Calculate total value of a delivery
   * Sum all orders' PLN values that are part of this delivery
   * @param deliveryId - The delivery ID
   * @returns Total delivery value in PLN
   */
  async getTotalValue(deliveryId: number): Promise<number> {
    const deliveryOrders = await prisma.deliveryOrder.findMany({
      where: { deliveryId },
      select: { orderId: true },
    });

    const orderIds = deliveryOrders.map((do_) => do_.orderId);

    if (orderIds.length === 0) return 0;

    const result = await prisma.order.aggregate({
      where: { id: { in: orderIds } },
      _sum: {
        valuePln: true,
      },
    });

    return result._sum.valuePln ?? 0;
  }

  /**
   * Get all totals for a delivery in one query
   * @param deliveryId - The delivery ID
   * @returns Object with totalWindows, totalGlass, totalPallets, and totalValue
   */
  async getDeliveryTotals(deliveryId: number) {
    const [totalWindows, totalGlass, totalPallets, totalValue] = await Promise.all([
      this.getTotalWindows(deliveryId),
      this.getTotalGlass(deliveryId),
      this.getTotalPallets(deliveryId),
      this.getTotalValue(deliveryId),
    ]);

    return {
      totalWindows,
      totalGlass,
      totalPallets,
      totalValue,
    };
  }

  /**
   * Get delivery with calculated totals
   * @param deliveryId - The delivery ID
   * @returns Delivery object with appended totals
   */
  async getDeliveryWithTotals(deliveryId: number) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliveryOrders: {
          include: {
            order: true,
          },
        },
        deliveryItems: true,
      },
    });

    if (!delivery) {
      return null;
    }

    const totals = await this.getDeliveryTotals(deliveryId);

    return {
      ...delivery,
      ...totals,
    };
  }

  /**
   * Get multiple deliveries with their calculated totals
   * @param deliveryIds - Array of delivery IDs
   * @returns Array of deliveries with appended totals
   */
  async getDeliveriesWithTotals(deliveryIds: number[]) {
    const deliveries = await prisma.delivery.findMany({
      where: { id: { in: deliveryIds } },
      include: {
        deliveryOrders: {
          include: {
            order: true,
          },
        },
        deliveryItems: true,
      },
    });

    return Promise.all(
      deliveries.map(async (delivery) => ({
        ...delivery,
        ...(await this.getDeliveryTotals(delivery.id)),
      }))
    );
  }
}

export const deliveryTotalsService = new DeliveryTotalsService();
