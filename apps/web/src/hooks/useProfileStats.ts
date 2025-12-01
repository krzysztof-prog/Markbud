/**
 * Hook do pobierania statystyk profili w dostawach
 */

import { useQuery } from '@tanstack/react-query';
import { deliveriesApi } from '@/lib/api';

export const PROFILE_STATS_QUERY_KEY = ['deliveries', 'profile-stats'] as const;

/**
 * Hook do pobierania miesięcznych statystyk profili w dostawach
 *
 * @param months - Liczba miesięcy wstecz (domyślnie 6)
 * @example
 * ```tsx
 * function ProfileStatsDialog() {
 *   const { data, isLoading } = useProfileStats(6);
 *   if (isLoading) return <Skeleton />;
 *   return <div>{data.stats.length} miesięcy</div>;
 * }
 * ```
 */
export function useProfileStats(months: number = 6) {
  return useQuery({
    queryKey: [...PROFILE_STATS_QUERY_KEY, months],
    queryFn: () => deliveriesApi.getProfileStats(months),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}
