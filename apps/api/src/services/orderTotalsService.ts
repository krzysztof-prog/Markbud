import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Dynamically calculates order totals from related records
 * instead of storing stale calculated fields in the database
 */
export class OrderTotalsService {
  /**
   * Calculate total windows in an order by summing quantities from order_windows
   * @param orderId - The order ID
   * @returns Total window quantity
   */
  async getTotalWindows(orderId: number): Promise<number> {
    const result = await prisma.orderWindow.aggregate({
      where: { orderId },
      _sum: {
        quantity: true,
      },
    });
    return result._sum.quantity ?? 0;
  }

  /**
   * Calculate total sashes from order requirements
   * Assumes each profile requirement represents one type of sash
   * @param orderId - The order ID
   * @returns Total number of different sash types (profile count)
   */
  async getTotalSashes(orderId: number): Promise<number> {
    const count = await prisma.orderRequirement.count({
      where: { orderId },
    });
    return count;
  }

  /**
   * Calculate total glasses from order windows
   * Assumes each window type requires one glass unit
   * @param orderId - The order ID
   * @returns Total number of windows (which represents glass units)
   */
  async getTotalGlasses(orderId: number): Promise<number> {
    const count = await prisma.orderWindow.count({
      where: { orderId },
    });
    return count;
  }

  /**
   * Get all totals for an order in one query
   * @param orderId - The order ID
   * @returns Object with totalWindows, totalSashes, and totalGlasses
   */
  async getOrderTotals(orderId: number) {
    const [totalWindows, totalSashes, totalGlasses] = await Promise.all([
      this.getTotalWindows(orderId),
      this.getTotalSashes(orderId),
      this.getTotalGlasses(orderId),
    ]);

    return {
      totalWindows,
      totalSashes,
      totalGlasses,
    };
  }

  /**
   * Get order with calculated totals
   * @param orderId - The order ID
   * @returns Order object with appended totals
   */
  async getOrderWithTotals(orderId: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        requirements: true,
        windows: true,
        deliveryOrders: true,
        orderNotes: true,
      },
    });

    if (!order) {
      return null;
    }

    const totals = await this.getOrderTotals(orderId);

    return {
      ...order,
      ...totals,
    };
  }

  /**
   * Get multiple orders with their calculated totals
   * @param orderIds - Array of order IDs
   * @returns Array of orders with appended totals
   */
  async getOrdersWithTotals(orderIds: number[]) {
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        requirements: true,
        windows: true,
        deliveryOrders: true,
        orderNotes: true,
      },
    });

    return Promise.all(
      orders.map(async (order) => ({
        ...order,
        ...(await this.getOrderTotals(order.id)),
      }))
    );
  }
}

export const orderTotalsService = new OrderTotalsService();
