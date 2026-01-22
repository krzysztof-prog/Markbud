/**
 * Hook do zarządzania pozycjami zamówień Schüco
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schucoApi } from '@/lib/api/schuco';
import type { SchucoOrderItem, SchucoItemsStats, SchucoItemsFetchResult } from '@/types';

// Query keys
export const SCHUCO_ITEMS_QUERY_KEYS = {
  items: (deliveryId: number) => ['schuco', 'items', deliveryId] as const,
  stats: ['schuco', 'items', 'stats'] as const,
  isRunning: ['schuco', 'items', 'isRunning'] as const,
};

/**
 * Hook do pobierania pozycji dla konkretnego zamówienia
 */
export function useSchucoItems(deliveryId: number, enabled = true) {
  return useQuery<SchucoOrderItem[]>({
    queryKey: SCHUCO_ITEMS_QUERY_KEYS.items(deliveryId),
    queryFn: () => schucoApi.getItems(deliveryId),
    enabled: enabled && deliveryId > 0,
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania statystyk pozycji
 */
export function useSchucoItemsStats() {
  return useQuery<SchucoItemsStats>({
    queryKey: SCHUCO_ITEMS_QUERY_KEYS.stats,
    queryFn: () => schucoApi.getItemsStats(),
    staleTime: 60 * 1000, // 1 minuta
  });
}

/**
 * Hook do sprawdzania czy pobieranie pozycji jest w trakcie
 */
export function useSchucoItemsFetchRunning() {
  return useQuery<{ isRunning: boolean }>({
    queryKey: SCHUCO_ITEMS_QUERY_KEYS.isRunning,
    queryFn: () => schucoApi.isItemsFetchRunning(),
    refetchInterval: 3000, // Odświeżaj co 3 sekundy
  });
}

/**
 * Hook do mutacji - pobieranie pozycji
 */
export function useSchucoItemsFetch() {
  const queryClient = useQueryClient();

  return useMutation<SchucoItemsFetchResult, Error, { limit?: number; deliveryIds?: number[] } | undefined>({
    mutationFn: (options) => schucoApi.fetchItems(options),
    onSuccess: () => {
      // Odśwież statystyki
      queryClient.invalidateQueries({ queryKey: SCHUCO_ITEMS_QUERY_KEYS.stats });
    },
  });
}

/**
 * Hook do czyszczenia starych markerów zmian
 */
export function useSchucoItemsClearOldChanges() {
  const queryClient = useQueryClient();

  return useMutation<{ cleared: number; message: string }, Error>({
    mutationFn: () => schucoApi.clearOldItemChanges(),
    onSuccess: () => {
      // Odśwież wszystkie items
      queryClient.invalidateQueries({ queryKey: ['schuco', 'items'] });
    },
  });
}
