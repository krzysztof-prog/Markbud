/**
 * Hooks for Attendance (BZ) module
 * Moduł BZ - widok miesięczny obecności pracowników
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { attendanceApi } from '../api/attendanceApi';
import type { UpdateDayRequest } from '../types';

// Query key factory
export const attendanceKeys = {
  all: ['attendance'] as const,
  monthly: (year: number, month: number) => [...attendanceKeys.all, 'monthly', year, month] as const,
};

/**
 * Hook do pobierania danych miesięcznych
 */
export function useMonthlyAttendance(year: number, month: number) {
  return useQuery({
    queryKey: attendanceKeys.monthly(year, month),
    queryFn: () => attendanceApi.getMonthlyAttendance(year, month),
    staleTime: 1000 * 60 * 5, // 5 minut
  });
}

/**
 * Hook do aktualizacji pojedynczego dnia
 */
export function useUpdateDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDayRequest) => attendanceApi.updateDay(data),
    onSuccess: (_, variables) => {
      // Parsuj datę żeby odświeżyć właściwy miesiąc
      const [yearStr, monthStr] = variables.date.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      // Odśwież dane
      queryClient.invalidateQueries({ queryKey: attendanceKeys.monthly(year, month) });
      showSuccessToast('Zapisano', 'Dane dnia zostały zaktualizowane');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd zapisu', getErrorMessage(error));
    },
  });
}
