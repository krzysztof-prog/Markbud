/**
 * Operator Dashboard Hook
 *
 * Custom hook do pobierania danych dashboard operatora z cache'owaniem.
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  operatorDashboardApi,
  type OperatorDashboardResponse,
} from '../api/operatorDashboardApi';

export const OPERATOR_DASHBOARD_QUERY_KEY = ['operator-dashboard'] as const;

interface UseOperatorDashboardOptions {
  /**
   * Czy filtrowac zlecenia po zalogowanym uzytkowniku
   * - true = tylko moje zlecenia (domyslne)
   * - false = wszystkie zlecenia (tylko dla KIEROWNIK+)
   */
  filterByUser?: boolean;
}

/**
 * Hook do pobierania danych dashboard operatora
 *
 * @example
 * ```tsx
 * function OperatorDashboard() {
 *   const [filterByUser, setFilterByUser] = useState(true);
 *   const { data, isLoading } = useOperatorDashboard({ filterByUser });
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       <h1>Witaj, {data.user.name}!</h1>
 *       <p>{data.stats.totalOrders} aktywnych zlecen</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOperatorDashboard(options: UseOperatorDashboardOptions = {}) {
  const { filterByUser = true } = options;
  const { toast } = useToast();

  const query = useQuery({
    queryKey: [...OPERATOR_DASHBOARD_QUERY_KEY, { filterByUser }],
    queryFn: () => operatorDashboardApi.getDashboard({ filterByUser }),
    staleTime: 2 * 60 * 1000, // 2 minuty - dashboard operatora moze sie czesciej zmieniac
    gcTime: 5 * 60 * 1000, // 5 minut w cache
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
 * Hook do zarzadzania filtrem "tylko moje zlecenia"
 *
 * Przechowuje stan filtra i sprawdza czy uzytkownik ma uprawnienia
 * do przelaczania miedzy swoimi a wszystkimi zleceniami.
 *
 * @example
 * ```tsx
 * function OperatorDashboard() {
 *   const { filterByUser, setFilterByUser, canToggle, userRole } = useOperatorDashboardFilter();
 *   const { data } = useOperatorDashboard({ filterByUser });
 *
 *   return (
 *     <div>
 *       {canToggle && (
 *         <Switch
 *           checked={filterByUser}
 *           onCheckedChange={setFilterByUser}
 *           label="Tylko moje zlecenia"
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOperatorDashboardFilter() {
  const [filterByUser, setFilterByUser] = useState(true);

  // Pobierz dane zeby sprawdzic role
  const { data } = useOperatorDashboard({ filterByUser });

  // Sprawdz czy uzytkownik moze przelaczac filtr
  // USER moze widziec tylko swoje - nie moze przelaczac
  // KIEROWNIK, ADMIN, OWNER moga przelaczac
  const userRole = data?.user?.role?.toLowerCase() || 'user';
  const canToggle = ['kierownik', 'admin', 'owner'].includes(userRole);

  // Jesli USER probuje ustawic filterByUser=false, wymus true
  const handleSetFilterByUser = useCallback(
    (value: boolean) => {
      if (!canToggle && !value) {
        // USER nie moze widziec wszystkich zlecen
        return;
      }
      setFilterByUser(value);
    },
    [canToggle]
  );

  return {
    filterByUser,
    setFilterByUser: handleSetFilterByUser,
    canToggle,
    userRole,
  };
}

/**
 * Hook do invalidacji cache dashboard operatora
 */
export function useInvalidateOperatorDashboard() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: OPERATOR_DASHBOARD_QUERY_KEY });
  }, [queryClient]);
}

/**
 * Helper do obliczania procentu kompletnosci
 */
export function calculateCompletenessPercent(
  data: OperatorDashboardResponse | undefined
): number {
  if (!data || data.stats.totalOrders === 0) return 0;

  // Srednia z trzech wskaznikow kompletnosci
  const filesPercent = (data.stats.withFiles / data.stats.totalOrders) * 100;
  const glassPercent = (data.stats.withGlass / data.stats.totalOrders) * 100;
  const hardwarePercent = (data.stats.withHardware / data.stats.totalOrders) * 100;

  return Math.round((filesPercent + glassPercent + hardwarePercent) / 3);
}

/**
 * Helper do liczenia problemow do rozwiazania
 */
export function countProblems(data: OperatorDashboardResponse | undefined): number {
  if (!data) return 0;

  return data.alerts.reduce((sum, alert) => sum + alert.count, 0);
}
