/**
 * React Query hooks dla modułu sprawdzania etykiet (Label Checks)
 * Moduł OCR do weryfikacji dat na etykietach vs daty dostaw
 */

import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { labelChecksApi } from '../api/labelChecksApi';
import type { LabelCheckFilters, CreateLabelCheckRequest, LabelCheck } from '../types';

// ========== Query Keys ==========

export const labelCheckKeys = {
  all: ['label-checks'] as const,
  lists: () => [...labelCheckKeys.all, 'list'] as const,
  list: (filters?: LabelCheckFilters) => [...labelCheckKeys.lists(), filters] as const,
  details: () => [...labelCheckKeys.all, 'detail'] as const,
  detail: (id: number) => [...labelCheckKeys.details(), id] as const,
  deliveryLatest: (deliveryId: number) => [...labelCheckKeys.all, 'delivery', deliveryId, 'latest'] as const,
};

// ========== Query Hooks ==========

/**
 * Hook do pobierania listy sprawdzen z filtrami i paginacja
 * Uzywa useSuspenseQuery - wymaga Suspense boundary w komponencie nadrzednym
 * @param filters - Opcjonalne filtry (status, deliveryId, daty, paginacja)
 */
export function useLabelChecks(filters?: LabelCheckFilters) {
  return useSuspenseQuery({
    queryKey: labelCheckKeys.list(filters),
    queryFn: () => labelChecksApi.getAll(filters),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

/**
 * Hook do pobierania szczegółow sprawdzenia
 * Uzywa useSuspenseQuery - wymaga Suspense boundary w komponencie nadrzednym
 * @param id - ID sprawdzenia
 */
export function useLabelCheck(id: number) {
  return useSuspenseQuery({
    queryKey: labelCheckKeys.detail(id),
    queryFn: () => labelChecksApi.getById(id),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

/**
 * Hook do pobierania ostatniego sprawdzenia dla dostawy
 * Uzywa useSuspenseQuery - wymaga Suspense boundary w komponencie nadrzednym
 * @param deliveryId - ID dostawy
 */
export function useLatestLabelCheck(deliveryId: number) {
  return useSuspenseQuery({
    queryKey: labelCheckKeys.deliveryLatest(deliveryId),
    queryFn: () => labelChecksApi.getLatestForDelivery(deliveryId),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

// ========== Mutation Hooks ==========

/**
 * Hook do uruchamiania sprawdzania etykiet
 * Po sukcesie invaliduje liste sprawdzen i query dla konkretnej dostawy
 */
export function useCheckLabels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLabelCheckRequest) => labelChecksApi.check(data),
    onSuccess: (data: LabelCheck) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: labelCheckKeys.lists() });
      // Invalidate delivery-specific query
      queryClient.invalidateQueries({ queryKey: labelCheckKeys.deliveryLatest(data.deliveryId) });
      showSuccessToast('Sprawdzanie uruchomione', 'Proces OCR został rozpoczęty');
    },
    onError: (error: unknown) => {
      showErrorToast('Błąd', getErrorMessage(error));
    },
  });
}

/**
 * Hook do usuwania sprawdzenia (soft delete)
 * Po sukcesie invaliduje wszystkie query zwiazane ze sprawdzeniami
 */
export function useDeleteLabelCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => labelChecksApi.delete(id),
    onSuccess: () => {
      // Invalidate all label-check queries
      queryClient.invalidateQueries({ queryKey: labelCheckKeys.all });
      showSuccessToast('Usunięto', 'Sprawdzenie zostało usunięte');
    },
    onError: (error: unknown) => {
      showErrorToast('Błąd usuwania', getErrorMessage(error));
    },
  });
}

// ========== Utility Hooks ==========

/**
 * Hook do pobierania URL eksportu Excel
 * Nie uzywa React Query - zwraca bezposrednio URL i funkcje pobierania
 * @param id - ID sprawdzenia
 * @returns Obiekt z URL eksportu i funkcja download
 */
export function useExportLabelCheck(id: number) {
  return {
    /** URL do pobrania raportu Excel */
    exportUrl: labelChecksApi.getExportUrl(id),
    /** Otwiera raport Excel w nowej karcie/pobiera */
    download: () => {
      window.open(labelChecksApi.getExportUrl(id), '_blank');
    },
  };
}
