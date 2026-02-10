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
                deliveryDate: true, // Potrzebne do walidacji zgodności dat
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
   * Include'uje dane zleceń dla każdej pozycji (potrzebne do diff)
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
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                deliveryDate: true, // Potrzebne do walidacji daty w diff
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
   * Szuka Order po numerze projektu (pole project) - case-insensitive
   * SQLite: używamy UPPER() w raw query
   * UWAGA: Szukamy po polu `project` (np. "D3995"), NIE po `order_number` (np. "53642")
   */
  async findOrderByProjectNumber(projectNumber: string) {
    const upperProjectNumber = projectNumber.toUpperCase();

    // SQLite raw query z UPPER() dla case-insensitive
    // Szukamy po polu `project` które zawiera numer projektu typu D3995
    const orders = await prisma.$queryRaw<
      { id: number; orderNumber: string; client: string | null; project: string | null; status: string | null }[]
    >`
      SELECT id, order_number as orderNumber, client, project, status
      FROM orders
      WHERE UPPER(project) = ${upperProjectNumber}
        AND archived_at IS NULL
      LIMIT 1
    `;

    return orders[0] || null;
  }

  /**
   * Szuka wielu Orders po numerach projektów (pole project) - case-insensitive
   * SQLite: używamy UPPER() w raw query
   * UWAGA: Szukamy po polu `project` (np. "D3995"), NIE po `order_number` (np. "53642")
   *
   * WAŻNE: Pole project może zawierać wiele projektów oddzielonych przecinkami,
   * np. "D6015, D6286, D6387" - dlatego używamy LIKE z % zamiast dokładnego IN
   */
  async findOrdersByProjectNumbers(projectNumbers: string[]) {
    if (projectNumbers.length === 0) {
      return [];
    }

    // Normalizuj do uppercase dla porównania
    const upperProjectNumbers = projectNumbers.map((pn) => pn.toUpperCase());

    // SQLite raw query z UPPER() dla case-insensitive
    // Używamy LIKE zamiast IN, bo pole project może zawierać wiele projektów
    // np. "D6015, D6286, D6387" - szukamy czy projekt jest CZĘŚCIĄ pola
    // Budujemy: (UPPER(project) LIKE '%D6015%' OR UPPER(project) LIKE '%D6286%' ...)
    const likeConditions = upperProjectNumbers.map(() => `UPPER(project) LIKE ?`).join(' OR ');
    const likeParams = upperProjectNumbers.map((pn) => `%${pn}%`);

    const orders = await prisma.$queryRawUnsafe<
      { id: number; orderNumber: string; client: string | null; project: string | null; status: string | null; deliveryDate: string | null }[]
    >(
      `
      SELECT id, order_number as orderNumber, client, project, status, delivery_date as deliveryDate
      FROM orders
      WHERE (${likeConditions})
        AND archived_at IS NULL
    `,
      ...likeParams
    );

    return orders;
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

  /**
   * Aktualizuje ilość pozycji mailowej
   */
  async updateMailItemQuantity(id: number, quantity: number) {
    return prisma.logisticsMailItem.update({
      where: { id },
      data: { quantity },
    });
  }

  /**
   * Pobiera pojedynczą pozycję mailową po ID
   */
  async getMailItemById(id: number) {
    return prisma.logisticsMailItem.findUnique({
      where: { id },
      select: {
        id: true,
        projectNumber: true,
        quantity: true,
        itemStatus: true,
        rawNotes: true,
      },
    });
  }

  /**
   * Soft delete pozycji mailowej
   */
  async softDeleteMailItem(id: number) {
    return prisma.logisticsMailItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Oznacza pozycję jako potwierdzoną (decyzja użytkownika)
   * Ustawia confirmedAt na aktualną datę
   */
  async markItemAsConfirmed(id: number) {
    return prisma.logisticsMailItem.update({
      where: { id },
      data: { confirmedAt: new Date() },
    });
  }

  // ========== DECISION LOGS (AUDYT) ==========

  /**
   * Tworzy log decyzji użytkownika
   * Zapisuje kto, kiedy, co zrobił - dla audytu i rozstrzygania sporów
   */
  async createDecisionLog(data: {
    entityType: 'item' | 'delivery';
    entityId: number;
    action: string;
    fromVersion?: number;
    toVersion?: number;
    metadata?: Record<string, unknown>;
    userId: number;
    mailItemId?: number;
  }) {
    return prisma.logisticsDecisionLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        fromVersion: data.fromVersion,
        toVersion: data.toVersion,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        userId: data.userId,
        mailItemId: data.mailItemId,
      },
    });
  }

  /**
   * Pobiera logi decyzji dla pozycji
   */
  async getDecisionLogsForItem(itemId: number) {
    return prisma.logisticsDecisionLog.findMany({
      where: {
        entityType: 'item',
        entityId: itemId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Pobiera logi decyzji dla dostawy (deliveryCode)
   */
  async getDecisionLogsForDelivery(deliveryCode: string) {
    // Najpierw pobierz wszystkie listy dla tego kodu
    const lists = await prisma.logisticsMailList.findMany({
      where: { deliveryCode },
      select: { id: true },
    });

    const listIds = lists.map((l) => l.id);

    return prisma.logisticsDecisionLog.findMany({
      where: {
        OR: [
          // Logi dla samych list
          { entityType: 'delivery', entityId: { in: listIds } },
          // Logi dla pozycji w tych listach
          {
            entityType: 'item',
            mailItem: {
              mailListId: { in: listIds },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        mailItem: {
          select: { id: true, projectNumber: true },
        },
      },
    });
  }
}

export const logisticsRepository = new LogisticsRepository();
