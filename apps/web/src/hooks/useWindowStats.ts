/**
 * Hook do pobierania statystyk okien/skrzydeł/szyb w dostawach
 */

import { useQuery } from '@tanstack/react-query';
import { deliveriesApi } from '@/lib/api';

export const WINDOW_STATS_QUERY_KEY = ['deliveries', 'window-stats'] as const;
export const WINDOW_STATS_BY_WEEKDAY_QUERY_KEY = ['deliveries', 'window-stats-by-weekday'] as const;

/**
 * Hook do pobierania miesięcznych statystyk okien, skrzydeł i szyb w dostawach
 *
 * @param months - Liczba miesięcy wstecz (domyślnie 6)
 * @example
 * ```tsx
 * function WindowStatsDialog() {
 *   const { data, isLoading } = useWindowStats(6);
 *   if (isLoading) return <Skeleton />;
 *   return <div>{data.stats.length} miesięcy</div>;
 * }
 * ```
 */
export function useWindowStats(months: number = 6) {
  return useQuery({
    queryKey: [...WINDOW_STATS_QUERY_KEY, months],
    queryFn: () => deliveriesApi.getWindowStats(months),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania statystyk okien według dni tygodnia
 *
 * @param months - Liczba miesięcy wstecz (domyślnie 6)
 * @example
 * ```tsx
 * function WeekdayStats() {
 *   const { data, isLoading } = useWindowStatsByWeekday(6);
 *   if (isLoading) return <Skeleton />;
 *   return <div>{data.stats.length} dni tygodnia</div>;
 * }
 * ```
 */
export function useWindowStatsByWeekday(months: number = 6) {
  return useQuery({
    queryKey: [...WINDOW_STATS_BY_WEEKDAY_QUERY_KEY, months],
    queryFn: () => deliveriesApi.getWindowStatsByWeekday(months),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}
