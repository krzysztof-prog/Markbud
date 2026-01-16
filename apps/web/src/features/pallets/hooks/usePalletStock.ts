/**
 * Hooki React Query dla modułu paletówek
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { palletStockApi } from '../api/palletStockApi';
import type {
  UpdatePalletDayEntry,
  CorrectMorningStockInput,
  ProductionPalletType,
  PalletAlertConfig,
} from '../types/index';

// ============================================
// QUERY KEYS
// ============================================

export const palletStockKeys = {
  all: ['palletStock'] as const,
  day: {
    all: ['palletStock', 'day'] as const,
    detail: (date: string) => ['palletStock', 'day', date] as const,
  },
  month: {
    all: ['palletStock', 'month'] as const,
    summary: (year: number, month: number) =>
      ['palletStock', 'month', 'summary', { year, month }] as const,
  },
  alertConfig: ['palletStock', 'alertConfig'] as const,
};

// ============================================
// DAY HOOKS
// ============================================

/**
 * Pobierz dane dnia paletowego
 */
export function usePalletDay(date: string, enabled = true) {
  return useQuery({
    queryKey: palletStockKeys.day.detail(date),
    queryFn: () => palletStockApi.day.getDay(date),
    enabled: enabled && !!date,
  });
}

/**
 * Mutacja do aktualizacji wpisów dnia
 */
export function usePalletDayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, entries }: { date: string; entries: UpdatePalletDayEntry[] }) =>
      palletStockApi.day.updateDay(date, entries),
    onSuccess: (_, variables) => {
      // Invaliduj dane dnia
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.day.detail(variables.date),
      });
      // Invaliduj podsumowania miesięcy (mogą się zmienić)
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.month.all,
      });
    },
  });
}

/**
 * Mutacja do zamknięcia dnia
 */
export function useCloseDayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => palletStockApi.day.closeDay(date),
    onSuccess: (_, date) => {
      // Invaliduj dane dnia
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.day.detail(date),
      });
      // Invaliduj wszystkie dni (kolejny dzień może teraz mieć stan poranny)
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.day.all,
      });
      // Invaliduj podsumowania miesięcy
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.month.all,
      });
    },
  });
}

/**
 * Mutacja do korekty stanu porannego
 */
export function useCorrectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      date,
      type,
      input,
    }: {
      date: string;
      type: ProductionPalletType;
      input: CorrectMorningStockInput;
    }) => palletStockApi.day.correctMorningStock(date, type, input),
    onSuccess: (_, variables) => {
      // Invaliduj dane dnia
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.day.detail(variables.date),
      });
      // Invaliduj podsumowania miesięcy (stan początkowy może się zmienić)
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.month.all,
      });
    },
  });
}

// ============================================
// MONTH HOOKS
// ============================================

/**
 * Pobierz podsumowanie miesiąca
 */
export function usePalletMonth(year: number, month: number, enabled = true) {
  return useQuery({
    queryKey: palletStockKeys.month.summary(year, month),
    queryFn: () => palletStockApi.month.getMonthSummary(year, month),
    enabled: enabled && year > 0 && month > 0 && month <= 12,
  });
}

/**
 * Pobierz kalendarz miesiąca ze statusami dni
 */
export function usePalletCalendar(year: number, month: number, enabled = true) {
  return useQuery({
    queryKey: ['palletStock', 'calendar', { year, month }],
    queryFn: () => palletStockApi.month.getCalendar(year, month),
    enabled: enabled && year > 0 && month > 0 && month <= 12,
  });
}

// ============================================
// ALERT CONFIG HOOKS
// ============================================

/**
 * Pobierz konfigurację alertów
 */
export function usePalletAlertConfig(enabled = true) {
  return useQuery({
    queryKey: palletStockKeys.alertConfig,
    queryFn: () => palletStockApi.alertConfig.getConfig(),
    enabled,
  });
}

/**
 * Mutacja do aktualizacji konfiguracji alertów
 */
export function useAlertConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configs: PalletAlertConfig[]) =>
      palletStockApi.alertConfig.updateConfig(configs),
    onSuccess: () => {
      // Invaliduj konfigurację alertów
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.alertConfig,
      });
      // Invaliduj wszystkie dni (alerty mogą się zmienić)
      queryClient.invalidateQueries({
        queryKey: palletStockKeys.day.all,
      });
    },
  });
}
