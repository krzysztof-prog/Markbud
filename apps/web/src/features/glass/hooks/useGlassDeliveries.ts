import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { glassDeliveriesApi, glassValidationsApi, glassDeliveriesApi_extended } from '../api/glassDeliveriesApi';
import type { GlassDeliveryFilters } from '../types';

export const glassDeliveryKeys = {
  all: ['glass-deliveries'] as const,
  lists: () => [...glassDeliveryKeys.all, 'list'] as const,
  list: (filters?: GlassDeliveryFilters) => [...glassDeliveryKeys.lists(), filters] as const,
  details: () => [...glassDeliveryKeys.all, 'detail'] as const,
  detail: (id: number) => [...glassDeliveryKeys.details(), id] as const,
};

export const validationKeys = {
  all: ['glass-validations'] as const,
  dashboard: () => [...validationKeys.all, 'dashboard'] as const,
  byOrder: (orderNumber: string) => [...validationKeys.all, 'order', orderNumber] as const,
};

// ========== Kategoryzowane Szyby ==========

export const categorizedGlassKeys = {
  loose: ['glass-deliveries', 'categorized', 'loose'] as const,
  aluminum: ['glass-deliveries', 'categorized', 'aluminum'] as const,
  aluminumSummary: ['glass-deliveries', 'categorized', 'aluminum', 'summary'] as const,
  reclamation: ['glass-deliveries', 'categorized', 'reclamation'] as const,
};

export function useGlassDeliveries(filters?: GlassDeliveryFilters) {
  return useQuery({
    queryKey: glassDeliveryKeys.list(filters),
    queryFn: () => glassDeliveriesApi.getAll(filters),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

export function useGlassDeliveryDetail(id: number) {
  return useQuery({
    queryKey: glassDeliveryKeys.detail(id),
    queryFn: () => glassDeliveriesApi.getById(id),
    enabled: id > 0,
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

export function useImportGlassDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      console.log('[useImportGlassDelivery] Starting import for file:', file.name, 'size:', file.size);
      try {
        const result = await glassDeliveriesApi.importFromCsv(file);
        console.log('[useImportGlassDelivery] Import success:', result);
        return result;
      } catch (error) {
        console.error('[useImportGlassDelivery] Import failed:', error);
        throw error;
      }
    },
    onMutate: () => {
      // Disable refetching during import to prevent interference
      queryClient.cancelQueries({ queryKey: ['glass-deliveries', 'latest-import'] });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: glassDeliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: validationKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: ['glass-deliveries', 'latest-import'] });
      // Invaliduj też kategorie szyb
      queryClient.invalidateQueries({ queryKey: categorizedGlassKeys.loose });
      queryClient.invalidateQueries({ queryKey: categorizedGlassKeys.aluminum });
      queryClient.invalidateQueries({ queryKey: categorizedGlassKeys.aluminumSummary });
      queryClient.invalidateQueries({ queryKey: categorizedGlassKeys.reclamation });
      showSuccessToast('Import udany', `Dostawa ${data.rackNumber} zaimportowana`);
    },
    onError: (error: unknown) => {
      showErrorToast('Blad importu', getErrorMessage(error));
    },
  });
}

export function useDeleteGlassDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => glassDeliveriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glassDeliveryKeys.lists() });
      showSuccessToast('Dostawa usunieta');
    },
    onError: (error: unknown) => {
      showErrorToast('Blad', getErrorMessage(error));
    },
  });
}

export function useValidationDashboard() {
  return useQuery({
    queryKey: validationKeys.dashboard(),
    queryFn: () => glassValidationsApi.getDashboard(),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

export function useLatestImportSummary() {
  return useQuery({
    queryKey: ['glass-deliveries', 'latest-import'],
    queryFn: () => glassDeliveriesApi_extended.getLatestImportSummary(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useLooseGlasses() {
  return useQuery({
    queryKey: categorizedGlassKeys.loose,
    queryFn: () => glassDeliveriesApi.getLooseGlasses(),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

export function useAluminumGlasses() {
  return useQuery({
    queryKey: categorizedGlassKeys.aluminum,
    queryFn: () => glassDeliveriesApi.getAluminumGlasses(),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

export function useAluminumGlassesSummary() {
  return useQuery({
    queryKey: categorizedGlassKeys.aluminumSummary,
    queryFn: () => glassDeliveriesApi.getAluminumGlassesSummary(),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}

export function useReclamationGlasses() {
  return useQuery({
    queryKey: categorizedGlassKeys.reclamation,
    queryFn: () => glassDeliveriesApi.getReclamationGlasses(),
    staleTime: 2 * 60 * 1000, // 2 minuty cache
  });
}
