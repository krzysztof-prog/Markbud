import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { remanentApi } from '../api/remanentApi';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import type { RemanentSubmitData } from '@/types/warehouse';

export function useRemanentSubmit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RemanentSubmitData) => remanentApi.submit(data),
    onSuccess: (response, variables) => {
      showSuccessToast(
        'Remanent zapisany',
        `Zinwentaryzowano ${response.updates.length} profili.`
      );
      // Invalidate warehouse data
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.colorId] });
      // Invalidate history
      queryClient.invalidateQueries({ queryKey: ['remanent-history'] });
    },
    onError: (error) => {
      showErrorToast('Błąd zapisu remanentu', getErrorMessage(error));
    },
  });
}

export function useRollback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (colorId: number) => remanentApi.rollback(colorId),
    onSuccess: (response) => {
      showSuccessToast('Remanent cofnięty', response.message);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['remanent-history'] });
    },
    onError: (error) => {
      showErrorToast('Błąd cofania remanentu', getErrorMessage(error));
    },
  });
}

export function useAverageMonthly(colorId: number | null, months: number) {
  return useQuery({
    queryKey: ['warehouse-average', colorId, months],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- enabled check guarantees colorId is not null
    queryFn: () => remanentApi.getAverage(colorId!, months),
    enabled: !!colorId,
  });
}

export function useFinalizeMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { month: string; archive?: boolean }) =>
      remanentApi.finalizeMonth(data),
    onSuccess: (response) => {
      if (!response.preview) {
        showSuccessToast(
          'Miesiąc sfinalizowany',
          `Zarchiwizowano ${response.archivedCount} zleceń`
        );
        queryClient.invalidateQueries({ queryKey: ['warehouse'] });
        queryClient.invalidateQueries({ queryKey: ['orders-table'] });
      }
    },
    onError: (error) => {
      showErrorToast('Błąd finalizacji miesiąca', getErrorMessage(error));
    },
  });
}
