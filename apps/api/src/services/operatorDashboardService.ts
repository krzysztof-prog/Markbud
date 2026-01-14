import type { PrismaClient } from '@prisma/client';
import { OperatorDashboardRepository } from '../repositories/OperatorDashboardRepository.js';
import type {
  OperatorDashboardResponse,
  OperatorAlert,
  RecentActivity,
} from '../validators/operator-dashboard.js';

/**
 * OperatorDashboardService - Business logic for operator dashboard
 *
 * Responsibilities:
 * - Aggregate data from repository
 * - Generate alerts based on missing items
 * - Format recent activity from status changes
 * - Apply business rules for priorities
 */
export class OperatorDashboardService {
  private repository: OperatorDashboardRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new OperatorDashboardRepository(prisma);
  }

  /**
   * Pobiera pelne dane dashboard operatora
   *
   * @param userId - ID zalogowanego uzytkownika
   * @param filterByUser - Czy filtrowac zlecenia po uzytkowniku (false = wszystkie)
   */
  async getDashboardData(
    userId: number,
    filterByUser: boolean = true
  ): Promise<OperatorDashboardResponse> {
    // Pobierz dane uzytkownika
    const user = await this.repository.getUser(userId);

    if (!user) {
      throw new Error('Uzytkownik nie istnieje');
    }

    // Czy filtrujemy po uzytkowniku?
    const filterUserId = filterByUser ? userId : null;

    // Pobierz statystyki rownoczesnie
    const [stats, recentOrders, pendingConflictsCount] = await Promise.all([
      this.repository.getCompletenessStats(filterUserId),
      this.repository.getRecentStatusChanges(filterUserId, 15),
      this.repository.countPendingConflicts(userId),
    ]);

    // Generuj alerty
    const alerts = await this.generateAlerts(filterUserId, pendingConflictsCount);

    // Formatuj ostatnie dzialania
    const recentActivity = this.formatRecentActivity(recentOrders);

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      stats,
      alerts,
      recentActivity,
      pendingConflictsCount,
    };
  }

  /**
   * Generuje alerty na podstawie brakujacych elementow
   */
  private async generateAlerts(
    userId: number | null,
    pendingConflictsCount: number
  ): Promise<OperatorAlert[]> {
    const alerts: OperatorAlert[] = [];
    let alertId = 1;

    // Pobierz dane do alertow rownoczesnie
    const [ordersWithoutFiles, ordersWithoutGlass, ordersWithHardwareIssues] =
      await Promise.all([
        this.repository.getOrdersWithoutFiles(userId),
        this.repository.getOrdersWithoutGlass(userId),
        this.repository.getOrdersWithHardwareIssues(userId),
      ]);

    // Alert: konflikty importu (najwyzszy priorytet)
    if (pendingConflictsCount > 0) {
      alerts.push({
        id: alertId++,
        type: 'pending_conflict',
        priority: 'critical',
        message: `${pendingConflictsCount} konfliktow importu do rozwiazania`,
        count: pendingConflictsCount,
        actionUrl: '/moja-praca',
      });
    }

    // Alert: brak szyb
    if (ordersWithoutGlass.length > 0) {
      alerts.push({
        id: alertId++,
        type: 'missing_glass',
        priority: ordersWithoutGlass.length > 5 ? 'high' : 'medium',
        message: `${ordersWithoutGlass.length} zlecen wymaga zamowienia szyb`,
        count: ordersWithoutGlass.length,
        actionUrl: '/zamowienia-szyb',
      });
    }

    // Alert: problemy z okuciami
    if (ordersWithHardwareIssues.length > 0) {
      const atypicalCount = ordersWithHardwareIssues.filter(
        (o) => o.okucDemandStatus === 'has_atypical'
      ).length;

      alerts.push({
        id: alertId++,
        type: 'missing_hardware',
        priority: atypicalCount > 0 ? 'high' : 'medium',
        message: `${ordersWithHardwareIssues.length} zlecen z problemami okuciowymi`,
        count: ordersWithHardwareIssues.length,
        actionUrl: '/magazyn/okuc/zapotrzebowanie',
      });
    }

    // Alert: brak plikow
    if (ordersWithoutFiles.length > 0) {
      alerts.push({
        id: alertId++,
        type: 'missing_files',
        priority: ordersWithoutFiles.length > 10 ? 'high' : 'medium',
        message: `${ordersWithoutFiles.length} zlecen bez plikow Schuco`,
        count: ordersWithoutFiles.length,
        actionUrl: '/schuco-deliveries',
      });
    }

    return alerts;
  }

  /**
   * Formatuje ostatnie zmiany statusow jako aktywnosci
   */
  private formatRecentActivity(
    orders: Array<{
      id: number;
      orderNumber: string;
      status: string;
      glassOrderStatus: string | null;
      okucDemandStatus: string | null;
      updatedAt: Date;
      createdAt: Date;
    }>
  ): RecentActivity[] {
    const activities: RecentActivity[] = [];
    let activityId = 1;

    for (const order of orders) {
      // Sprawdz czy to nowo utworzone zlecenie (updatedAt ~= createdAt)
      const isNewOrder =
        Math.abs(order.updatedAt.getTime() - order.createdAt.getTime()) < 60000; // 1 minuta

      if (isNewOrder) {
        activities.push({
          id: activityId++,
          type: 'order_created',
          message: `Utworzono zlecenie ${order.orderNumber}`,
          orderNumber: order.orderNumber,
          timestamp: order.createdAt.toISOString(),
        });
      } else {
        // Okreslic typ zmiany na podstawie statusow
        let type: RecentActivity['type'] = 'order_created';
        let message = `Zaktualizowano zlecenie ${order.orderNumber}`;

        if (order.glassOrderStatus === 'ordered') {
          type = 'glass_status_changed';
          message = `Zamowiono szyby dla ${order.orderNumber}`;
        } else if (order.glassOrderStatus === 'delivered') {
          type = 'glass_status_changed';
          message = `Dostarczono szyby dla ${order.orderNumber}`;
        } else if (order.okucDemandStatus === 'imported') {
          type = 'hardware_status_changed';
          message = `Zaimportowano okucia dla ${order.orderNumber}`;
        }

        activities.push({
          id: activityId++,
          type,
          message,
          orderNumber: order.orderNumber,
          timestamp: order.updatedAt.toISOString(),
        });
      }
    }

    // Sortuj po czasie (najnowsze najpierw) i ogranicz do 10
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return activities.slice(0, 10);
  }
}
