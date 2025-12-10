import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { glassDeliveriesApi, glassValidationsApi } from '../api/glassDeliveriesApi';
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

export function useGlassDeliveries(filters?: GlassDeliveryFilters) {
  return useQuery({
    queryKey: glassDeliveryKeys.list(filters),
    queryFn: () => glassDeliveriesApi.getAll(filters),
  });
}

export function useGlassDeliveryDetail(id: number) {
  return useQuery({
    queryKey: glassDeliveryKeys.detail(id),
    queryFn: () => glassDeliveriesApi.getById(id),
    enabled: id > 0,
  });
}

export function useImportGlassDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => glassDeliveriesApi.importFromCsv(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: glassDeliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: validationKeys.dashboard() });
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
  });
}
