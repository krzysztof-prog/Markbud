/**
 * Hook for managing efficiency configurations
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import {
  getEfficiencyConfigs,
  createEfficiencyConfig,
  updateEfficiencyConfig,
  deleteEfficiencyConfig,
  type EfficiencyConfigInput,
} from '../api';

const QUERY_KEY = ['efficiency-configs'];

export function useEfficiencyConfigs() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getEfficiencyConfigs,
  });
}

export function useCreateEfficiencyConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EfficiencyConfigInput) => createEfficiencyConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Konfiguracja wydajności została dodana');
    },
    onError: (error: Error) => {
      showErrorToast(getErrorMessage(error));
    },
  });
}

export function useUpdateEfficiencyConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EfficiencyConfigInput> }) =>
      updateEfficiencyConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Konfiguracja wydajności została zaktualizowana');
    },
    onError: (error: Error) => {
      showErrorToast(getErrorMessage(error));
    },
  });
}

export function useDeleteEfficiencyConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteEfficiencyConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Konfiguracja wydajności została usunięta');
    },
    onError: (error: Error) => {
      showErrorToast(getErrorMessage(error));
    },
  });
}
