/**
 * Repository dla modułu logistyki - dostęp do bazy danych
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Typy dla tworzenia listy mailowej
export interface CreateMailListData {
  deliveryDate: Date;
  deliveryIndex: number;
  deliveryCode: string;
  version: number;
  isUpdate: boolean;
  rawMailText: string;
}

// Typy dla tworzenia pozycji
export interface CreateMailItemData {
  mailListId: number;
  position: number;
  projectNumber: string;
  quantity: number;
  rawNotes?: string;
  requiresMesh: boolean;
  missingFile: boolean;
  unconfirmed: boolean;
  dimensionsUnconfirmed: boolean;
  drawingUnconfirmed: boolean;
  excludeFromProduction: boolean;
  specialHandle: boolean;
  customColor?: string;
  orderId?: number;
  itemStatus: 'ok' | 'blocked' | 'waiting' | 'excluded';
}

// Filtry dla list
export interface MailListFilters {
  deliveryCode?: string;
  deliveryDateFrom?: Date;
  deliveryDateTo?: Date;
  includeDeleted?: boolean;
}

export class LogisticsRepository {
  /**
   * Tworzy nową listę mailową
   */
  async createMailList(data: CreateMailListData) {
    return prisma.logisticsMailList.create({
      data: {
        deliveryDate: data.deliveryDate,
        deliveryIndex: data.deliveryIndex,
        deliveryCode: data.deliveryCode,
        version: data.version,
        isUpdate: data.isUpdate,
        rawMailText: data.rawMailText,
      },
    });
  }

  /**
   * Tworzy wiele pozycji dla listy mailowej
   */
  async createMailItems(items: CreateMailItemData[]) {
    return prisma.logisticsMailItem.createMany({
      data: items,
    });
  }

  /**
   * Tworzy listę mailową wraz z pozycjami (transakcja)
   */
  async createMailListWithItems(
    listData: CreateMailListData,
    itemsData: Omit<CreateMailItemData, 'mailListId'>[]
  ) {
    return prisma.$transaction(async (tx) => {
      // Utwórz listę
      const mailList = await tx.logisticsMailList.create({
        data: {
          deliveryDate: listData.deliveryDate,
          deliveryIndex: listData.deliveryIndex,
          deliveryCode: listData.deliveryCode,
          version: listData.version,
          isUpdate: listData.isUpdate,
          rawMailText: listData.rawMailText,
        },
      });

      // Utwórz pozycje
      if (itemsData.length > 0) {
        await tx.logisticsMailItem.createMany({
          data: itemsData.map((item) => ({
            ...item,
            mailListId: mailList.id,
          })),
        });
      }

      // Pobierz pełną listę z pozycjami
      return tx.logisticsMailList.findUnique({
        where: { id: mailList.id },
        include: {
          items: {
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  client: true,
                  project: true,
                  status: true,
                },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Pobiera listę mailową po ID
   */
  async getMailListById(id: number) {
    return prisma.logisticsMailList.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                status: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Pobiera najnowszą wersję listy dla danego kodu dostawy
   */
  async getLatestVersionByDeliveryCode(deliveryCode: string) {
    return prisma.logisticsMailList.findFirst({
      where: {
        deliveryCode,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
      include: {
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                status: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Pobiera wszystkie wersje dla danego kodu dostawy
   */
  async getAllVersionsByDeliveryCode(deliveryCode: string) {
    return prisma.logisticsMailList.findMany({
      where: {
        deliveryCode,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { items: true },
        },
      },
    });
  }

  /**
   * Pobiera najwyższy numer wersji dla danego kodu dostawy
   */
  async getMaxVersionByDeliveryCode(deliveryCode: string): Promise<number> {
    const result = await prisma.logisticsMailList.aggregate({
      where: { deliveryCode },
      _max: { version: true },
    });
    return result._max.version || 0;
  }

  /**
   * Pobiera listy mailowe z filtrami
   */
  async getMailLists(filters: MailListFilters = {}) {
    const where: Prisma.LogisticsMailListWhereInput = {};

    if (filters.deliveryCode) {
      where.deliveryCode = filters.deliveryCode;
    }

    if (filters.deliveryDateFrom || filters.deliveryDateTo) {
      where.deliveryDate = {};
      if (filters.deliveryDateFrom) {
        where.deliveryDate.gte = filters.deliveryDateFrom;
      }
      if (filters.deliveryDateTo) {
        where.deliveryDate.lte = filters.deliveryDateTo;
      }
    }

    if (!filters.includeDeleted) {
      where.deletedAt = null;
    }

    return prisma.logisticsMailList.findMany({
      where,
      orderBy: [{ deliveryDate: 'asc' }, { deliveryIndex: 'asc' }, { version: 'desc' }],
      include: {
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                status: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { items: true },
        },
      },
    });
  }

  /**
   * Pobiera kalendarz dostaw (pogrupowane po datach)
   */
  async getDeliveryCalendar(dateFrom: Date, dateTo: Date) {
    // Pobierz najnowsze wersje dla każdego kodu dostawy
    const lists = await prisma.logisticsMailList.findMany({
      where: {
        deliveryDate: {
          gte: dateFrom,
          lte: dateTo,
        },
        deletedAt: null,
      },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryIndex: 'asc' }],
      include: {
        items: {
          select: {
            itemStatus: true,
            projectNumber: true,
            rawNotes: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    // Grupuj po deliveryCode i weź najnowszą wersję
    const latestVersions = new Map<
      string,
      (typeof lists)[0]
    >();

    for (const list of lists) {
      const existing = latestVersions.get(list.deliveryCode);
      if (!existing || list.version > existing.version) {
        latestVersions.set(list.deliveryCode, list);
      }
    }

    return Array.from(latestVersions.values());
  }

  /**
   * Soft delete listy mailowej
   */
  async softDeleteMailList(id: number) {
    return prisma.logisticsMailList.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Szuka Order po numerze projektu (orderNumber)
   */
  async findOrderByProjectNumber(projectNumber: string) {
    return prisma.order.findFirst({
      where: {
        orderNumber: projectNumber,
        archivedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
        status: true,
      },
    });
  }

  /**
   * Szuka wielu Orders po numerach projektów
   */
  async findOrdersByProjectNumbers(projectNumbers: string[]) {
    return prisma.order.findMany({
      where: {
        orderNumber: {
          in: projectNumbers,
        },
        archivedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
        status: true,
      },
    });
  }

  /**
   * Aktualizuje pozycję mailową (np. zmiana orderId po ręcznym przypisaniu)
   */
  async updateMailItem(
    id: number,
    data: Partial<{
      orderId: number | null;
      itemStatus: string;
      requiresMesh: boolean;
      missingFile: boolean;
      unconfirmed: boolean;
      dimensionsUnconfirmed: boolean;
      drawingUnconfirmed: boolean;
      excludeFromProduction: boolean;
      specialHandle: boolean;
      customColor: string | null;
    }>
  ) {
    return prisma.logisticsMailItem.update({
      where: { id },
      data,
    });
  }
}

export const logisticsRepository = new LogisticsRepository();
