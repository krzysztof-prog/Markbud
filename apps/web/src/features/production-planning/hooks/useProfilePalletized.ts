/**
 * Hook for managing profile isPalletized flag
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import {
  getProfilesWithPalletized,
  updateProfilePalletized,
  bulkUpdateProfilePalletized,
} from '../api';

const QUERY_KEY = ['profiles-palletized'];

export function useProfilesWithPalletized() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getProfilesWithPalletized,
  });
}

export function useUpdateProfilePalletized() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPalletized }: { id: number; isPalletized: boolean }) =>
      updateProfilePalletized(id, isPalletized),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      showErrorToast(getErrorMessage(error));
    },
  });
}

export function useBulkUpdateProfilePalletized() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profiles: { id: number; isPalletized: boolean }[]) =>
      bulkUpdateProfilePalletized(profiles),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast(`Zaktualizowano ${data.updated} profili`);
    },
    onError: (error: Error) => {
      showErrorToast(getErrorMessage(error));
    },
  });
}
