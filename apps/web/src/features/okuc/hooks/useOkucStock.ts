/**
 * React Query Hooks for OKUC Stock Module
 *
 * Hooki do zarządzania stanami magazynowymi okuć z modułu DualStock:
 * - Lista stanów z filtrami
 * - Podsumowanie stanów (summary)
 * - Aktualizacja stanów (quantity)
 * - Historia zmian
 *
 * Backend API: apps/api/src/routes/okuc/stock.ts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { okucStockApi } from '@/features/okuc/api';
import { toast } from '@/hooks/useToast';
import type {
  OkucStock,
  StockFilters,
  UpdateStockInput,
  WarehouseType,
  SubWarehouse,
  HistoryFilters,
} from '@/types/okuc';

// ============================================================================
// QUERY KEYS - Klucze dla React Query cache
// ============================================================================

export const okucStockKeys = {
  all: ['okuc-stock'] as const,
  lists: () => [...okucStockKeys.all, 'list'] as const,
  list: (filters?: StockFilters & { belowMin?: boolean }) =>
    [...okucStockKeys.lists(), { filters }] as const,
  summaries: () => [...okucStockKeys.all, 'summary'] as const,
  summary: (warehouseType?: WarehouseType) =>
    [...okucStockKeys.summaries(), { warehouseType }] as const,
  belowMin: (warehouseType?: WarehouseType) =>
    [...okucStockKeys.all, 'below-min', { warehouseType }] as const,
  details: () => [...okucStockKeys.all, 'detail'] as const,
  detail: (id: number) => [...okucStockKeys.details(), id] as const,
  byArticle: (articleId: number, warehouseType: WarehouseType, subWarehouse?: SubWarehouse) =>
    [...okucStockKeys.all, 'by-article', { articleId, warehouseType, subWarehouse }] as const,
  history: (articleId: number, filters?: HistoryFilters) =>
    [...okucStockKeys.all, 'history', articleId, { filters }] as const,
};

// ============================================================================
// QUERIES - Pobieranie danych
// ============================================================================

/**
 * Hook do pobierania listy stanów magazynowych z opcjonalnymi filtrami
 *
 * @param filters - Opcjonalne filtry (articleId, warehouseType, subWarehouse, belowMin)
 * @returns Query result z listą stanów
 *
 * @example
 * const { data: stocks, isLoading } = useOkucStock({ warehouseType: 'pvc' });
 */
export function useOkucStock(filters?: StockFilters & { belowMin?: boolean }) {
  return useQuery({
    queryKey: okucStockKeys.list(filters),
    queryFn: () => okucStockApi.getAll(filters),
    staleTime: 2 * 60 * 1000, // 2 minuty (dane zmieniają się częściej niż artykuły)
  });
}

/**
 * Hook do pobierania podsumowania stanów magazynowych
 *
 * Zwraca agregacje pogrupowane po magazynach i podmagazynach:
 * - Łączna liczba artykułów
 * - Łączna ilość
 * - Liczba stanów krytycznych (poniżej minimum)
 * - Suma zarezerwowanych
 *
 * @param warehouseType - Opcjonalny filtr po typie magazynu ('pvc' | 'alu')
 * @returns Query result z listą podsumowań
 *
 * @example
 * const { data: summary } = useOkucStockSummary('pvc');
 * // summary: [{ warehouseType: 'pvc', subWarehouse: 'production', totalArticles: 50, ... }, ...]
 */
export function useOkucStockSummary(warehouseType?: WarehouseType) {
  return useQuery({
    queryKey: okucStockKeys.summary(warehouseType),
    queryFn: () => okucStockApi.getSummary(warehouseType),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania artykułów z krytycznym stanem (poniżej minimum)
 *
 * @param warehouseType - Opcjonalny filtr po typie magazynu
 * @returns Query result z listą krytycznych stanów
 *
 * @example
 * const { data: criticalStocks } = useOkucStockBelowMinimum();
 */
export function useOkucStockBelowMinimum(warehouseType?: WarehouseType) {
  return useQuery({
    queryKey: okucStockKeys.belowMin(warehouseType),
    queryFn: () => okucStockApi.getBelowMinimum(warehouseType),
    staleTime: 2 * 60 * 1000, // 2 minuty
  });
}

/**
 * Hook do pobierania pojedynczego stanu magazynowego po ID
 *
 * @param id - ID stanu magazynowego
 * @returns Query result ze stanem magazynowym
 *
 * @example
 * const { data: stock, isLoading } = useOkucStockById(123);
 */
export function useOkucStockById(id: number) {
  return useQuery({
    queryKey: okucStockKeys.detail(id),
    queryFn: () => okucStockApi.getById(id),
    enabled: !!id, // Nie wykonuj zapytania jeśli brak ID
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook do pobierania stanu magazynowego dla konkretnego artykułu i magazynu
 *
 * @param articleId - ID artykułu
 * @param warehouseType - Typ magazynu ('pvc' | 'alu')
 * @param subWarehouse - Podmagazyn (tylko dla PVC)
 * @returns Query result ze stanem magazynowym
 *
 * @example
 * const { data: stock } = useOkucStockByArticle(123, 'pvc', 'production');
 */
export function useOkucStockByArticle(
  articleId: number,
  warehouseType: WarehouseType,
  subWarehouse?: SubWarehouse
) {
  return useQuery({
    queryKey: okucStockKeys.byArticle(articleId, warehouseType, subWarehouse),
    queryFn: () => okucStockApi.getByArticle(articleId, warehouseType, subWarehouse),
    enabled: !!articleId && !!warehouseType,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook do pobierania historii zmian stanu dla artykułu
 *
 * @param articleId - ID artykułu
 * @param filters - Opcjonalne filtry historii (warehouseType, eventType, dateRange, etc.)
 * @returns Query result z historią zmian
 *
 * @example
 * const { data: history } = useOkucStockHistory(123, { warehouseType: 'pvc' });
 */
export function useOkucStockHistory(articleId: number, filters?: HistoryFilters) {
  return useQuery({
    queryKey: okucStockKeys.history(articleId, filters),
    queryFn: () => okucStockApi.getHistory(articleId, filters),
    enabled: !!articleId,
    staleTime: 5 * 60 * 1000, // Historia zmienia się rzadko
  });
}

// ============================================================================
// MUTATIONS - Modyfikacja danych
// ============================================================================

/**
 * Hook do aktualizacji stanu magazynowego (quantity)
 *
 * UWAGA: Używa optimistic locking (version field) dla bezpieczeństwa.
 *
 * Po sukcesie:
 * - Invaliduje listę stanów
 * - Invaliduje podsumowania
 * - Invaliduje szczegóły stanu
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useUpdateOkucStock();
 * mutate({
 *   id: 123,
 *   data: { quantity: 50, reason: 'Korekta po inwentaryzacji' },
 *   version: 5
 * });
 */
export function useUpdateOkucStock(callbacks?: {
  onSuccess?: (stock: OkucStock) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, version }: { id: number; data: UpdateStockInput; version: number }) =>
      okucStockApi.update(id, { ...data, version }),
    onSuccess: (stock) => {
      // Invaliduj wszystkie listy stanów
      queryClient.invalidateQueries({ queryKey: okucStockKeys.lists() });
      // Invaliduj podsumowania
      queryClient.invalidateQueries({ queryKey: okucStockKeys.summaries() });
      // Invaliduj szczegóły tego stanu
      queryClient.invalidateQueries({ queryKey: okucStockKeys.detail(stock.id) });
      // Invaliduj listę stanów poniżej minimum
      queryClient.invalidateQueries({ queryKey: okucStockKeys.belowMin() });

      toast({
        title: 'Stan zaktualizowany',
        description: `Stan magazynowy został pomyślnie zaktualizowany.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(stock);
    },
    onError: (error: Error) => {
      // Sprawdź czy błąd to konflikt wersji (optimistic locking)
      const isVersionConflict = error.message?.includes('version') || error.message?.includes('conflict');

      toast({
        title: 'Błąd aktualizacji stanu',
        description: isVersionConflict
          ? 'Stan magazynowy został zmieniony przez innego użytkownika. Odśwież stronę i spróbuj ponownie.'
          : error.message || 'Nie udało się zaktualizować stanu magazynowego. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do dostosowania stanu magazynowego (dodaj/odejmij ilość)
 *
 * Różnica od useUpdateOkucStock:
 * - update: ustawia konkretną wartość (quantity = X)
 * - adjust: dodaje/odejmuje delta (quantity += delta)
 *
 * UWAGA: Używa optimistic locking (version field).
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useAdjustOkucStock();
 * mutate({
 *   stockId: 123,
 *   quantity: -10,  // Odejmij 10 sztuk
 *   version: 5
 * });
 */
export function useAdjustOkucStock(callbacks?: {
  onSuccess?: (stock: OkucStock) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { stockId: number; quantity: number; version: number }) =>
      okucStockApi.adjust(data),
    onSuccess: (stock) => {
      // Invaliduj wszystkie listy stanów
      queryClient.invalidateQueries({ queryKey: okucStockKeys.lists() });
      // Invaliduj podsumowania
      queryClient.invalidateQueries({ queryKey: okucStockKeys.summaries() });
      // Invaliduj szczegóły tego stanu
      queryClient.invalidateQueries({ queryKey: okucStockKeys.detail(stock.id) });
      // Invaliduj listę stanów poniżej minimum
      queryClient.invalidateQueries({ queryKey: okucStockKeys.belowMin() });

      toast({
        title: 'Stan dostosowany',
        description: `Stan magazynowy został pomyślnie dostosowany.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(stock);
    },
    onError: (error: Error) => {
      const isVersionConflict = error.message?.includes('version') || error.message?.includes('conflict');

      toast({
        title: 'Błąd dostosowania stanu',
        description: isVersionConflict
          ? 'Stan magazynowy został zmieniony przez innego użytkownika. Odśwież stronę i spróbuj ponownie.'
          : error.message || 'Nie udało się dostosować stanu magazynowego. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}
