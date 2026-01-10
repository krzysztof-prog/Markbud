/**
 * Dashboard hooks - data fetching z useQuery
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { dashboardApi } from '../api/dashboardApi';

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
  const { toast } = useToast();

  const query = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getDashboard,
    staleTime: 5 * 60 * 1000, // 5 minut - dane dashboard rzadko sie zmieniaja
    gcTime: 10 * 60 * 1000, // 10 minut w cache
  });

  // TanStack Query v5: Show toast on error
  useEffect(() => {
    if (query.error) {
      toast({
        variant: 'destructive',
        title: 'Błąd ładowania dashboard',
        description: query.error.message || 'Nie udało się pobrać danych dashboard',
      });
    }
  }, [query.error, toast]);

  return query;
}

/**
 * Hook do pobierania alertów
 */
export function useAlerts() {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: dashboardApi.getAlerts,
    staleTime: 2 * 60 * 1000, // 2 minuty - alerty zmieniaja sie rzadko
    gcTime: 5 * 60 * 1000, // 5 minut w cache
  });

  // TanStack Query v5: Show toast on error
  useEffect(() => {
    if (query.error) {
      toast({
        variant: 'destructive',
        title: 'Błąd ładowania alertów',
        description: query.error.message || 'Nie udało się pobrać alertów',
      });
    }
  }, [query.error, toast]);

  return query;
}

/**
 * Hook do pobierania statystyk tygodniowych
 */
export function useWeeklyStats() {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: WEEKLY_STATS_QUERY_KEY,
    queryFn: dashboardApi.getWeeklyStats,
    staleTime: 5 * 60 * 1000, // 5 minut - statystyki tygodniowe rzadko sie zmieniaja
    gcTime: 15 * 60 * 1000, // 15 minut w cache
  });

  // TanStack Query v5: Show toast on error
  useEffect(() => {
    if (query.error) {
      toast({
        variant: 'destructive',
        title: 'Błąd ładowania statystyk tygodniowych',
        description: query.error.message || 'Nie udało się pobrać statystyk',
      });
    }
  }, [query.error, toast]);

  return query;
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
