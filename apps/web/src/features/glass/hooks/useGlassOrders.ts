import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { glassOrdersApi } from '../api/glassOrdersApi';
import type { GlassOrderFilters } from '../types';

export const glassOrderKeys = {
  all: ['glass-orders'] as const,
  lists: () => [...glassOrderKeys.all, 'list'] as const,
  list: (filters?: GlassOrderFilters) => [...glassOrderKeys.lists(), filters] as const,
  details: () => [...glassOrderKeys.all, 'detail'] as const,
  detail: (id: number) => [...glassOrderKeys.details(), id] as const,
  summary: (id: number) => [...glassOrderKeys.detail(id), 'summary'] as const,
  validations: (id: number) => [...glassOrderKeys.detail(id), 'validations'] as const,
};

export function useGlassOrders(filters?: GlassOrderFilters) {
  return useQuery({
    queryKey: glassOrderKeys.list(filters),
    queryFn: () => glassOrdersApi.getAll(filters),
  });
}

export function useGlassOrderDetail(id: number) {
  return useQuery({
    queryKey: glassOrderKeys.detail(id),
    queryFn: () => glassOrdersApi.getById(id),
    enabled: id > 0,
  });
}

export function useGlassOrderSummary(id: number) {
  return useQuery({
    queryKey: glassOrderKeys.summary(id),
    queryFn: () => glassOrdersApi.getSummary(id),
    enabled: id > 0,
  });
}

export function useImportGlassOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, replace = false }: { file: File; replace?: boolean }) =>
      glassOrdersApi.importFromTxt(file, replace),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: glassOrderKeys.lists() });
      showSuccessToast('Import udany', `Zamowienie ${data.glassOrderNumber} zaimportowane`);
    },
    onError: (error: unknown) => {
      const err = error as { status?: number };
      // Don't show toast for conflict errors (409) - they're handled by the modal in component
      if (err?.status !== 409) {
        showErrorToast('Blad importu', getErrorMessage(error as Error));
      }
      // NOTE: Don't re-throw here! React Query doesn't allow it in onError.
      // Component will catch error via mutateAsync().catch() instead.
    },
  });
}

export function useDeleteGlassOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => glassOrdersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glassOrderKeys.lists() });
      showSuccessToast('Zamowienie usuniete');
    },
    onError: (error: unknown) => {
      showErrorToast('Blad', getErrorMessage(error));
    },
  });
}
