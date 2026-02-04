/**
 * useDeliveriesData - Unified hook for deliveries data
 *
 * QW-5: Łączy pobieranie kalendarza dostaw z batch readiness w jeden hook.
 * Eliminuje potrzebę ręcznego zarządzania wieloma zapytaniami.
 *
 * Korzyści:
 * - Jeden hook zamiast dwóch osobnych (calendar + readiness)
 * - Automatyczne przekazywanie delivery IDs do batch readiness
 * - Spójne stany loading/error
 * - Łatwa invalidacja obu cache'y naraz
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { deliveriesApi } from '@/lib/api';
import { useBatchReadiness, BATCH_READINESS_QUERY_KEY } from './useBatchReadiness';
import type { Delivery, Order, WorkingDay, Holiday } from '@/types';
import type { ReadinessResult } from '@/lib/api/orders';

// ============================================
// TYPES
// ============================================

export interface MonthToFetch {
  month: number;
  year: number;
}

export interface DeliveriesDataResult {
  /** Lista dostaw z kalendarza */
  deliveries: Delivery[];
  /** Zlecenia nieprzypisane do żadnej dostawy */
  unassignedOrders: Order[];
  /** Dni robocze/wolne */
  workingDays: WorkingDay[];
  /** Święta */
  holidays: Holiday[];
  /** Mapa statusów readiness dla dostaw (deliveryId -> ReadinessResult) */
  readinessMap: Record<number, ReadinessResult> | undefined;
  /** Czy dane kalendarza są ładowane */
  isLoading: boolean;
  /** Czy dane readiness są ładowane */
  isReadinessLoading: boolean;
  /** Błąd ładowania kalendarza */
  error: Error | null;
  /** Błąd ładowania readiness */
  readinessError: Error | null;
  /** Funkcja do odświeżenia wszystkich danych */
  refetch: () => void;
  /** Funkcja do odświeżenia tylko readiness */
  refetchReadiness: () => void;
}

export interface UseDeliveriesDataOptions {
  /** Miesiące do pobrania */
  months: MonthToFetch[];
  /** Czy pobierać dane readiness (domyślnie true) */
  fetchReadiness?: boolean;
  /** Czas ważności cache kalendarza w ms (domyślnie 2 min) */
  calendarStaleTime?: number;
  /** Czas ważności cache readiness w ms (domyślnie 1 min) */
  readinessStaleTime?: number;
  /** Interwał odświeżania readiness w ms (domyślnie 2 min) */
  readinessRefetchInterval?: number;
}

// ============================================
// QUERY KEY
// ============================================

export const DELIVERIES_DATA_QUERY_KEY = (months: MonthToFetch[]) =>
  ['deliveries-calendar-batch', months] as const;

// ============================================
// MAIN HOOK
// ============================================

/**
 * Unified hook for deliveries calendar data + batch readiness
 *
 * @example
 * ```tsx
 * function DeliveriesPage() {
 *   const { deliveries, readinessMap, isLoading, refetch } = useDeliveriesData({
 *     months: [{ month: 2, year: 2026 }],
 *   });
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return deliveries.map(d => (
 *     <DeliveryCard
 *       key={d.id}
 *       delivery={d}
 *       readiness={readinessMap?.[d.id]}
 *     />
 *   ));
 * }
 * ```
 */
export function useDeliveriesData(options: UseDeliveriesDataOptions): DeliveriesDataResult {
  const {
    months,
    fetchReadiness = true,
    calendarStaleTime = 2 * 60 * 1000,
    readinessStaleTime = 60 * 1000,
    readinessRefetchInterval = 2 * 60 * 1000,
  } = options;

  const queryClient = useQueryClient();

  // === CALENDAR DATA ===
  const calendarQuery = useQuery({
    queryKey: DELIVERIES_DATA_QUERY_KEY(months),
    queryFn: () => deliveriesApi.getCalendarBatch(months),
    staleTime: calendarStaleTime,
    enabled: months.length > 0,
  });

  const deliveries = calendarQuery.data?.deliveries || [];
  const unassignedOrders = calendarQuery.data?.unassignedOrders || [];
  const workingDays = calendarQuery.data?.workingDays || [];
  const holidays = calendarQuery.data?.holidays || [];

  // === BATCH READINESS ===
  const deliveryIds = useMemo(() => deliveries.map((d) => d.id), [deliveries]);

  const readinessQuery = useBatchReadiness(deliveryIds, {
    enabled: fetchReadiness && deliveryIds.length > 0,
    staleTime: readinessStaleTime,
    refetchInterval: readinessRefetchInterval,
  });

  // === REFETCH FUNCTIONS ===
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: DELIVERIES_DATA_QUERY_KEY(months) });
    if (deliveryIds.length > 0) {
      queryClient.invalidateQueries({ queryKey: BATCH_READINESS_QUERY_KEY(deliveryIds) });
    }
  }, [queryClient, months, deliveryIds]);

  const refetchReadiness = useCallback(() => {
    if (deliveryIds.length > 0) {
      queryClient.invalidateQueries({ queryKey: BATCH_READINESS_QUERY_KEY(deliveryIds) });
    }
  }, [queryClient, deliveryIds]);

  return {
    deliveries,
    unassignedOrders,
    workingDays,
    holidays,
    readinessMap: readinessQuery.data,
    isLoading: calendarQuery.isLoading,
    isReadinessLoading: readinessQuery.isLoading,
    error: calendarQuery.error,
    readinessError: readinessQuery.error,
    refetch,
    refetchReadiness,
  };
}

export default useDeliveriesData;
