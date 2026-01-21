/**
 * Hooki React Query dla modułu Zestawienie Miesięczne Produkcji
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productionReportsApi } from '../api/productionReportsApi';
import type {
  UpdateReportItemInput,
  UpdateInvoiceInput,
  UpdateAtypicalInput,
} from '../types';

// ============================================
// QUERY KEYS
// ============================================

export const productionReportKeys = {
  all: ['production-report'] as const,
  report: (year: number, month: number) =>
    ['production-report', year, month] as const,
  summary: (year: number, month: number) =>
    ['production-report-summary', year, month] as const,
};

// ============================================
// QUERY HOOKS (Suspense)
// ============================================

/**
 * Hook do pobierania raportu produkcji dla danego miesiąca
 */
export function useProductionReport(year: number, month: number) {
  return useQuery({
    queryKey: productionReportKeys.report(year, month),
    queryFn: () => productionReportsApi.getReport(year, month),
    staleTime: 30 * 1000, // 30 sekund
  });
}

/**
 * Hook do pobierania podsumowań raportu
 */
export function useProductionReportSummary(year: number, month: number) {
  return useQuery({
    queryKey: productionReportKeys.summary(year, month),
    queryFn: () => productionReportsApi.getSummary(year, month),
    staleTime: 30 * 1000,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook do aktualizacji pozycji raportu (ilości, RW checkboxy)
 */
export function useUpdateReportItem(callbacks?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      year,
      month,
      orderId,
      data,
    }: {
      year: number;
      month: number;
      orderId: number;
      data: UpdateReportItemInput;
    }) => productionReportsApi.updateReportItem(year, month, orderId, data),

    onSuccess: (_, variables) => {
      // Invaliduj raport i podsumowania dla danego miesiąca
      queryClient.invalidateQueries({
        queryKey: productionReportKeys.report(variables.year, variables.month),
      });
      queryClient.invalidateQueries({
        queryKey: productionReportKeys.summary(variables.year, variables.month),
      });
      callbacks?.onSuccess?.();
    },
  });
}

/**
 * Hook do aktualizacji danych FV dla pozycji
 */
export function useUpdateInvoice(callbacks?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      year,
      month,
      orderId,
      data,
    }: {
      year: number;
      month: number;
      orderId: number;
      data: UpdateInvoiceInput;
    }) => productionReportsApi.updateInvoice(year, month, orderId, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: productionReportKeys.report(variables.year, variables.month),
      });
      callbacks?.onSuccess?.();
    },
  });
}

/**
 * Hook do aktualizacji nietypówek
 */
export function useUpdateAtypical(callbacks?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      year,
      month,
      data,
    }: {
      year: number;
      month: number;
      data: UpdateAtypicalInput;
    }) => productionReportsApi.updateAtypical(year, month, data),

    onSuccess: (_, variables) => {
      // Invaliduj raport i podsumowania
      queryClient.invalidateQueries({
        queryKey: productionReportKeys.report(variables.year, variables.month),
      });
      queryClient.invalidateQueries({
        queryKey: productionReportKeys.summary(variables.year, variables.month),
      });
      callbacks?.onSuccess?.();
    },
  });
}

/**
 * Hook do zamknięcia miesiąca
 */
export function useCloseMonth(callbacks?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      productionReportsApi.closeMonth(year, month),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: productionReportKeys.report(variables.year, variables.month),
      });
      callbacks?.onSuccess?.();
    },
  });
}

/**
 * Hook do odblokowania miesiąca
 */
export function useReopenMonth(callbacks?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      productionReportsApi.reopenMonth(year, month),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: productionReportKeys.report(variables.year, variables.month),
      });
      callbacks?.onSuccess?.();
    },
  });
}

// ============================================
// AUTO-FILL FV HOOKS
// ============================================

/**
 * Hook do pobierania preview auto-fill FV
 * Pokazuje które zlecenia zostaną zaktualizowane (ta sama data dostawy)
 */
export function useInvoiceAutoFillPreview(
  year: number,
  month: number,
  sourceOrderId: number | null,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: [...productionReportKeys.report(year, month), 'auto-fill-preview', sourceOrderId],
    queryFn: () => {
      if (!sourceOrderId) throw new Error('sourceOrderId is required');
      return productionReportsApi.getInvoiceAutoFillPreview(year, month, sourceOrderId);
    },
    enabled: enabled && sourceOrderId !== null,
    staleTime: 10 * 1000, // 10 sekund - krótko bo dane się zmieniają
  });
}

/**
 * Hook do wykonania auto-fill FV
 */
export function useExecuteInvoiceAutoFill(callbacks?: {
  onSuccess?: (result: {
    updatedCount: number;
    skippedCount: number;
    updatedOrders: string[];
    skippedOrders: string[];
  }) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      year,
      month,
      sourceOrderId,
      invoiceNumber,
      skipConflicts,
    }: {
      year: number;
      month: number;
      sourceOrderId: number;
      invoiceNumber: string;
      skipConflicts: boolean;
    }) =>
      productionReportsApi.executeInvoiceAutoFill(
        year,
        month,
        sourceOrderId,
        invoiceNumber,
        skipConflicts
      ),

    onSuccess: (result, variables) => {
      // Invaliduj raport po auto-fill
      queryClient.invalidateQueries({
        queryKey: productionReportKeys.report(variables.year, variables.month),
      });
      callbacks?.onSuccess?.(result);
    },
  });
}
