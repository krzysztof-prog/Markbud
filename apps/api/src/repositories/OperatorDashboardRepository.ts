import type { PrismaClient } from '@prisma/client';

/**
 * OperatorDashboardRepository - Data access for operator dashboard
 *
 * Handles queries for:
 * - Completeness statistics (files, glass, hardware)
 * - Recent activity (status changes)
 * - Alerts data (missing items)
 * - Pending conflicts
 */
export class OperatorDashboardRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Pobiera statystyki kompletnosci zlecen
   * @param userId - ID uzytkownika (null = wszystkie zlecenia)
   */
  async getCompletenessStats(userId: number | null) {
    const where = {
      archivedAt: null,
      completedAt: null,
      ...(userId !== null ? { documentAuthorUserId: userId } : {}),
    };

    // Pobierz zlecenia z relacja schucoLinks (do sprawdzenia plikow)
    const orders = await this.prisma.order.findMany({
      where,
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

    // Zlecenia z plikami = maja przynajmniej jeden schucoLink
    const withFiles = orders.filter((o) => o.schucoLinks.length > 0).length;

    // Zlecenia z szybami = ordered LUB delivered
    const withGlass = orders.filter(
      (o) => o.glassOrderStatus === 'ordered' || o.glassOrderStatus === 'delivered'
    ).length;

    // Zlecenia z okuciami = imported LUB none (kompletne)
    // has_atypical lub pending = niekompletne
    const withHardware = orders.filter(
      (o) => o.okucDemandStatus === 'imported' || o.okucDemandStatus === 'none'
    ).length;

    // Gotowe do produkcji = szyby delivered + okucia OK + pliki
    const readyForProduction = orders.filter(
      (o) =>
        o.glassOrderStatus === 'delivered' &&
        (o.okucDemandStatus === 'imported' || o.okucDemandStatus === 'none') &&
        o.schucoLinks.length > 0
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
   * Pobiera ostatnie zmiany statusow zlecen
   * @param userId - ID uzytkownika (filtruje zlecenia przypisane do niego)
   * @param limit - Maksymalna liczba wynikow
   */
  async getRecentStatusChanges(userId: number | null, limit: number = 10) {
    const where = {
      archivedAt: null,
      ...(userId !== null ? { documentAuthorUserId: userId } : {}),
    };

    // Pobierz ostatnio zaktualizowane zlecenia
    const recentOrders = await this.prisma.order.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        glassOrderStatus: true,
        okucDemandStatus: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return recentOrders;
  }

  /**
   * Pobiera zlecenia bez plikow (schucoLinks)
   */
  async getOrdersWithoutFiles(userId: number | null, limit: number = 50) {
    const where = {
      archivedAt: null,
      completedAt: null,
      schucoLinks: { none: {} },
      ...(userId !== null ? { documentAuthorUserId: userId } : {}),
    };

    return this.prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
      },
      take: limit,
    });
  }

  /**
   * Pobiera zlecenia bez zamowionych szyb
   */
  async getOrdersWithoutGlass(userId: number | null, limit: number = 50) {
    const where = {
      archivedAt: null,
      completedAt: null,
      glassOrderStatus: 'not_ordered',
      ...(userId !== null ? { documentAuthorUserId: userId } : {}),
    };

    return this.prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
      },
      take: limit,
    });
  }

  /**
   * Pobiera zlecenia z problemami z okuciami (has_atypical lub pending)
   */
  async getOrdersWithHardwareIssues(userId: number | null, limit: number = 50) {
    const where = {
      archivedAt: null,
      completedAt: null,
      okucDemandStatus: { in: ['has_atypical', 'pending'] },
      ...(userId !== null ? { documentAuthorUserId: userId } : {}),
    };

    return this.prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        okucDemandStatus: true,
      },
      take: limit,
    });
  }

  /**
   * Zlicza konflikty importu dla uzytkownika
   */
  async countPendingConflicts(userId: number) {
    return this.prisma.pendingImportConflict.count({
      where: {
        authorUserId: userId,
        status: 'pending',
      },
    });
  }

  /**
   * Pobiera dane uzytkownika
   */
  async getUser(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
  }
}
