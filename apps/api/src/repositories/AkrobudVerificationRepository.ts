/**
 * Akrobud Verification Repository - Database access layer
 *
 * Warstwa dostępu do danych dla list weryfikacyjnych Akrobud
 */

import { PrismaClient, Prisma } from '@prisma/client';

export interface VerificationListFilters {
  deliveryDate?: Date;
  status?: string;
}

export interface CreateListData {
  deliveryDate: Date;
  deliveryId?: number | null;
  title?: string | null;
  notes?: string | null;
}

export interface UpdateListData {
  deliveryDate?: Date;
  deliveryId?: number | null;
  title?: string | null;
  notes?: string | null;
  status?: string;
}

export interface CreateItemData {
  listId: number;
  orderNumberInput: string;
  orderNumberBase?: string | null;
  orderNumberSuffix?: string | null;
  position: number;
}

export class AkrobudVerificationRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Tworzy nową listę weryfikacyjną
   */
  async create(data: CreateListData) {
    return this.prisma.akrobudVerificationList.create({
      data: {
        deliveryDate: data.deliveryDate,
        deliveryId: data.deliveryId ?? null,
        title: data.title ?? null,
        notes: data.notes ?? null,
        status: 'draft',
      },
      include: {
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
            deliveryDate: true,
          },
        },
        items: true,
      },
    });
  }

  /**
   * Znajduje listę po ID (z items i matched orders)
   */
  async findById(id: number) {
    return this.prisma.akrobudVerificationList.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
            deliveryDate: true,
            status: true,
            deliveryOrders: {
              select: {
                orderId: true,
                position: true,
                order: {
                  select: {
                    id: true,
                    orderNumber: true,
                    client: true,
                    project: true,
                  },
                },
              },
              orderBy: { position: 'asc' },
            },
          },
        },
        items: {
          orderBy: { position: 'asc' },
          include: {
            matchedOrder: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Znajduje listę dla danej daty (tylko nie usunięte)
   */
  async findByDeliveryDate(deliveryDate: Date) {
    // Szukaj listy dla danego dnia (bez czasu)
    const startOfDay = new Date(deliveryDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(deliveryDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.akrobudVerificationList.findFirst({
      where: {
        deliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
      include: {
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
          },
        },
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Pobiera wszystkie listy z filtrami
   */
  async findAll(filters: VerificationListFilters = {}) {
    const where: Prisma.AkrobudVerificationListWhereInput = {
      deletedAt: null,
    };

    if (filters.deliveryDate) {
      const startOfDay = new Date(filters.deliveryDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(filters.deliveryDate);
      endOfDay.setHours(23, 59, 59, 999);

      where.deliveryDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.akrobudVerificationList.findMany({
      where,
      include: {
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { deliveryDate: 'desc' },
    });
  }

  /**
   * Aktualizuje listę
   */
  async update(id: number, data: UpdateListData) {
    return this.prisma.akrobudVerificationList.update({
      where: { id },
      data: {
        ...(data.deliveryDate !== undefined && { deliveryDate: data.deliveryDate }),
        ...(data.deliveryId !== undefined && { deliveryId: data.deliveryId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
          },
        },
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Soft delete listy
   */
  async softDelete(id: number) {
    return this.prisma.akrobudVerificationList.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Dodaje elementy do listy (batch)
   * SQLite nie wspiera skipDuplicates - filtrujemy duplikaty ręcznie
   */
  async addItems(items: CreateItemData[]) {
    if (items.length === 0) {
      return { count: 0 };
    }

    // Pobierz listId z pierwszego elementu (wszystkie mają ten sam)
    const listId = items[0].listId;

    // Pobierz istniejące orderNumberInput dla tej listy
    const existing = await this.prisma.akrobudVerificationItem.findMany({
      where: { listId },
      select: { orderNumberInput: true },
    });
    const existingSet = new Set(existing.map((e) => e.orderNumberInput));

    // Filtruj tylko nowe elementy
    const newItems = items.filter((item) => !existingSet.has(item.orderNumberInput));

    if (newItems.length === 0) {
      return { count: 0 };
    }

    // Mapuj na format Prisma z domyślnymi wartościami
    const prismaData: Prisma.AkrobudVerificationItemCreateManyInput[] = newItems.map((item) => ({
      listId: item.listId,
      orderNumberInput: item.orderNumberInput,
      orderNumberBase: item.orderNumberBase ?? null,
      orderNumberSuffix: item.orderNumberSuffix ?? null,
      position: item.position,
      matchStatus: 'pending',
    }));

    return this.prisma.akrobudVerificationItem.createMany({
      data: prismaData,
    });
  }

  /**
   * Usuwa wszystkie elementy z listy
   */
  async clearItems(listId: number) {
    return this.prisma.akrobudVerificationItem.deleteMany({
      where: { listId },
    });
  }

  /**
   * Aktualizuje status dopasowania elementu
   */
  async updateItemMatch(
    itemId: number,
    matchStatus: string,
    matchedOrderId: number | null
  ) {
    return this.prisma.akrobudVerificationItem.update({
      where: { id: itemId },
      data: {
        matchStatus,
        matchedOrderId,
      },
    });
  }

  /**
   * Aktualizuje pozycję elementu
   */
  async updateItemPosition(itemId: number, position: number) {
    return this.prisma.akrobudVerificationItem.update({
      where: { id: itemId },
      data: { position },
    });
  }

  /**
   * Usuwa element z listy
   */
  async deleteItem(itemId: number) {
    return this.prisma.akrobudVerificationItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Pobiera elementy listy z dopasowanymi zleceniami
   */
  async getItemsWithOrders(listId: number) {
    return this.prisma.akrobudVerificationItem.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
      include: {
        matchedOrder: {
          select: {
            id: true,
            orderNumber: true,
            client: true,
            project: true,
            status: true,
            totalWindows: true,
            totalSashes: true,
          },
        },
      },
    });
  }

  /**
   * Łączy listę z dostawą
   */
  async linkToDelivery(listId: number, deliveryId: number) {
    return this.prisma.akrobudVerificationList.update({
      where: { id: listId },
      data: { deliveryId },
    });
  }

  /**
   * Batch update statusów dopasowania
   */
  async batchUpdateMatchStatus(
    updates: Array<{
      itemId: number;
      matchStatus: string;
      matchedOrderId: number | null;
    }>
  ) {
    const operations = updates.map((update) =>
      this.prisma.akrobudVerificationItem.update({
        where: { id: update.itemId },
        data: {
          matchStatus: update.matchStatus,
          matchedOrderId: update.matchedOrderId,
        },
      })
    );

    return this.prisma.$transaction(operations);
  }
}
