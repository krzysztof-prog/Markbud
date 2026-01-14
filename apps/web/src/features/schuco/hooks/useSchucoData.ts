/**
 * Hook do pobierania danych Schuco
 *
 * Centralizuje wszystkie zapytania do API Schuco w jednym miejscu.
 * Używa TanStack Query dla cache i automatycznego refetching.
 */

import { useQuery } from '@tanstack/react-query';
import { schucoApi } from '@/lib/api';
import type { SchucoDeliveriesResponse, SchucoFetchLog } from '@/types/schuco';
import type { SchucoStatistics, ByWeekResponse } from '../types';
import { SCHUCO_QUERY_KEYS } from './useDeliveryActions';

interface UseSchucoDataOptions {
  /** Aktualna strona dla paginacji dostaw */
  currentPage: number;
  /** Rozmiar strony */
  pageSize?: number;
}

interface UseSchucoDataReturn {
  /** Dane dostaw z paginacją */
  deliveriesData: SchucoDeliveriesResponse | undefined;
  /** Status ostatniego pobrania */
  status: SchucoFetchLog | undefined;
  /** Statystyki zmian */
  statistics: SchucoStatistics | undefined;
  /** Historia logów pobrań */
  logs: SchucoFetchLog[];
  /** Dane pogrupowane według tygodnia */
  byWeekData: ByWeekResponse | undefined;
  /** Czy ładują się dostawy */
  isLoadingDeliveries: boolean;
  /** Czy ładują się logi */
  isLoadingLogs: boolean;
  /** Czy ładują się dane tygodniowe */
  isLoadingByWeek: boolean;
}

const DEFAULT_PAGE_SIZE = 100;

/**
 * Hook pobierający wszystkie dane Schuco
 */
export function useSchucoData({
  currentPage,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseSchucoDataOptions): UseSchucoDataReturn {
  // Pobierz dostawy z paginacją
  const { data: deliveriesData, isLoading: isLoadingDeliveries } =
    useQuery<SchucoDeliveriesResponse>({
      queryKey: [...SCHUCO_QUERY_KEYS.deliveries, currentPage],
      queryFn: () => schucoApi.getDeliveries(currentPage, pageSize),
      staleTime: 0, // Zawsze pobieraj świeże dane
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    });

  // Pobierz status ostatniego pobrania
  const { data: status } = useQuery<SchucoFetchLog>({
    queryKey: SCHUCO_QUERY_KEYS.status,
    queryFn: () => schucoApi.getStatus(),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Pobierz statystyki
  const { data: statistics } = useQuery<SchucoStatistics>({
    queryKey: SCHUCO_QUERY_KEYS.statistics,
    queryFn: () => schucoApi.getStatistics(),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Pobierz historię logów
  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<SchucoFetchLog[]>({
    queryKey: SCHUCO_QUERY_KEYS.logs,
    queryFn: () => schucoApi.getLogs(),
    staleTime: 5 * 60 * 1000, // 5 minut cache
  });

  // Pobierz dane pogrupowane według tygodnia
  const { data: byWeekData, isLoading: isLoadingByWeek } = useQuery<ByWeekResponse>({
    queryKey: SCHUCO_QUERY_KEYS.byWeek,
    queryFn: () => schucoApi.getByWeek(),
    staleTime: 0,
    refetchOnMount: true,
  });

  return {
    deliveriesData,
    status,
    statistics,
    logs,
    byWeekData,
    isLoadingDeliveries,
    isLoadingLogs,
    isLoadingByWeek,
  };
}

export default useSchucoData;
