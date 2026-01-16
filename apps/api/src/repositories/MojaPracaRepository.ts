import type { PrismaClient, Prisma } from '@prisma/client';

// Typ dla tworzenia konfliktu
export interface CreateConflictData {
  orderNumber: string;
  baseOrderNumber: string;
  suffix: string;
  baseOrderId: number;
  documentAuthor?: string | null;
  authorUserId?: number | null;
  filepath: string;
  filename: string;
  parsedData: string; // JSON string
  existingWindowsCount?: number | null;
  existingGlassCount?: number | null;
  newWindowsCount?: number | null;
  newGlassCount?: number | null;
  systemSuggestion?: string | null;
}

// Typ dla aktualizacji konfliktu przy rozwiązaniu
export interface ResolveConflictData {
  status: 'resolved' | 'cancelled';
  resolution: string;
  resolvedById: number;
  resolvedAt: Date;
}

export class MojaPracaRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // Konflikty
  // ============================================

  /**
   * Pobiera listę konfliktów dla użytkownika
   * Pokazuje konflikty przypisane do użytkownika ORAZ konflikty bez właściciela (authorUserId = null)
   */
  async getConflicts(userId: number, status: 'pending' | 'resolved' | 'all' = 'pending') {
    const where: Prisma.PendingImportConflictWhereInput = {
      // Pokaż konflikty użytkownika LUB konflikty bez właściciela
      OR: [
        { authorUserId: userId },
        { authorUserId: null },
      ],
    };

    if (status !== 'all') {
      where.status = status;
    }

    return this.prisma.pendingImportConflict.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        baseOrderNumber: true,
        suffix: true,
        documentAuthor: true,
        filename: true,
        existingWindowsCount: true,
        existingGlassCount: true,
        newWindowsCount: true,
        newGlassCount: true,
        systemSuggestion: true,
        status: true,
        createdAt: true,
      },
    });
  }

  /**
   * Pobiera szczegóły konfliktu z danymi bazowego zlecenia
   */
  async getConflictById(id: number) {
    return this.prisma.pendingImportConflict.findUnique({
      where: { id },
      include: {
        baseOrder: {
          select: {
            id: true,
            orderNumber: true,
            client: true,
            project: true,
            status: true,
            totalWindows: true,
            totalGlasses: true,
            createdAt: true,
          },
        },
        authorUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Zlicza konflikty dla użytkownika
   * Liczy konflikty przypisane do użytkownika ORAZ konflikty bez właściciela (authorUserId = null)
   */
  async countConflicts(userId: number): Promise<{ pending: number; total: number }> {
    const userOrUnassignedFilter = {
      OR: [
        { authorUserId: userId },
        { authorUserId: null },
      ],
    };

    const [pending, total] = await Promise.all([
      this.prisma.pendingImportConflict.count({
        where: { ...userOrUnassignedFilter, status: 'pending' },
      }),
      this.prisma.pendingImportConflict.count({
        where: userOrUnassignedFilter,
      }),
    ]);

    return { pending, total };
  }

  /**
   * Tworzy nowy konflikt
   */
  async createConflict(data: CreateConflictData) {
    return this.prisma.pendingImportConflict.create({
      data: {
        orderNumber: data.orderNumber,
        baseOrderNumber: data.baseOrderNumber,
        suffix: data.suffix,
        baseOrderId: data.baseOrderId,
        documentAuthor: data.documentAuthor,
        authorUserId: data.authorUserId,
        filepath: data.filepath,
        filename: data.filename,
        parsedData: data.parsedData,
        existingWindowsCount: data.existingWindowsCount,
        existingGlassCount: data.existingGlassCount,
        newWindowsCount: data.newWindowsCount,
        newGlassCount: data.newGlassCount,
        systemSuggestion: data.systemSuggestion,
        status: 'pending',
      },
    });
  }

  /**
   * Aktualizuje konflikt po rozwiązaniu
   */
  async resolveConflict(id: number, data: ResolveConflictData) {
    return this.prisma.pendingImportConflict.update({
      where: { id },
      data: {
        status: data.status,
        resolution: data.resolution,
        resolvedById: data.resolvedById,
        resolvedAt: data.resolvedAt,
      },
    });
  }

  /**
   * Sprawdza czy konflikt istnieje dla danego pliku
   */
  async findConflictByFilepath(filepath: string) {
    return this.prisma.pendingImportConflict.findFirst({
      where: {
        filepath: { contains: filepath },
        status: 'pending',
      },
    });
  }

  // ============================================
  // Zlecenia użytkownika
  // ============================================

  /**
   * Pobiera zlecenia użytkownika z danego dnia (na podstawie createdAt)
   */
  async getOrdersForUserByDate(userId: number, date: Date) {
    // Oblicz początek i koniec dnia
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.order.findMany({
      where: {
        documentAuthorUserId: userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        archivedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
        status: true,
        totalWindows: true,
        totalGlasses: true,
        valuePln: true,
        valueEur: true,
        createdAt: true,
      },
    });
  }

  // ============================================
  // Dostawy z kalendakiem
  // ============================================

  /**
   * Pobiera dostawy zawierające zlecenia użytkownika
   */
  async getDeliveriesForUserByDate(userId: number, date: Date) {
    // Oblicz początek i koniec dnia
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
        // Ma przynajmniej jedno zlecenie użytkownika
        deliveryOrders: {
          some: {
            order: {
              documentAuthorUserId: userId,
              archivedAt: null,
            },
          },
        },
      },
      orderBy: { deliveryDate: 'asc' },
      include: {
        deliveryOrders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                status: true,
                totalWindows: true,
                documentAuthorUserId: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  // ============================================
  // Zamówienia szyb
  // ============================================

  /**
   * Pobiera zamówienia szyb dla zleceń użytkownika (z danego dnia)
   */
  async getGlassOrdersForUserByDate(userId: number, date: Date) {
    // Oblicz początek i koniec dnia
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Pobierz zamówienia szyb z pozycjami dla zleceń użytkownika
    return this.prisma.glassOrder.findMany({
      where: {
        orderDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
        // Pozycje z numerami zleceń użytkownika
        items: {
          some: {
            orderNumber: {
              in: await this.prisma.order
                .findMany({
                  where: {
                    documentAuthorUserId: userId,
                    archivedAt: null,
                  },
                  select: { orderNumber: true },
                })
                .then((orders) => orders.map((o) => o.orderNumber)),
            },
          },
        },
      },
      include: {
        items: {
          select: {
            id: true,
            orderNumber: true,
            position: true,
            glassType: true,
            widthMm: true,
            heightMm: true,
            quantity: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  /**
   * Uproszczona wersja - pobiera zamówienia szyb z danego dnia
   * z pozycjami pasującymi do zleceń użytkownika
   */
  async getGlassOrdersSimple(userId: number, date: Date) {
    // Oblicz początek i koniec dnia
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Najpierw pobierz numery zleceń użytkownika
    const userOrders = await this.prisma.order.findMany({
      where: {
        documentAuthorUserId: userId,
        archivedAt: null,
      },
      select: { orderNumber: true },
    });

    const userOrderNumbers = userOrders.map((o) => o.orderNumber);

    if (userOrderNumbers.length === 0) {
      return [];
    }

    // Pobierz zamówienia szyb z pozycjami
    return this.prisma.glassOrder.findMany({
      where: {
        orderDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
      include: {
        items: {
          where: {
            orderNumber: { in: userOrderNumbers },
          },
          select: {
            id: true,
            orderNumber: true,
            position: true,
            glassType: true,
            widthMm: true,
            heightMm: true,
            quantity: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    });
  }
}
