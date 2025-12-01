/**
 * Pallet Optimization hooks - data fetching i mutations
 */

import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { palletsApi } from '../api/palletsApi';
import type { OptimizationResult } from '@/types/pallet';

// ==================== QUERY KEYS ====================

export const PALLET_OPTIMIZATION_QUERY_KEY = (deliveryId: number) =>
  ['pallet-optimization', deliveryId] as const;

export const PALLET_TYPES_QUERY_KEY = () => ['pallet-types'] as const;

// ==================== HOOKS - OPTIMIZATION ====================

/**
 * Hook do pobierania optymalizacji dla dostawy z Suspense
 *
 * @param deliveryId - ID dostawy
 * @param enabled - Czy hook ma być aktywny (domyślnie: true)
 *
 * @example
 * ```tsx
 * function OptimizationResults() {
 *   const { data } = usePalletOptimization(123);
 *   return <div>{data.totalPallets} palet</div>;
 * }
 * ```
 */
export function usePalletOptimization(deliveryId: number) {
  return useSuspenseQuery({
    queryKey: PALLET_OPTIMIZATION_QUERY_KEY(deliveryId),
    queryFn: () => palletsApi.getOptimization(deliveryId),
    staleTime: 5 * 60 * 1000, // 5 minut
    retry: false, // Nie ponawiaj jeśli brak optymalizacji (404)
  });
}

/**
 * Mutation do uruchomienia optymalizacji
 *
 * @example
 * ```tsx
 * function OptimizeButton() {
 *   const optimizeMutation = useOptimizePallet();
 *
 *   return (
 *     <button onClick={() => optimizeMutation.mutate(123)}>
 *       {optimizeMutation.isPending ? 'Optymalizacja...' : 'Optymalizuj'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useOptimizePallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: number) => palletsApi.optimize(deliveryId),
    onSuccess: (data: OptimizationResult, deliveryId: number) => {
      // Zaktualizuj cache
      queryClient.setQueryData(PALLET_OPTIMIZATION_QUERY_KEY(deliveryId), data);
    },
  });
}

/**
 * Mutation do usunięcia optymalizacji
 *
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const deleteMutation = useDeleteOptimization();
 *
 *   return (
 *     <button onClick={() => deleteMutation.mutate(123)}>
 *       Usuń optymalizację
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteOptimization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: number) => palletsApi.deleteOptimization(deliveryId),
    onSuccess: (_data, deliveryId: number) => {
      // Usuń z cache
      queryClient.removeQueries({ queryKey: PALLET_OPTIMIZATION_QUERY_KEY(deliveryId) });
    },
  });
}

/**
 * Helper do pobierania PDF z optymalizacją
 *
 * @example
 * ```tsx
 * function DownloadPdfButton() {
 *   const downloadPdf = useDownloadPdf();
 *
 *   return (
 *     <button onClick={() => downloadPdf.mutate(123)}>
 *       {downloadPdf.isPending ? 'Pobieranie...' : 'Pobierz PDF'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDownloadPdf() {
  return useMutation({
    mutationFn: async (deliveryId: number) => {
      const blob = await palletsApi.exportToPdf(deliveryId);

      // Utwórz URL do blob
      const url = window.URL.createObjectURL(blob);

      // Utwórz link do pobrania
      const a = document.createElement('a');
      a.href = url;
      a.download = `palety_dostawa_${deliveryId}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Kliknij automatycznie
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}

// ==================== HOOKS - PALLET TYPES (Admin) ====================

/**
 * Hook do pobierania typów palet z Suspense
 *
 * @example
 * ```tsx
 * function PalletTypesList() {
 *   const { data } = usePalletTypes();
 *   return <div>{data.length} typów palet</div>;
 * }
 * ```
 */
export function usePalletTypes() {
  return useSuspenseQuery({
    queryKey: PALLET_TYPES_QUERY_KEY(),
    queryFn: () => palletsApi.getPalletTypes(),
    staleTime: 10 * 60 * 1000, // 10 minut
  });
}

/**
 * Mutation do utworzenia typu palety
 */
export function useCreatePalletType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: palletsApi.createPalletType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PALLET_TYPES_QUERY_KEY() });
    },
  });
}

/**
 * Mutation do aktualizacji typu palety
 */
export function useUpdatePalletType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: import('@/types/pallet').UpdatePalletTypeRequest }) =>
      palletsApi.updatePalletType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PALLET_TYPES_QUERY_KEY() });
    },
  });
}

/**
 * Mutation do usunięcia typu palety
 */
export function useDeletePalletType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => palletsApi.deletePalletType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PALLET_TYPES_QUERY_KEY() });
    },
  });
}

// ==================== INVALIDATION HELPERS ====================

/**
 * Hook do invalidacji cache optymalizacji
 *
 * @example
 * ```tsx
 * function SomeComponent() {
 *   const invalidateOptimization = useInvalidatePalletOptimization();
 *
 *   const handleUpdate = () => {
 *     invalidateOptimization(123);
 *   };
 * }
 * ```
 */
export function useInvalidatePalletOptimization() {
  const queryClient = useQueryClient();

  return (deliveryId: number) => {
    queryClient.invalidateQueries({ queryKey: PALLET_OPTIMIZATION_QUERY_KEY(deliveryId) });
  };
}
