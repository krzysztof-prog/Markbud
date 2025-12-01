/**
 * Deliveries hooks - data fetching z useSuspenseQuery
 */

import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi } from '../api/deliveriesApi';
import type { Delivery, DeliveryCalendarData } from '@/types';

export const DELIVERIES_CALENDAR_QUERY_KEY = (monthsParams: { month: number; year: number }[]) =>
  ['deliveries-calendar', monthsParams] as const;

/**
 * Hook do pobierania kalendarza dostaw z Suspense
 *
 * @param months - Lista miesięcy do pobrania
 *
 * @example
 * ```tsx
 * function DeliveriesContent() {
 *   const months = [{ month: 11, year: 2025 }];
 *   const { data } = useDeliveriesCalendar(months);
 *   return <div>{data.deliveries.length} dostaw</div>;
 * }
 * ```
 */
export function useDeliveriesCalendar(months: { month: number; year: number }[]) {
  return useSuspenseQuery({
    queryKey: DELIVERIES_CALENDAR_QUERY_KEY(months),
    queryFn: async () => {
      // Pobierz dane dla każdego miesiąca i połącz
      const results = await Promise.all(
        months.map(({ month, year }) => deliveriesApi.getCalendar(month, year))
      );

      // Połącz wszystkie dostawy
      const allDeliveries = results.flatMap(r => r.deliveries || []);

      return {
        deliveries: allDeliveries,
        monthsData: results.flatMap(r => r.monthsData || []),
      } as DeliveryCalendarData;
    },
    staleTime: 2 * 60 * 1000, // 2 minuty
  });
}

/**
 * Hook do invalidacji cache dostaw
 */
export function useInvalidateDeliveries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
  };
}
