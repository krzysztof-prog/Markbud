/**
 * React Query hooks for OKUC Article Replacements management
 *
 * Zarządzanie zastępstwami artykułów - wygaszanie starych i przejmowanie przez nowe.
 * Używane w widoku Zarządzania Zastępstwami (/magazyn/okuc/zastepstwa)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { okucReplacementsApi } from '../api';
import { toast } from '@/hooks/useToast';
import type { SetReplacementInput } from '@/types/okuc';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const okucReplacementsKeys = {
  all: ['okuc-replacements'] as const,
  list: () => [...okucReplacementsKeys.all, 'list'] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Hook do pobierania listy mapowań zastępstw
 * Zawiera: stary artykuł, nowy artykuł, stan magazynowy, oczekujące zapotrzebowanie
 */
export function useOkucReplacements() {
  return useQuery({
    queryKey: okucReplacementsKeys.list(),
    queryFn: okucReplacementsApi.getAll,
    staleTime: 60 * 1000, // 1 minuta - stan magazynowy może się zmieniać
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook do ustawiania mapowania zastępstwa
 * @param data.oldArticleId - ID artykułu wygaszanego
 * @param data.newArticleId - ID artykułu zastępującego (null = usuń mapowanie)
 */
export function useSetReplacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetReplacementInput) => okucReplacementsApi.set(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: okucReplacementsKeys.all });
      // Invalidate articles cache - isPhaseOut changed
      queryClient.invalidateQueries({ queryKey: ['okuc-articles'] });

      if (variables.newArticleId) {
        toast({
          title: 'Zastępstwo ustawione',
          description: 'Artykuł został oznaczony jako wygaszany.',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Zastępstwo usunięte',
          description: 'Artykuł nie jest już wygaszany.',
          variant: 'success',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd ustawiania zastępstwa',
        description: error.message || 'Nie udało się ustawić zastępstwa.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook do usuwania mapowania zastępstwa (cofnij wygaszanie)
 */
export function useRemoveReplacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (oldArticleId: number) => okucReplacementsApi.remove(oldArticleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: okucReplacementsKeys.all });
      // Invalidate articles cache - isPhaseOut changed
      queryClient.invalidateQueries({ queryKey: ['okuc-articles'] });

      toast({
        title: 'Wygaszanie cofnięte',
        description: 'Artykuł nie jest już wygaszany.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd cofania wygaszania',
        description: error.message || 'Nie udało się cofnąć wygaszania.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook do ręcznego przenoszenia zapotrzebowania
 * Przenosi pending/confirmed demands ze starego artykułu na nowy
 */
export function useTransferDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (oldArticleId: number) => okucReplacementsApi.transferDemand(oldArticleId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: okucReplacementsKeys.all });
      // Invalidate demand cache
      queryClient.invalidateQueries({ queryKey: ['okuc-demand'] });

      toast({
        title: 'Zapotrzebowanie przeniesione',
        description: `Przeniesiono ${result.transferred} pozycji zapotrzebowania.`,
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd przenoszenia zapotrzebowania',
        description: error.message || 'Nie udało się przenieść zapotrzebowania.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook agregujący wszystkie mutacje zastępstw
 * Uzycie: const { setMutation, removeMutation, transferMutation } = useOkucReplacementMutations()
 */
export function useOkucReplacementMutations(callbacks?: {
  onSetSuccess?: () => void;
  onRemoveSuccess?: () => void;
  onTransferSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const setMutation = useMutation({
    mutationFn: (data: SetReplacementInput) => okucReplacementsApi.set(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: okucReplacementsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['okuc-articles'] });

      if (variables.newArticleId) {
        toast({
          title: 'Zastępstwo ustawione',
          description: 'Artykuł został oznaczony jako wygaszany.',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Zastępstwo usunięte',
          description: 'Artykuł nie jest już wygaszany.',
          variant: 'success',
        });
      }
      callbacks?.onSetSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd ustawiania zastępstwa',
        description: error.message || 'Nie udało się ustawić zastępstwa.',
        variant: 'destructive',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (oldArticleId: number) => okucReplacementsApi.remove(oldArticleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: okucReplacementsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['okuc-articles'] });

      toast({
        title: 'Wygaszanie cofnięte',
        description: 'Artykuł nie jest już wygaszany.',
        variant: 'success',
      });
      callbacks?.onRemoveSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd cofania wygaszania',
        description: error.message || 'Nie udało się cofnąć wygaszania.',
        variant: 'destructive',
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (oldArticleId: number) => okucReplacementsApi.transferDemand(oldArticleId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: okucReplacementsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['okuc-demand'] });

      toast({
        title: 'Zapotrzebowanie przeniesione',
        description: `Przeniesiono ${result.transferred} pozycji zapotrzebowania.`,
        variant: 'success',
      });
      callbacks?.onTransferSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd przenoszenia zapotrzebowania',
        description: error.message || 'Nie udało się przenieść zapotrzebowania.',
        variant: 'destructive',
      });
    },
  });

  return { setMutation, removeMutation, transferMutation };
}
