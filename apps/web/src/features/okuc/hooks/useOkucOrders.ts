/**
 * React Query Hooks for OKUC Orders Module
 *
 * Hooki do zarządzania zamówieniami do dostawców okuć:
 * - Lista zamówień z filtrami
 * - Pojedyncze zamówienie
 * - Tworzenie, aktualizacja, usuwanie
 * - Wysyłanie zamówienia
 * - Potwierdzanie dostawy
 *
 * Backend API: apps/api/src/routes/okuc/orders.ts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { okucOrdersApi } from '@/features/okuc/api';
import { toast } from '@/hooks/useToast';
import type {
  OkucOrder,
  CreateOkucOrderInput,
  UpdateOkucOrderInput,
  ReceiveOrderInput,
} from '@/types/okuc';

// ============================================================================
// QUERY KEYS - Klucze dla React Query cache
// ============================================================================

export const okucOrdersKeys = {
  all: ['okuc-orders'] as const,
  lists: () => [...okucOrdersKeys.all, 'list'] as const,
  list: (filters?: {
    status?: string;
    basketType?: string;
    fromDate?: string;
    toDate?: string;
  }) => [...okucOrdersKeys.lists(), { filters }] as const,
  details: () => [...okucOrdersKeys.all, 'detail'] as const,
  detail: (id: number) => [...okucOrdersKeys.details(), id] as const,
  stats: () => [...okucOrdersKeys.all, 'stats'] as const,
};

// ============================================================================
// QUERIES - Pobieranie danych
// ============================================================================

/**
 * Hook do pobierania listy zamówień z opcjonalnymi filtrami
 *
 * @param filters - Opcjonalne filtry (status, basketType, fromDate, toDate)
 * @returns Query result z listą zamówień
 *
 * @example
 * const { data: orders, isLoading } = useOkucOrders({ status: 'draft' });
 */
export function useOkucOrders(filters?: {
  status?: string;
  basketType?: string;
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({
    queryKey: okucOrdersKeys.list(filters),
    queryFn: () => okucOrdersApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania pojedynczego zamówienia po ID
 *
 * @param id - ID zamówienia
 * @returns Query result z zamówieniem (z pozycjami)
 *
 * @example
 * const { data: order, isLoading } = useOkucOrder(123);
 */
export function useOkucOrder(id: number) {
  return useQuery({
    queryKey: okucOrdersKeys.detail(id),
    queryFn: () => okucOrdersApi.getById(id),
    enabled: !!id, // Nie wykonuj zapytania jeśli brak ID
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania statystyk zamówień
 *
 * @returns Query result ze statystykami
 *
 * @example
 * const { data: stats, isLoading } = useOkucOrdersStats();
 */
export function useOkucOrdersStats() {
  return useQuery({
    queryKey: okucOrdersKeys.stats(),
    queryFn: () => okucOrdersApi.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

// ============================================================================
// MUTATIONS - Modyfikacja danych
// ============================================================================

/**
 * Hook do tworzenia nowego zamówienia
 *
 * Po sukcesie:
 * - Invaliduje listę zamówień
 * - Invaliduje statystyki
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useCreateOkucOrder({
 *   onSuccess: (order) => router.push(`/okuc/orders/${order.id}`)
 * });
 * mutate({ basketType: 'typical_standard', items: [...] });
 */
export function useCreateOkucOrder(callbacks?: {
  onSuccess?: (order: OkucOrder) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOkucOrderInput) => okucOrdersApi.create(data),
    onSuccess: (order) => {
      // Invaliduj wszystkie listy zamówień
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.lists() });
      // Invaliduj statystyki
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.stats() });

      toast({
        title: 'Zamówienie utworzone',
        description: `Zamówienie ${order.orderNumber} zostało pomyślnie utworzone.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(order);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd tworzenia zamówienia',
        description: error.message || 'Nie udało się utworzyć zamówienia. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do aktualizacji zamówienia
 *
 * Po sukcesie:
 * - Invaliduje listę zamówień
 * - Invaliduje szczegóły zamówienia
 * - Invaliduje statystyki
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useUpdateOkucOrder();
 * mutate({ id: 123, data: { status: 'approved' } });
 */
export function useUpdateOkucOrder(callbacks?: {
  onSuccess?: (order: OkucOrder) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOkucOrderInput }) =>
      okucOrdersApi.update(id, data),
    onSuccess: (order) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.lists() });
      // Invaliduj szczegóły tego zamówienia
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.detail(order.id) });
      // Invaliduj statystyki
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.stats() });

      toast({
        title: 'Zamówienie zaktualizowane',
        description: `Zamówienie ${order.orderNumber} zostało pomyślnie zaktualizowane.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(order);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji zamówienia',
        description: error.message || 'Nie udało się zaktualizować zamówienia. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do wysyłania zamówienia do dostawcy
 *
 * Zmienia status zamówienia na 'sent'.
 *
 * Po sukcesie:
 * - Invaliduje listę zamówień
 * - Invaliduje szczegóły zamówienia
 * - Invaliduje statystyki
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useSendOkucOrder();
 * mutate(123); // ID zamówienia
 */
export function useSendOkucOrder(callbacks?: {
  onSuccess?: (order: OkucOrder) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => okucOrdersApi.update(id, { status: 'sent' }),
    onSuccess: (order) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.lists() });
      // Invaliduj szczegóły tego zamówienia
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.detail(order.id) });
      // Invaliduj statystyki
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.stats() });

      toast({
        title: 'Zamówienie wysłane',
        description: `Zamówienie ${order.orderNumber} zostało wysłane do dostawcy.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(order);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd wysyłania zamówienia',
        description: error.message || 'Nie udało się wysłać zamówienia. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do potwierdzania dostawy zamówienia
 *
 * Aktualizuje odebrane ilości dla pozycji zamówienia
 * i zmienia status na 'received'.
 *
 * Po sukcesie:
 * - Invaliduje listę zamówień
 * - Invaliduje szczegóły zamówienia
 * - Invaliduje statystyki
 * - Invaliduje stany magazynowe (bo przyjęto towar)
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useConfirmOkucOrderDelivery();
 * mutate({
 *   id: 123,
 *   data: {
 *     items: [
 *       { articleId: 1, receivedQty: 100 },
 *       { articleId: 2, receivedQty: 50 }
 *     ]
 *   }
 * });
 */
export function useConfirmOkucOrderDelivery(callbacks?: {
  onSuccess?: (order: OkucOrder) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReceiveOrderInput }) =>
      okucOrdersApi.receive(id, data),
    onSuccess: (order) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.lists() });
      // Invaliduj szczegóły tego zamówienia
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.detail(order.id) });
      // Invaliduj statystyki
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.stats() });
      // Invaliduj stany magazynowe (bo przyjęto towar)
      queryClient.invalidateQueries({ queryKey: ['okuc-stock'] });

      toast({
        title: 'Dostawa potwierdzona',
        description: `Dostawa zamówienia ${order.orderNumber} została potwierdzona.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(order);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd potwierdzania dostawy',
        description: error.message || 'Nie udało się potwierdzić dostawy. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do usuwania zamówienia (tylko jeśli draft)
 *
 * Po sukcesie:
 * - Invaliduje listę zamówień
 * - Invaliduje szczegóły zamówienia
 * - Invaliduje statystyki
 * - Pokazuje toast z potwierdzeniem
 *
 * UWAGA: Usuwać można tylko zamówienia w statusie 'draft'.
 * Dla innych statusów backend zwróci błąd.
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useDeleteOkucOrder({
 *   onSuccess: () => router.push('/okuc/orders')
 * });
 * mutate(123); // ID zamówienia
 */
export function useDeleteOkucOrder(callbacks?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => okucOrdersApi.delete(id),
    onSuccess: (_, id) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.lists() });
      // Invaliduj szczegóły usuniętego zamówienia
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.detail(id) });
      // Invaliduj statystyki
      queryClient.invalidateQueries({ queryKey: okucOrdersKeys.stats() });

      toast({
        title: 'Zamówienie usunięte',
        description: 'Zamówienie zostało pomyślnie usunięte.',
        variant: 'success',
      });

      callbacks?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd usuwania zamówienia',
        description: error.message || 'Nie udało się usunąć zamówienia. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}
