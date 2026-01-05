/**
 * Dashboard API Service
 */

import { fetchApi } from '@/lib/api-client';
import type { DashboardResponse, Alert } from '@/types';

export interface WeekStats {
  weekNumber: number;
  startDate: string;
  endDate: string;
  deliveriesCount: number;
  ordersCount: number;
  windows: number;
  sashes: number;
  glasses: number;
}

export interface WeeklyStatsResponse {
  weeks: WeekStats[];
}

export const dashboardApi = {
  /**
   * Pobierz dane dashboard (stats, pending imports, upcoming deliveries)
   */
  getDashboard: () =>
    fetchApi<DashboardResponse>('/api/dashboard'),

  /**
   * Pobierz wszystkie alerty
   */
  getAlerts: () =>
    fetchApi<Alert[]>('/api/dashboard/alerts'),

  /**
   * Pobierz statystyki tygodniowe dla najbliższych 8 tygodni
   */
  getWeeklyStats: () =>
    fetchApi<WeeklyStatsResponse>('/api/dashboard/stats/weekly'),
};
