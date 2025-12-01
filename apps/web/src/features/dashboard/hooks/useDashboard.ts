/**
 * Dashboard hooks - data fetching z useQuery
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardResponse, Alert } from '@/types';

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;
export const ALERTS_QUERY_KEY = ['alerts'] as const;
export const WEEKLY_STATS_QUERY_KEY = ['dashboard', 'weekly-stats'] as const;

/**
 * Hook do pobierania danych dashboard
 *
 * @example
 * ```tsx
 * function DashboardContent() {
 *   const { data, isLoading } = useDashboard();
 *   if (isLoading) return <Skeleton />;
 *   return <div>{data.stats.activeOrders} aktywnych zleceń</div>;
 * }
 * ```
 */
export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getDashboard,
    staleTime: 2 * 60 * 1000, // 2 minuty
  });
}

/**
 * Hook do pobierania alertów
 */
export function useAlerts() {
  return useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: dashboardApi.getAlerts,
    staleTime: 1 * 60 * 1000, // 1 minuta
  });
}

/**
 * Hook do pobierania statystyk tygodniowych
 */
export function useWeeklyStats() {
  return useQuery({
    queryKey: WEEKLY_STATS_QUERY_KEY,
    queryFn: dashboardApi.getWeeklyStats,
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do invalidacji cache dashboard
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
  };
}
