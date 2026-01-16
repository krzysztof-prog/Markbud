/**
 * Order Repository - Database access layer
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PaginationParams, PaginatedResponse } from '../validators/common';

export interface OrderFilters {
  status?: string;
  archived?: string;
  colorId?: string;
  documentAuthorUserId?: string;
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

    if (filters.documentAuthorUserId) {
      where.documentAuthorUserId = parseInt(filters.documentAuthorUserId);
    }

    // Run count and findMany in parallel using transaction
    // Optymalizacja: pojedyncza transakcja zamiast 2 sekwencyjnych zapytań
    const [total, rawData] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          client: true,
          project: true,
          system: true,
          documentAuthor: true,
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
          okucDemandStatus: true,
          createdAt: true,
          archivedAt: true,
          productionDate: true,
          // Usunięto pełną tablicę windows - używamy _count.windows dla list view
          // Redukcja danych o ~70%
          // Removed glassOrderItems - relation no longer exists (FK constraint removed)
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
        // Paginacja tylko gdy jawnie przekazana - domyślnie zwracamy wszystkie zlecenia
        ...(pagination?.skip !== undefined && { skip: pagination.skip }),
        ...(pagination?.take !== undefined && { take: pagination.take }),
      }),
    ]);

    // Use glassDeliveryDate from Order model directly
    const data = rawData.map(order => {
      return {
        ...order,
      };
    });

    return {
      data,
      total,
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? data.length,
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
        glasses: {
          select: {
            id: true,
            lp: true,
            position: true,
            widthMm: true,
            heightMm: true,
            quantity: true,
            packageType: true,
            areaSqm: true,
          },
          orderBy: { lp: 'asc' },
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
        // Usunięto pełną tablicę windows - używamy tylko _count.windows
        // Monthly report nie potrzebuje szczegółów okien, tylko liczbę
        _count: {
          select: { windows: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * Wyszukiwanie zleceń - zoptymalizowane dla GlobalSearch
   * Nie robi COUNT, zwraca tylko niezbędne pola, filtruje po stronie serwera
   * SQLite domyślnie robi case-insensitive dla LIKE (ASCII)
   */
  async search(query: string, includeArchived: boolean = true) {
    const where: Prisma.OrderWhereInput = {
      OR: [
        { orderNumber: { contains: query } },
        { client: { contains: query } },
        { project: { contains: query } },
        { system: { contains: query } },
        // Wyszukiwanie po referencjach okien
        { windows: { some: { reference: { contains: query } } } },
      ],
      // Opcjonalnie wyklucz zarchiwizowane
      ...(includeArchived ? {} : { archivedAt: null }),
    };

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
        valuePln: true,
        archivedAt: true,
        // Tylko referencje okien (do podświetlenia w wynikach)
        windows: {
          select: {
            reference: true,
          },
          where: {
            reference: { contains: query },
          },
          take: 3, // Max 3 pasujące referencje
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Max 50 wyników
    });
  }

  /**
   * Get completeness statistics for operator dashboard
   * Calculates how many orders (assigned to user) have:
   * - Files attached (schucoLinks)
   * - Glass ordered/delivered
   * - Hardware (okuc) complete (imported or none needed)
   * - Ready for production (all complete)
   *
   * @param userId - User ID to filter by (null = all orders)
   */
  async getCompletenessStats(userId: number | null) {
    const orders = await this.prisma.order.findMany({
      where: {
        ...(userId !== null ? { documentAuthorUserId: userId } : {}),
        archivedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
        glassOrderStatus: true,
        okucDemandStatus: true,
        schucoLinks: {
          select: { id: true },
        },
      },
    });

    const totalOrders = orders.length;

    // Files: zlecenie ma powiazanie ze Schuco (schucoLinks)
    const withFiles = orders.filter((o) => o.schucoLinks.length > 0).length;

    // Glass status: ordered lub delivered
    const withGlass = orders.filter(
      (o) => o.glassOrderStatus === 'ordered' || o.glassOrderStatus === 'delivered'
    ).length;

    // Okuc status: imported (zaimportowano) lub none (brak potrzeby)
    // has_atypical i pending = niekompletne
    const withHardware = orders.filter(
      (o) => o.okucDemandStatus === 'imported' || o.okucDemandStatus === 'none'
    ).length;

    // Ready for production: pliki + szyby delivered + okucia OK
    const readyForProduction = orders.filter(
      (o) =>
        o.schucoLinks.length > 0 &&
        o.glassOrderStatus === 'delivered' &&
        (o.okucDemandStatus === 'imported' || o.okucDemandStatus === 'none')
    ).length;

    return {
      totalOrders,
      withFiles,
      withGlass,
      withHardware,
      readyForProduction,
    };
  }

  /**
   * Pobiera sumy requirements zgrupowane po profileId i colorId
   * Używane w widoku totals dla zapotrzebowania
   */
  async getRequirementsTotals() {
    const requirements = await this.prisma.orderRequirement.findMany({
      select: {
        profileId: true,
        colorId: true,
        beamsCount: true,
        meters: true,
        profile: {
          select: { id: true, number: true, articleNumber: true },
        },
        color: {
          select: { id: true, code: true },
        },
      },
    });

    const totals: Record<
      string,
      {
        profileId: number;
        profileNumber: string;
        profileArticleNumber: string | null;
        colorId: number;
        colorCode: string;
        totalBeams: number;
        totalMeters: number;
      }
    > = {};

    for (const req of requirements) {
      const key = `${req.profileId}-${req.colorId}`;
      if (!totals[key]) {
        totals[key] = {
          profileId: req.profileId,
          profileNumber: req.profile.number,
          profileArticleNumber: req.profile.articleNumber,
          colorId: req.colorId,
          colorCode: req.color.code,
          totalBeams: 0,
          totalMeters: 0,
        };
      }
      totals[key].totalBeams += req.beamsCount;
      totals[key].totalMeters += req.meters;
    }

    return Object.values(totals);
  }
}
