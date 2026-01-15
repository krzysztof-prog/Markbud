/**
 * Hook for managing color isTypical flag
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import {
  getColorsWithTypical,
  updateColorTypical,
  bulkUpdateColorTypical,
} from '../api';

const QUERY_KEY = ['colors-typical'];

export function useColorsWithTypical() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getColorsWithTypical,
  });
}

export function useUpdateColorTypical() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isTypical }: { id: number; isTypical: boolean }) =>
      updateColorTypical(id, isTypical),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      showErrorToast(getErrorMessage(error));
    },
  });
}

export function useBulkUpdateColorTypical() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (colors: { id: number; isTypical: boolean }[]) =>
      bulkUpdateColorTypical(colors),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast(`Zaktualizowano ${data.updated} kolorów`);
    },
    onError: (error: Error) => {
      showErrorToast(getErrorMessage(error));
    },
  });
}
