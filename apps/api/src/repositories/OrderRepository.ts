/**
 * Order Repository - Database access layer
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PaginationParams, PaginatedResponse } from '../validators/common';

export interface OrderFilters {
  status?: string;
  archived?: string;
  colorId?: string;
}

export class OrderRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters: OrderFilters = {}, pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    const where: Prisma.OrderWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.archived === 'true') {
      where.archivedAt = { not: null };
    } else if (filters.archived === 'false') {
      where.archivedAt = null;
    }

    if (filters.colorId) {
      where.requirements = {
        some: {
          colorId: parseInt(filters.colorId),
        },
      };
    }

    // Get total count for pagination
    const total = await this.prisma.order.count({ where });

    // Get paginated data
    const rawData = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        client: true,
        project: true,
        system: true,
        deadline: true,
        pvcDeliveryDate: true,
        glassDeliveryDate: true,
        valuePln: true,
        valueEur: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
        orderedGlassCount: true,
        deliveredGlassCount: true,
        glassOrderStatus: true,
        createdAt: true,
        archivedAt: true,
        windows: {
          select: {
            id: true,
            profileType: true,
            reference: true,
          },
        },
        glassOrderItems: {
          select: {
            glassOrder: {
              select: {
                expectedDeliveryDate: true,
                actualDeliveryDate: true,
              },
            },
          },
          take: 1, // Only need first one for delivery date
        },
        deliveryDate: true,
        schucoLinks: {
          select: {
            id: true,
            linkedAt: true,
            linkedBy: true,
            schucoDelivery: {
              select: {
                id: true,
                orderNumber: true,
                shippingStatus: true,
                deliveryWeek: true,
                totalAmount: true,
                isWarehouseItem: true,
              },
            },
          },
        },
        deliveryOrders: {
          select: {
            id: true,
            deliveryId: true,
            delivery: {
              select: {
                id: true,
                deliveryDate: true,
                deliveryNumber: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: { windows: true, requirements: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 50,
    });

    // Populate glassDeliveryDate from related glass order if not set
    const data = rawData.map(order => {
      const glassDeliveryDate = order.glassDeliveryDate ||
        (order.glassOrderItems?.[0]?.glassOrder?.expectedDeliveryDate ?? null);

      // Remove glassOrderItems from response (internal use only)
      const { glassOrderItems, ...orderData } = order as any;

      return {
        ...orderData,
        glassDeliveryDate,
      };
    });

    return {
      data,
      total,
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 50,
    };
  }

  async findById(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        client: true,
        project: true,
        system: true,
        deadline: true,
        pvcDeliveryDate: true,
        valuePln: true,
        valueEur: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
        invoiceNumber: true,
        deliveryDate: true,
        productionDate: true,
        glassDeliveryDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        requirements: {
          select: {
            id: true,
            profileId: true,
            colorId: true,
            beamsCount: true,
            meters: true,
            restMm: true,
            profile: {
              select: { id: true, number: true, name: true, description: true },
            },
            color: {
              select: { id: true, code: true, name: true, hexColor: true },
            },
          },
        },
        windows: {
          select: {
            id: true,
            widthMm: true,
            heightMm: true,
            profileType: true,
            quantity: true,
            reference: true,
          },
        },
        deliveryOrders: {
          select: {
            id: true,
            deliveryId: true,
            delivery: {
              select: { id: true, deliveryDate: true, deliveryNumber: true, status: true },
            },
          },
        },
        orderNotes: {
          select: { id: true, content: true, createdAt: true },
        },
        schucoLinks: {
          select: {
            id: true,
            linkedAt: true,
            linkedBy: true,
            schucoDelivery: {
              select: {
                id: true,
                orderNumber: true,
                orderName: true,
                shippingStatus: true,
                deliveryWeek: true,
                totalAmount: true,
                isWarehouseItem: true,
                orderDateParsed: true,
              },
            },
          },
          orderBy: { linkedAt: 'desc' },
        },
      },
    });
  }

  async findByOrderNumber(orderNumber: string) {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        client: true,
        project: true,
        system: true,
        deadline: true,
        pvcDeliveryDate: true,
        valuePln: true,
        valueEur: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
        invoiceNumber: true,
        deliveryDate: true,
        productionDate: true,
        glassDeliveryDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        requirements: {
          select: {
            id: true,
            profileId: true,
            colorId: true,
            beamsCount: true,
            meters: true,
            restMm: true,
            profile: {
              select: { id: true, number: true, name: true },
            },
            color: {
              select: { id: true, code: true, name: true, hexColor: true },
            },
          },
        },
        windows: {
          select: {
            id: true,
            widthMm: true,
            heightMm: true,
            profileType: true,
            quantity: true,
            reference: true,
          },
        },
      },
    });
  }

  async create(data: { orderNumber: string; status?: string; valuePln?: number; valueEur?: number }) {
    return this.prisma.order.create({
      data,
    });
  }

  async update(id: number, data: Prisma.OrderUpdateInput) {
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  async getOrderDeliveries(orderId: number) {
    const deliveryOrders = await this.prisma.deliveryOrder.findMany({
      where: { orderId },
      include: {
        delivery: {
          select: {
            id: true,
            status: true,
            deliveryDate: true,
            deliveryNumber: true,
          },
        },
      },
    });

    return deliveryOrders.map(d => d.delivery);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.order.delete({
      where: { id },
    });
  }

  async archive(id: number) {
    return this.prisma.order.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async unarchive(id: number) {
    return this.prisma.order.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async bulkUpdateStatus(
    orderIds: number[],
    status: string,
    productionDate?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.OrderUpdateInput = {
        status,
      };

      // If status is 'completed' and productionDate is provided, set it
      if (status === 'completed' && productionDate) {
        updateData.productionDate = new Date(productionDate);
      }

      // Update all orders
      await tx.order.updateMany({
        where: {
          id: { in: orderIds },
        },
        data: updateData,
      });

      // Fetch and return updated orders
      return tx.order.findMany({
        where: {
          id: { in: orderIds },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          productionDate: true,
          updatedAt: true,
        },
      });
    });
  }

  async findForProduction(where: Prisma.OrderWhereInput) {
    return this.prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        client: true,
        project: true,
        deadline: true,
        valuePln: true,
        valueEur: true,
        totalWindows: true,
        createdAt: true,
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async findPrivateOrders(where: Prisma.OrderWhereInput) {
    return this.prisma.order.findMany({
      where: {
        ...where,
        // Zlecenia prywatne = klient różny od AKROBUD (obie wersje encoding)
        client: {
          notIn: [
            'AKROBUD SOKOŁOWSKI SPÓŁKA KOMANDYTOWA',
            'AKROBUD SOKOŁOWSKI SPÓŁKA KOMANDYTOWA', // UTF-8 version
          ],
        },
        // Dodatkowo wykluczamy null/undefined
        NOT: {
          client: {
            contains: 'AKROBUD',
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        client: true,
        project: true,
        deadline: true,
        valuePln: true,
        valueEur: true,
        totalWindows: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUpcomingDeliveries(params: {
    deliveryDate: Prisma.DateTimeFilter;
    status: Prisma.StringFilter;
    limit: number;
  }) {
    return this.prisma.delivery.findMany({
      where: {
        deliveryDate: params.deliveryDate,
        status: params.status,
      },
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        deliveryOrders: {
          select: {
            id: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                client: true,
                project: true,
                totalWindows: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { deliveryDate: 'asc' },
      take: params.limit,
    });
  }

  /**
   * Find orders completed in a specific month/year
   * Optimized for monthly production reports
   */
  async findMonthlyProduction(year: number, month: number) {
    // Calculate month date range (month is 1-indexed: 1 = January)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.prisma.order.findMany({
      where: {
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
        archivedAt: null, // Exclude archived orders
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
        system: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
        valuePln: true,
        valueEur: true,
        invoiceNumber: true,
        completedAt: true,
        windows: {
          select: {
            id: true,
            reference: true,
            profileType: true,
          },
        },
        _count: {
          select: { windows: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }
}
