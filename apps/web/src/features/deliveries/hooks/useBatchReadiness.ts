/**
 * useBatchReadiness - Hook do pobierania statusów gotowości dla wielu dostaw naraz
 *
 * QW-1: Optymalizacja N+1 query problem
 * Zamiast N osobnych zapytań (ReadinessIcon w DayCell),
 * wykonujemy jedno batch request dla wszystkich dostaw.
 */

import { useQuery } from '@tanstack/react-query';
import { deliveriesApi } from '@/lib/api';
import type { ReadinessResult } from '@/lib/api/orders';

export const BATCH_READINESS_QUERY_KEY = (ids: number[]) =>
  ['deliveries-batch-readiness', ids.sort((a, b) => a - b)] as const;

interface UseBatchReadinessOptions {
  /** Czy włączyć query (domyślnie true) */
  enabled?: boolean;
  /** Czas ważności danych w ms (domyślnie 60s) */
  staleTime?: number;
  /** Interwał odświeżania w ms (domyślnie 2 minuty) */
  refetchInterval?: number;
}

/**
 * Hook do pobierania statusów gotowości dla wielu dostaw jednocześnie
 *
 * Eliminuje problem N+1 queries w kalendarzu dostaw.
 * Zamiast każda dostawa osobno odpytywała API o readiness,
 * teraz pobieramy wszystkie naraz jednym requestem.
 *
 * @param deliveryIds - Lista ID dostaw do sprawdzenia
 * @param options - Opcje konfiguracyjne
 *
 * @example
 * ```tsx
 * function DeliveryCalendar({ deliveries }: { deliveries: Delivery[] }) {
 *   const deliveryIds = deliveries.map(d => d.id);
 *   const { data: readinessMap, isLoading } = useBatchReadiness(deliveryIds);
 *
 *   return deliveries.map(delivery => (
 *     <DayCell
 *       key={delivery.id}
 *       delivery={delivery}
 *       readiness={readinessMap?.[delivery.id]}
 *     />
 *   ));
 * }
 * ```
 */
export function useBatchReadiness(
  deliveryIds: number[],
  options: UseBatchReadinessOptions = {}
) {
  const {
    enabled = true,
    staleTime = 60 * 1000, // 1 minuta
    refetchInterval = 2 * 60 * 1000, // 2 minuty
  } = options;

  // Deduplikuj i sortuj ID dla stabilnego cache key
  const uniqueIds = [...new Set(deliveryIds)].sort((a, b) => a - b);

  return useQuery({
    queryKey: BATCH_READINESS_QUERY_KEY(uniqueIds),
    queryFn: async (): Promise<Record<number, ReadinessResult>> => {
      if (uniqueIds.length === 0) {
        return {};
      }
      return deliveriesApi.getBatchReadiness(uniqueIds);
    },
    enabled: enabled && uniqueIds.length > 0,
    staleTime,
    refetchInterval,
    // Zachowaj poprzednie dane podczas ładowania nowych
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Helper do wyciągnięcia statusu pojedynczej dostawy z batch response
 */
export function getReadinessStatus(
  readinessMap: Record<number, ReadinessResult> | undefined,
  deliveryId: number
): ReadinessResult | undefined {
  return readinessMap?.[deliveryId];
}

/**
 * Helper do sprawdzenia czy dostawa jest zablokowana
 */
export function isDeliveryBlocked(
  readinessMap: Record<number, ReadinessResult> | undefined,
  deliveryId: number
): boolean {
  const readiness = getReadinessStatus(readinessMap, deliveryId);
  return readiness?.status === 'blocked';
}

/**
 * Helper do sprawdzenia czy dostawa jest gotowa
 */
export function isDeliveryReady(
  readinessMap: Record<number, ReadinessResult> | undefined,
  deliveryId: number
): boolean {
  const readiness = getReadinessStatus(readinessMap, deliveryId);
  return readiness?.status === 'ready';
}
