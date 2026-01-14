/**
 * Delivery Repository - Database access layer
 *
 * Odpowiedzialność:
 * - TYLKO operacje na bazie danych (CRUD)
 * - Proste zapytania findById, findMany, create, update, delete
 * - Operacje na relacjach DeliveryOrder, DeliveryItem
 *
 * UWAGA: Logika biznesowa (święta, dni robocze, kalendarz) została przeniesiona do:
 * - CalendarService (apps/api/src/services/calendar/CalendarService.ts)
 * - EasterCalculator (apps/api/src/services/calendar/utils/EasterCalculator.ts)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PaginationParams, PaginatedResponse } from '../validators/common.js';

export interface DeliveryFilters {
  from?: Date;
  to?: Date;
  status?: string;
}

export class DeliveryRepository {
  constructor(private prisma: PrismaClient) {}

  // ===================
  // Basic CRUD Operations
  // ===================

  async findAll(filters: DeliveryFilters = {}, pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    const where: Prisma.DeliveryWhereInput = {};

    // Exclude soft-deleted deliveries
    where.deletedAt = null;

    if (filters.from || filters.to) {
      where.deliveryDate = {};
      if (filters.from) where.deliveryDate.gte = filters.from;
      if (filters.to) where.deliveryDate.lte = filters.to;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Execute count and findMany in parallel using transaction
    const [total, rawData] = await this.prisma.$transaction([
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        where,
        select: {
          id: true,
          deliveryDate: true,
          deliveryNumber: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          deliveryOrders: {
            select: {
              deliveryId: true,
              orderId: true,
              position: true,
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  valuePln: true,
                  valueEur: true,
                  totalWindows: true,
                  totalSashes: true,
                  totalGlasses: true,
                  windows: {
                    select: {
                      reference: true,
                    },
                    // Removed distinct - causes full table scan in SQLite
                    // Deduplication done in application layer below
                  },
                },
              },
            },
            orderBy: { position: 'asc' },
          },
          _count: {
            select: { deliveryOrders: true },
          },
        },
        orderBy: { deliveryDate: 'asc' },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 50,
      }),
    ]);

    // Deduplicate windows references in application layer (faster than SQLite distinct)
    const data = rawData.map((delivery) => ({
      ...delivery,
      deliveryOrders: delivery.deliveryOrders.map((deliveryOrder) => ({
        ...deliveryOrder,
        order: {
          ...deliveryOrder.order,
          windows: deliveryOrder.order.windows.filter(
            (window, index, self) =>
              index === self.findIndex((w) => w.reference === window.reference)
          ),
        },
      })),
    }));

    return {
      data,
      total,
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 50,
    };
  }

  async findById(id: number) {
    return this.prisma.delivery.findUnique({
      where: { id },
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        deliveryOrders: {
          select: {
            deliveryId: true,
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                valueEur: true,
                status: true,
                windows: {
                  select: {
                    id: true,
                    widthMm: true,
                    heightMm: true,
                    quantity: true,
                  },
                },
                requirements: {
                  select: {
                    id: true,
                    profileId: true,
                    colorId: true,
                    beamsCount: true,
                    meters: true,
                    profile: {
                      select: { id: true, number: true, name: true },
                    },
                    color: {
                      select: { id: true, code: true, name: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        deliveryItems: {
          select: {
            id: true,
            deliveryId: true,
            itemType: true,
            description: true,
            quantity: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async create(data: { deliveryDate: Date; deliveryNumber?: string; notes?: string }) {
    return this.prisma.delivery.create({
      data,
    });
  }

  async update(id: number, data: { deliveryDate?: Date; status?: string; notes?: string }) {
    return this.prisma.delivery.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    // P1-1: Soft delete with cascade - unlink orders before soft deleting delivery
    // This prevents "orphaned" orders that are still linked to a deleted delivery
    await this.prisma.$transaction(async (tx) => {
      // First, delete all DeliveryOrder links (unlink orders from delivery)
      await tx.deliveryOrder.deleteMany({
        where: { deliveryId: id },
      });

      // Then soft delete the delivery
      await tx.delivery.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  // ===================
  // DeliveryOrder Operations
  // ===================

  async addOrderToDelivery(deliveryId: number, orderId: number, position: number) {
    return this.prisma.deliveryOrder.create({
      data: {
        deliveryId,
        orderId,
        position,
      },
      select: {
        deliveryId: true,
        orderId: true,
        position: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            valuePln: true,
          },
        },
      },
    });
  }

  async addOrderToDeliveryAtomic(deliveryId: number, orderId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Get max position atomically within transaction
      const result = await tx.deliveryOrder.aggregate({
        where: { deliveryId },
        _max: { position: true },
      });
      const maxPosition = result._max.position || 0;

      // Create delivery order with incremented position
      return tx.deliveryOrder.create({
        data: {
          deliveryId,
          orderId,
          position: maxPosition + 1,
        },
        select: {
          deliveryId: true,
          orderId: true,
          position: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              valuePln: true,
            },
          },
        },
      });
    });
  }

  async removeOrderFromDelivery(deliveryId: number, orderId: number): Promise<void> {
    await this.prisma.deliveryOrder.delete({
      where: {
        deliveryId_orderId: {
          deliveryId,
          orderId,
        },
      },
    });
  }

  async getMaxOrderPosition(deliveryId: number): Promise<number> {
    const result = await this.prisma.deliveryOrder.aggregate({
      where: { deliveryId },
      _max: { position: true },
    });
    return result._max.position || 0;
  }

  async reorderDeliveryOrders(deliveryId: number, orderIds: number[]): Promise<void> {
    const updates = orderIds.map((orderId, index) =>
      this.prisma.deliveryOrder.update({
        where: {
          deliveryId_orderId: {
            deliveryId,
            orderId,
          },
        },
        data: { position: index + 1 },
      })
    );

    await this.prisma.$transaction(updates);
  }

  async moveOrderBetweenDeliveries(
    sourceDeliveryId: number,
    targetDeliveryId: number,
    orderId: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Remove from source delivery
      await tx.deliveryOrder.delete({
        where: {
          deliveryId_orderId: {
            deliveryId: sourceDeliveryId,
            orderId,
          },
        },
      });

      // Get max position in target delivery
      const result = await tx.deliveryOrder.aggregate({
        where: { deliveryId: targetDeliveryId },
        _max: { position: true },
      });
      const maxPosition = result._max.position || 0;

      // Add to target delivery with incremented position
      return tx.deliveryOrder.create({
        data: {
          deliveryId: targetDeliveryId,
          orderId,
          position: maxPosition + 1,
        },
        select: {
          deliveryId: true,
          orderId: true,
          position: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              valuePln: true,
            },
          },
        },
      });
    });
  }

  // ===================
  // DeliveryItem Operations
  // ===================

  async addItem(deliveryId: number, data: { itemType: string; description: string; quantity: number }) {
    return this.prisma.deliveryItem.create({
      data: {
        deliveryId,
        ...data,
      },
    });
  }

  async removeItem(itemId: number): Promise<void> {
    await this.prisma.deliveryItem.delete({
      where: { id: itemId },
    });
  }

  // ===================
  // Query Methods (for Services)
  // ===================

  async getDeliveryOrders(deliveryId: number) {
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        deliveryOrders: {
          select: {
            orderId: true,
          },
        },
      },
    });
  }

  async updateOrdersBatch(orderIds: number[], data: { productionDate: Date; status: string }) {
    return this.prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data,
    });
  }

  /**
   * Get calendar data for a specific month/year
   * Zwraca dostawy i nieprzypisane zlecenia dla widoku kalendarza
   */
  async getCalendarData(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        deletedAt: null, // Exclude soft-deleted deliveries
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        deliveryOrders: {
          select: {
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalWindows: true,
                totalSashes: true,
                totalGlasses: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        deliveryItems: {
          select: {
            id: true,
            itemType: true,
            description: true,
            quantity: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });

    // Pobierz zlecenia bez aktywnej dostawy
    // (wykluczamy zlecenia przypisane do soft-deleted dostaw)
    const unassignedOrders = await this.prisma.order.findMany({
      where: {
        archivedAt: null,
        status: { notIn: ['archived'] },
        OR: [
          // Zlecenia bez żadnych powiązań
          {
            deliveryOrders: {
              none: {},
            },
          },
          // Zlecenia przypisane tylko do soft-deleted dostaw
          {
            deliveryOrders: {
              every: {
                delivery: {
                  deletedAt: { not: null },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryDate: true,
        totalWindows: true,
        totalSashes: true,
        totalGlasses: true,
      },
      orderBy: { orderNumber: 'asc' },
    });

    return { deliveries, unassignedOrders };
  }

  /**
   * Get deliveries with profile requirements
   */
  async getDeliveriesWithRequirements(fromDate?: Date) {
    const whereCondition: Prisma.DeliveryWhereInput = {
      deletedAt: null, // Exclude soft-deleted deliveries
    };
    if (fromDate) {
      whereCondition.deliveryDate = { gte: fromDate };
    }

    return this.prisma.delivery.findMany({
      where: whereCondition,
      select: {
        id: true,
        deliveryDate: true,
        status: true,
        deliveryOrders: {
          select: {
            id: true,
            orderId: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                requirements: {
                  select: {
                    id: true,
                    profileId: true,
                    colorId: true,
                    beamsCount: true,
                    meters: true,
                    restMm: true,
                    color: {
                      select: { id: true, code: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get deliveries with order windows for stats
   */
  async getDeliveriesWithWindows(startDate: Date, endDate?: Date) {
    const where: Prisma.DeliveryWhereInput = {
      deletedAt: null, // Exclude soft-deleted deliveries
      deliveryDate: endDate ? { gte: startDate, lte: endDate } : { gte: startDate },
    };

    return this.prisma.delivery.findMany({
      where,
      select: {
        id: true,
        deliveryDate: true,
        status: true,
        deliveryOrders: {
          select: {
            id: true,
            orderId: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalWindows: true,
                totalSashes: true,
                totalGlasses: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get deliveries with profile requirements for stats
   */
  async getDeliveriesWithProfileStats(startDate: Date, endDate: Date) {
    return this.prisma.delivery.findMany({
      where: {
        deletedAt: null, // Exclude soft-deleted deliveries
        deliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        deliveryDate: true,
        status: true,
        deliveryOrders: {
          select: {
            id: true,
            orderId: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
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
                      select: { id: true, code: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get delivery for protocol generation
   */
  async getDeliveryForProtocol(deliveryId: number) {
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        deliveryDate: true,
        deliveryOrders: {
          select: {
            orderId: true,
            position: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                valuePln: true,
                windows: {
                  select: {
                    id: true,
                    quantity: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Get working days for a specific month/year
   * Pobiera z bazy danych (override dni roboczych)
   */
  async getWorkingDays(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.prisma.workingDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }
}
