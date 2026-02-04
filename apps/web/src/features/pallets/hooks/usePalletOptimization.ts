/**
 * Pallet Optimization hooks - data fetching i mutations
 */

import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastMutation } from '@/hooks/useToastMutation';
import { palletsApi } from '../api/palletsApi';
import { getTodayWarsaw } from '@/lib/date-utils';
import type { OptimizationResult } from '@/types/pallet';

// ==================== QUERY KEYS ====================

export const PALLET_OPTIMIZATION_QUERY_KEY = (deliveryId: number) =>
  ['pallet-optimization', deliveryId] as const;

export const PALLET_TYPES_QUERY_KEY = () => ['pallet-types'] as const;

// ==================== HOOKS - OPTIMIZATION ====================

/**
 * Hook do pobierania optymalizacji dla dostawy
 * Używa useQuery zamiast useSuspenseQuery aby umożliwić obsługę 404 bez error boundary
 *
 * @param deliveryId - ID dostawy
 *
 * @example
 * ```tsx
 * function OptimizationResults() {
 *   const { data, error, isLoading } = usePalletOptimization(123);
 *   if (isLoading) return <div>Ładowanie...</div>;
 *   if (error?.status === 404) return <div>Brak optymalizacji</div>;
 *   return <div>{data.totalPallets} palet</div>;
 * }
 * ```
 */
export function usePalletOptimization(deliveryId: number) {
  return useQuery({
    queryKey: PALLET_OPTIMIZATION_QUERY_KEY(deliveryId),
    queryFn: () => palletsApi.getOptimization(deliveryId),
    staleTime: 5 * 60 * 1000, // 5 minut
    retry: false, // Nie ponawiaj jeśli brak optymalizacji (404)
  });
}

/**
 * Parametry dla mutacji optymalizacji
 */
interface OptimizeMutationParams {
  deliveryId: number;
  options?: Partial<import('@/types/pallet').OptimizationOptions>;
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
 *     <button onClick={() => optimizeMutation.mutate({ deliveryId: 123, options: { preferStandardPallets: true } })}>
 *       {optimizeMutation.isPending ? 'Optymalizacja...' : 'Optymalizuj'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useOptimizePallet() {
  const queryClient = useQueryClient();

  return useToastMutation({
    mutationFn: ({ deliveryId, options }: OptimizeMutationParams) =>
      palletsApi.optimize(deliveryId, options),
    successMessage: (data: OptimizationResult) =>
      `Optymalizacja zakończona: ${data.pallets?.length || 0} palet`,
    errorMessage: 'Nie udało się zoptymalizować palet',
    onSuccess: (data: OptimizationResult, { deliveryId }: OptimizeMutationParams) => {
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

  return useToastMutation({
    mutationFn: (deliveryId: number) => palletsApi.deleteOptimization(deliveryId),
    successMessage: 'Optymalizacja usunięta',
    errorMessage: 'Nie udało się usunąć optymalizacji',
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
  return useToastMutation({
    mutationFn: async (deliveryId: number) => {
      const blob = await palletsApi.exportToPdf(deliveryId);

      // Utwórz URL do blob
      const url = window.URL.createObjectURL(blob);

      // Utwórz link do pobrania
      const a = document.createElement('a');
      a.href = url;
      a.download = `palety_dostawa_${deliveryId}_${getTodayWarsaw()}.pdf`;

      // Kliknij automatycznie
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    successMessage: 'PDF został pobrany',
    errorMessage: 'Nie udało się pobrać PDF',
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

  return useToastMutation({
    mutationFn: palletsApi.createPalletType,
    successMessage: 'Typ palety utworzony',
    errorMessage: 'Nie udało się utworzyć typu palety',
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

  return useToastMutation({
    mutationFn: ({ id, data }: { id: number; data: import('@/types/pallet').UpdatePalletTypeRequest }) =>
      palletsApi.updatePalletType(id, data),
    successMessage: 'Typ palety zaktualizowany',
    errorMessage: 'Nie udało się zaktualizować typu palety',
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

  return useToastMutation({
    mutationFn: (id: number) => palletsApi.deletePalletType(id),
    successMessage: 'Typ palety usunięty',
    errorMessage: 'Nie udało się usunąć typu palety',
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
