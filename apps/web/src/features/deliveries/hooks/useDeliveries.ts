/**
 * Deliveries hooks - data fetching z useSuspenseQuery
 */

import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { deliveriesApi } from '../api/deliveriesApi';
import { deliveriesApi as mainDeliveriesApi } from '@/lib/api';
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

/**
 * Hook do pobierania PDF protokołu odbioru dostawy
 *
 * @example
 * ```tsx
 * function ProtocolButton({ deliveryId }: { deliveryId: number }) {
 *   const downloadProtocol = useDownloadDeliveryProtocol();
 *
 *   return (
 *     <button onClick={() => downloadProtocol.mutate(deliveryId)}>
 *       {downloadProtocol.isPending ? 'Pobieranie...' : 'Pobierz protokół'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDownloadDeliveryProtocol() {
  return useMutation({
    mutationFn: async (deliveryId: number) => {
      const blob = await mainDeliveriesApi.getProtocolPdf(deliveryId);

      // Utwórz URL do blob
      const url = window.URL.createObjectURL(blob);

      // Utwórz link do pobrania
      const a = document.createElement('a');
      a.href = url;
      a.download = `protokol_dostawy_${deliveryId}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Kliknij automatycznie
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}
