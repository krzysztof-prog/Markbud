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
   * Tworzy nowy konflikt lub aktualizuje istniejący jeśli już jest pending dla tego zlecenia
   * Zapobiega tworzeniu duplikatów konfliktów
   */
  async createConflict(data: CreateConflictData) {
    // Sprawdź czy już istnieje pending konflikt dla tego zlecenia
    const existingConflict = await this.prisma.pendingImportConflict.findFirst({
      where: {
        orderNumber: data.orderNumber,
        baseOrderNumber: data.baseOrderNumber,
        status: 'pending',
      },
    });

    if (existingConflict) {
      // Konflikt już istnieje - zaktualizuj dane z najnowszego pliku
      return this.prisma.pendingImportConflict.update({
        where: { id: existingConflict.id },
        data: {
          filepath: data.filepath,
          filename: data.filename,
          parsedData: data.parsedData,
          existingWindowsCount: data.existingWindowsCount,
          existingGlassCount: data.existingGlassCount,
          newWindowsCount: data.newWindowsCount,
          newGlassCount: data.newGlassCount,
          systemSuggestion: data.systemSuggestion,
        },
      });
    }

    // Brak istniejącego konfliktu - utwórz nowy
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

  // ============================================
  // Alerty - Zlecenia Akrobud bez cen
  // ============================================

  /**
   * Pobiera zlecenia Akrobud które są w produkcji ale nie mają cen (valueEur = 0 lub null)
   * "W produkcji" = zlecenie przypisane do dostawy ze statusem 'in_progress'
   * Dla admina/kierownika - wszystkie takie zlecenia
   * Dla zwykłego użytkownika - tylko jego zlecenia (documentAuthorUserId)
   */
  async getAkrobudOrdersInProductionWithoutPrice(
    userId: number,
    isAdminOrKierownik: boolean
  ) {
    // Warunek bazowy: Akrobud, w produkcji (przypisane do dostawy in_progress), bez ceny
    // SQLite nie obsługuje mode: 'insensitive', więc szukamy AKROBUD (wielkie litery jak w bazie)
    const baseWhere: Prisma.OrderWhereInput = {
      client: { contains: 'AKROBUD' },
      completedAt: null,
      archivedAt: null,
      // "W produkcji" = zlecenie przypisane do dostawy ze statusem 'in_progress'
      deliveryOrders: {
        some: {
          delivery: {
            status: 'in_progress',
            deletedAt: null,
          },
        },
      },
      OR: [
        { valueEur: null },
        { valueEur: 0 },
      ],
    };

    // Dla admina/kierownika - wszystkie zlecenia
    // Dla zwykłego użytkownika - tylko jego zlecenia
    const where = isAdminOrKierownik
      ? baseWhere
      : { ...baseWhere, documentAuthorUserId: userId };

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
        productionDate: true,
        documentAuthor: true,
        documentAuthorUserId: true,
        valueEur: true,
        totalWindows: true,
      },
    });
  }

  // ============================================
  // Alerty - Dostawy z problemami etykiet
  // ============================================

  /**
   * Pobiera 5 najbliższych dostaw (od ostatniej wyprodukowanej) które mają problemy z etykietami
   * Problemy: brak kontroli etykiet, błędne etykiety (mismatchCount > 0), błędy OCR
   */
  async getUpcomingDeliveriesWithLabelIssues(
    userId: number,
    isAdminOrKierownik: boolean
  ) {
    // Znajdź ostatnią wyprodukowaną lub w produkcji dostawę
    const lastProductionDelivery = await this.prisma.delivery.findFirst({
      where: {
        status: { in: ['completed', 'in_progress'] },
        deletedAt: null,
        deliveryOrders: { some: {} },
      },
      orderBy: { deliveryDate: 'desc' },
      select: { deliveryDate: true },
    });

    // Punkt startowy - ostatnia data produkcji lub dzisiaj
    const startDate = lastProductionDelivery?.deliveryDate || new Date();

    // Znajdź 5 najbliższych dostaw PO tej dacie które NIE są jeszcze w produkcji ani ukończone
    // Używamy gt (greater than) aby nie uwzględniać dostawy która jest już w produkcji
    const upcomingDeliveries = await this.prisma.delivery.findMany({
      where: {
        deliveryDate: { gt: startDate },
        status: { notIn: ['completed', 'in_progress'] },
        deletedAt: null,
        deliveryOrders: { some: {} },
        // Dla zwykłego użytkownika - tylko dostawy z jego zleceniami
        ...(isAdminOrKierownik
          ? {}
          : {
              deliveryOrders: {
                some: {
                  order: {
                    documentAuthorUserId: userId,
                    archivedAt: null,
                  },
                },
              },
            }),
      },
      orderBy: { deliveryDate: 'asc' },
      take: 5,
      include: {
        deliveryOrders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                documentAuthor: true,
                documentAuthorUserId: true,
              },
            },
          },
        },
        labelChecks: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            results: true,
          },
        },
      },
    });

    // Filtruj dostawy z problemami etykiet
    const deliveriesWithIssues = upcomingDeliveries
      .map((delivery) => {
        const latestCheck = delivery.labelChecks[0];

        // Zlicz zlecenia Akrobud w dostawie
        const akrobudOrders = delivery.deliveryOrders.filter((dOrder) =>
          dOrder.order.client?.toLowerCase().includes('akrobud')
        );

        // Jeśli nie ma zleceń Akrobud - pomiń tę dostawę
        if (akrobudOrders.length === 0) {
          return null;
        }

        // Problemy z etykietami - zbieraj szczegóły z numerami zleceń
        const issues: string[] = [];
        let hasIssues = false;

        if (!latestCheck) {
          // Brak kontroli etykiet
          issues.push('Brak kontroli etykiet');
          hasIssues = true;
        } else if (latestCheck.status === 'failed') {
          issues.push('Kontrola zakończona błędem');
          hasIssues = true;
        } else {
          // Sprawdź wyniki - zbieraj numery zleceń z problemami
          const mismatchOrders = latestCheck.results
            .filter((r) => r.status === 'MISMATCH')
            .map((r) => r.orderNumber);
          const errorOrders = latestCheck.results
            .filter((r) => r.status === 'ERROR')
            .map((r) => r.orderNumber);
          const noFolderOrders = latestCheck.results
            .filter((r) => r.status === 'NO_FOLDER')
            .map((r) => r.orderNumber);
          const noBmpOrders = latestCheck.results
            .filter((r) => r.status === 'NO_BMP')
            .map((r) => r.orderNumber);

          if (mismatchOrders.length > 0) {
            issues.push(`Błędne daty: ${mismatchOrders.join(', ')}`);
            hasIssues = true;
          }
          if (errorOrders.length > 0) {
            issues.push(`Błędy OCR: ${errorOrders.join(', ')}`);
            hasIssues = true;
          }
          if (noFolderOrders.length > 0) {
            issues.push(`Brak folderów: ${noFolderOrders.join(', ')}`);
            hasIssues = true;
          }
          if (noBmpOrders.length > 0) {
            issues.push(`Brak etykiet BMP: ${noBmpOrders.join(', ')}`);
            hasIssues = true;
          }
        }

        if (!hasIssues) {
          return null;
        }

        return {
          id: delivery.id,
          deliveryDate: delivery.deliveryDate,
          deliveryNumber: delivery.deliveryNumber,
          status: delivery.status,
          akrobudOrdersCount: akrobudOrders.length,
          issues,
          lastCheckDate: latestCheck?.completedAt || latestCheck?.createdAt || null,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    return deliveriesWithIssues;
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
