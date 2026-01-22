/**
 * React Query hooks for OKUC Locations management
 *
 * Zarzadzanie lokalizacjami magazynowymi okuc (Schuco, Namiot, Hala skrzydla, etc.)
 * Uzywane w zakladce Ustawien - Magazyny OKUC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { okucLocationsApi } from '../api';
import { toast } from '@/hooks/useToast';
import type { OkucLocation } from '@/types/okuc';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const okucLocationsKeys = {
  all: ['okuc-locations'] as const,
  list: () => [...okucLocationsKeys.all, 'list'] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Hook do pobierania listy lokalizacji magazynowych
 * Zawiera liczbe artykulow przypisanych do kazdej lokalizacji (articlesCount)
 */
export function useOkucLocations() {
  return useQuery({
    queryKey: okucLocationsKeys.list(),
    queryFn: okucLocationsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minut - lokalizacje rzadko sie zmieniaja
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook do tworzenia nowej lokalizacji
 */
export function useCreateOkucLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; sortOrder?: number }) =>
      okucLocationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: okucLocationsKeys.all });
      toast({
        title: 'Lokalizacja dodana',
        description: 'Nowa lokalizacja została pomyślnie utworzona.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd tworzenia lokalizacji',
        description: error.message || 'Nie udało się utworzyć lokalizacji.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook do aktualizacji lokalizacji
 */
export function useUpdateOkucLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; sortOrder?: number };
    }) => okucLocationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: okucLocationsKeys.all });
      toast({
        title: 'Lokalizacja zaktualizowana',
        description: 'Zmiany zostały zapisane.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji lokalizacji',
        description: error.message || 'Nie udało się zaktualizować lokalizacji.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook do usuwania lokalizacji (soft delete)
 */
export function useDeleteOkucLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => okucLocationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: okucLocationsKeys.all });
      toast({
        title: 'Lokalizacja usunięta',
        description: 'Lokalizacja została pomyślnie usunięta.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd usuwania lokalizacji',
        description: error.message || 'Nie udało się usunąć lokalizacji.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook do zmiany kolejnosci lokalizacji (drag & drop)
 */
export function useReorderOkucLocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => okucLocationsApi.reorder(ids),
    // Optymistyczne aktualizowanie kolejnosci
    onMutate: async (newIds) => {
      // Anuluj wszystkie oczekujace requesty
      await queryClient.cancelQueries({ queryKey: okucLocationsKeys.list() });

      // Zapisz poprzedni stan
      const previousLocations = queryClient.getQueryData<OkucLocation[]>(
        okucLocationsKeys.list()
      );

      // Optymistycznie zaktualizuj cache
      if (previousLocations) {
        const reorderedLocations = newIds
          .map((id, index) => {
            const location = previousLocations.find((l) => l.id === id);
            return location ? { ...location, sortOrder: index } : null;
          })
          .filter((l): l is OkucLocation => l !== null);

        queryClient.setQueryData(okucLocationsKeys.list(), reorderedLocations);
      }

      return { previousLocations };
    },
    onError: (_err, _newIds, context) => {
      // W razie bledu przywroc poprzedni stan
      if (context?.previousLocations) {
        queryClient.setQueryData(
          okucLocationsKeys.list(),
          context.previousLocations
        );
      }
      toast({
        title: 'Błąd zmiany kolejności',
        description: 'Nie udało się zmienić kolejności lokalizacji.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Kolejność zmieniona',
        description: 'Nowa kolejność lokalizacji została zapisana.',
        variant: 'success',
      });
    },
    onSettled: () => {
      // Zawsze odswiezamy po mutacji
      queryClient.invalidateQueries({ queryKey: okucLocationsKeys.all });
    },
  });
}

/**
 * Hook agregujacy wszystkie mutacje lokalizacji
 * Uzycie: const { createMutation, updateMutation, deleteMutation, reorderMutation } = useOkucLocationMutations()
 */
export function useOkucLocationMutations(callbacks?: {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onReorderSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: { name: string; sortOrder?: number }) =>
      okucLocationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: okucLocationsKeys.all });
      toast({
        title: 'Lokalizacja dodana',
        description: 'Nowa lokalizacja została pomyślnie utworzona.',
        variant: 'success',
      });
      callbacks?.onCreateSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd tworzenia lokalizacji',
        description: error.message || 'Nie udało się utworzyć lokalizacji.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; sortOrder?: number };
    }) => okucLocationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: okucLocationsKeys.all });
      toast({
        title: 'Lokalizacja zaktualizowana',
        description: 'Zmiany zostały zapisane.',
        variant: 'success',
      });
      callbacks?.onUpdateSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji lokalizacji',
        description: error.message || 'Nie udało się zaktualizować lokalizacji.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => okucLocationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: okucLocationsKeys.all });
      toast({
        title: 'Lokalizacja usunięta',
        description: 'Lokalizacja została pomyślnie usunięta.',
        variant: 'success',
      });
      callbacks?.onDeleteSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd usuwania lokalizacji',
        description: error.message || 'Nie udało się usunąć lokalizacji.',
        variant: 'destructive',
      });
      callbacks?.onDeleteError?.(error);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => okucLocationsApi.reorder(ids),
    onMutate: async (newIds) => {
      await queryClient.cancelQueries({ queryKey: okucLocationsKeys.list() });

      const previousLocations = queryClient.getQueryData<OkucLocation[]>(
        okucLocationsKeys.list()
      );

      if (previousLocations) {
        const reorderedLocations = newIds
          .map((id, index) => {
            const location = previousLocations.find((l) => l.id === id);
            return location ? { ...location, sortOrder: index } : null;
          })
          .filter((l): l is OkucLocation => l !== null);

        queryClient.setQueryData(okucLocationsKeys.list(), reorderedLocations);
      }

      return { previousLocations };
    },
    onSuccess: () => {
      toast({
        title: 'Kolejność zmieniona',
        description: 'Nowa kolejność lokalizacji została zapisana.',
        variant: 'success',
      });
    },
    onError: (_err, _newIds, context) => {
      if (context?.previousLocations) {
        queryClient.setQueryData(
          okucLocationsKeys.list(),
          context.previousLocations
        );
      }
      toast({
        title: 'Błąd zmiany kolejności',
        description: 'Nie udało się zmienić kolejności lokalizacji.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: okucLocationsKeys.all });
      callbacks?.onReorderSuccess?.();
    },
  });

  return { createMutation, updateMutation, deleteMutation, reorderMutation };
}
