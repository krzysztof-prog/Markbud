/**
 * Order Repository - Database access layer
 */

import { PrismaClient, Prisma } from '@prisma/client';

export interface OrderFilters {
  status?: string;
  archived?: string;
  colorId?: string;
}

export class OrderRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters: OrderFilters = {}) {
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

    return this.prisma.order.findMany({
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
        _count: {
          select: { windows: true, requirements: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
}
