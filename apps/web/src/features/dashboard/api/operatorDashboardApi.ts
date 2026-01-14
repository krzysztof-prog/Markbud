/**
 * Operator Dashboard API Service
 *
 * API client dla nowego dashboard operatora z prawdziwymi danymi.
 */

import { fetchApi } from '@/lib/api-client';

// =====================================================
// Types - odpowiadajace backendom validators
// =====================================================

export interface CompletenessStats {
  totalOrders: number;
  withFiles: number;
  withGlass: number;
  withHardware: number;
  readyForProduction: number;
}

export interface RecentActivity {
  id: number;
  type: 'order_created' | 'glass_status_changed' | 'hardware_status_changed' | 'delivery_assigned';
  message: string;
  orderNumber?: string;
  timestamp: string;
}

export interface OperatorAlert {
  id: number;
  type: 'missing_files' | 'missing_glass' | 'missing_hardware' | 'pending_conflict';
  priority: 'critical' | 'high' | 'medium';
  message: string;
  count: number;
  actionUrl: string;
}

export interface OperatorDashboardUser {
  id: number;
  name: string;
  role: string;
}

export interface OperatorDashboardResponse {
  user: OperatorDashboardUser;
  stats: CompletenessStats;
  alerts: OperatorAlert[];
  recentActivity: RecentActivity[];
  pendingConflictsCount: number;
}

export interface OperatorDashboardParams {
  filterByUser?: boolean;
}

// =====================================================
// API Methods
// =====================================================

export const operatorDashboardApi = {
  /**
   * Pobierz dane dashboard operatora
   *
   * @param params.filterByUser - true = tylko zlecenia zalogowanego uzytkownika,
   *                              false = wszystkie (tylko dla KIEROWNIK+)
   *
   * @example
   * ```typescript
   * // Tylko moje zlecenia
   * const data = await operatorDashboardApi.getDashboard({ filterByUser: true });
   *
   * // Wszystkie zlecenia (kierownik)
   * const data = await operatorDashboardApi.getDashboard({ filterByUser: false });
   * ```
   */
  getDashboard: (params: OperatorDashboardParams = {}) => {
    const queryParams = new URLSearchParams();

    if (params.filterByUser !== undefined) {
      queryParams.set('filterByUser', params.filterByUser ? 'true' : 'false');
    }

    const queryString = queryParams.toString();
    const url = `/api/dashboard/operator${queryString ? `?${queryString}` : ''}`;

    return fetchApi<OperatorDashboardResponse>(url);
  },
};
