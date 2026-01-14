/**
 * Hook do akcji na dostawach Schuco
 *
 * Zawiera mutacje: odświeżanie danych, czyszczenie pending logów.
 * Obsługuje invalidację cache i notyfikacje użytkownika.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schucoApi } from '@/lib/api';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { formatDuration } from '../helpers/deliveryHelpers';

interface UseDeliveryActionsOptions {
  /** Callback po pomyślnym odświeżeniu */
  onRefreshSuccess?: () => void;
}

interface UseDeliveryActionsReturn {
  /** Mutacja odświeżania danych Schuco */
  refreshMutation: ReturnType<typeof useMutation<Awaited<ReturnType<typeof schucoApi.refresh>>, Error, boolean>>;
  /** Mutacja czyszczenia pending logów */
  cleanupPendingMutation: ReturnType<typeof useMutation<Awaited<ReturnType<typeof schucoApi.cleanupPending>>, Error, void>>;
  /** Funkcja odświeżania danych */
  handleRefresh: (showBrowser: boolean) => void;
  /** Funkcja czyszczenia pending logów */
  handleCleanupPending: () => void;
  /** Czy trwa odświeżanie */
  isRefreshing: boolean;
  /** Czy trwa czyszczenie */
  isCleaningUp: boolean;
}

/**
 * Query keys używane w module Schuco
 * Centralizacja kluczy zapobiega błędom w invalidacji cache
 */
export const SCHUCO_QUERY_KEYS = {
  deliveries: ['schuco-deliveries', 'v2'] as const,
  status: ['schuco-status'] as const,
  statistics: ['schuco-statistics'] as const,
  logs: ['schuco-logs'] as const,
  byWeek: ['schuco-by-week'] as const,
};

/**
 * Hook do akcji na dostawach Schuco
 */
export function useDeliveryActions({
  onRefreshSuccess,
}: UseDeliveryActionsOptions = {}): UseDeliveryActionsReturn {
  const queryClient = useQueryClient();

  // Mutacja odświeżania danych
  const refreshMutation = useMutation({
    mutationFn: (showBrowser: boolean) => schucoApi.refresh(!showBrowser), // Invert: showBrowser=false oznacza headless=true
    onSuccess: (data) => {
      // Invaliduj wszystkie powiązane queries
      queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.deliveries });
      queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.status });
      queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.statistics });
      queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.logs });
      queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.byWeek });

      // Przygotuj informację o zmianach
      const changesInfo =
        data.newRecords || data.updatedRecords
          ? ` (Nowe: ${data.newRecords || 0}, Zmienione: ${data.updatedRecords || 0})`
          : '';

      showSuccessToast(
        'Dane odświeżone',
        `Pobrano ${data.recordsCount} rekordów w ${formatDuration(data.durationMs)}${changesInfo}`
      );

      // Wywołaj callback (np. reset paginacji)
      onRefreshSuccess?.();
    },
    onError: (error) => {
      showErrorToast('Błąd odświeżania', getErrorMessage(error));
    },
  });

  // Mutacja czyszczenia pending logów
  const cleanupPendingMutation = useMutation({
    mutationFn: () => schucoApi.cleanupPending(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.logs });
      queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.status });
      showSuccessToast('Wyczyszczono', data.message);
    },
    onError: (error) => {
      showErrorToast('Błąd czyszczenia', getErrorMessage(error));
    },
  });

  // Funkcje pomocnicze
  const handleRefresh = (showBrowser: boolean) => {
    refreshMutation.mutate(showBrowser);
  };

  const handleCleanupPending = () => {
    cleanupPendingMutation.mutate();
  };

  return {
    refreshMutation,
    cleanupPendingMutation,
    handleRefresh,
    handleCleanupPending,
    isRefreshing: refreshMutation.isPending,
    isCleaningUp: cleanupPendingMutation.isPending,
  };
}

export default useDeliveryActions;
