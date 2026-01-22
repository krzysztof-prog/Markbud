/**
 * React Query Hooks for Logistics Mail Lists Module
 *
 * Hooki do zarzadzania listami mailowymi logistyki:
 * - Parsowanie emaili z awizacjami
 * - Zapisywanie list mailowych
 * - Wersjonowanie i porownywanie wersji
 * - Kalendarz logistyczny
 * - Edycja pozycji
 *
 * Backend API: apps/api/src/routes/logistics.ts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { logisticsApi } from '../api/logisticsApi';
import { toast } from '@/hooks/useToast';
import type {
  MailList,
  MailItem,
  ParseResult,
  SaveMailListInput,
  MailListFilters,
  UpdateMailItemInput,
} from '../types';

// ============================================================================
// QUERY KEYS - Klucze dla React Query cache
// ============================================================================

export const logisticsKeys = {
  all: ['logistics'] as const,

  // Mail lists
  lists: () => [...logisticsKeys.all, 'list'] as const,
  list: (filters?: MailListFilters) => [...logisticsKeys.lists(), { filters }] as const,
  details: () => [...logisticsKeys.all, 'detail'] as const,
  detail: (id: number) => [...logisticsKeys.details(), id] as const,

  // Versions (po deliveryCode - np. "16.02.2026_I")
  versions: () => [...logisticsKeys.all, 'versions'] as const,
  versionsByCode: (deliveryCode: string) => [...logisticsKeys.versions(), 'byCode', deliveryCode] as const,
  latestVersion: (deliveryCode: string) => [...logisticsKeys.versions(), 'latest', deliveryCode] as const,
  versionDiff: (deliveryCode: string, versionFrom: number, versionTo: number) =>
    [...logisticsKeys.versions(), 'diff', deliveryCode, versionFrom, versionTo] as const,

  // Calendar
  calendar: () => [...logisticsKeys.all, 'calendar'] as const,
  calendarRange: (from: string, to: string) => [...logisticsKeys.calendar(), { from, to }] as const,
};

// ============================================================================
// QUERIES - Pobieranie danych
// ============================================================================

/**
 * Hook do pobierania listy maili z opcjonalnymi filtrami
 *
 * @param filters - Opcjonalne filtry (status, dateFrom, dateTo, code)
 * @returns Query result z lista maili
 *
 * @example
 * const { data: mailLists, isLoading } = useMailLists({ status: 'active' });
 */
export function useMailLists(filters?: MailListFilters) {
  return useQuery({
    queryKey: logisticsKeys.list(filters),
    queryFn: () => logisticsApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania pojedynczej listy mailowej po ID
 *
 * @param id - ID listy mailowej
 * @returns Query result z lista mailowa (wraz z pozycjami)
 *
 * @example
 * const { data: mailList, isLoading } = useMailListById(123);
 */
export function useMailListById(id: number) {
  return useQuery({
    queryKey: logisticsKeys.detail(id),
    queryFn: () => logisticsApi.getById(id),
    enabled: !!id, // Nie wykonuj zapytania jesli brak ID
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania wszystkich wersji listy po kodzie dostawy
 *
 * @param deliveryCode - Kod dostawy (np. "16.02.2026_I")
 * @returns Query result z lista wersji
 *
 * @example
 * const { data: versions, isLoading } = useVersionsByCode('16.02.2026_I');
 */
export function useVersionsByCode(deliveryCode: string) {
  return useQuery({
    queryKey: logisticsKeys.versionsByCode(deliveryCode),
    queryFn: () => logisticsApi.getVersionsByCode(deliveryCode),
    enabled: !!deliveryCode, // Nie wykonuj zapytania jesli brak kodu
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania najnowszej wersji listy po kodzie dostawy
 *
 * @param deliveryCode - Kod dostawy (np. "16.02.2026_I")
 * @returns Query result z najnowsza wersja
 *
 * @example
 * const { data: latestVersion, isLoading } = useLatestVersion('16.02.2026_I');
 */
export function useLatestVersion(deliveryCode: string) {
  return useQuery({
    queryKey: logisticsKeys.latestVersion(deliveryCode),
    queryFn: () => logisticsApi.getLatestVersion(deliveryCode),
    enabled: !!deliveryCode,
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania roznic miedzy wersjami
 *
 * @param deliveryCode - Kod dostawy (np. "16.02.2026_I")
 * @param versionFrom - Numer wersji poczatkowej
 * @param versionTo - Numer wersji koncowej
 * @returns Query result z diff miedzy wersjami
 *
 * @example
 * const { data: diff, isLoading } = useVersionDiff('16.02.2026_I', 1, 2);
 */
export function useVersionDiff(deliveryCode: string, versionFrom: number, versionTo: number) {
  return useQuery({
    queryKey: logisticsKeys.versionDiff(deliveryCode, versionFrom, versionTo),
    queryFn: () => logisticsApi.getVersionDiff(deliveryCode, versionFrom, versionTo),
    enabled: !!deliveryCode && versionFrom > 0 && versionTo > 0 && versionFrom !== versionTo,
    staleTime: 10 * 60 * 1000, // 10 minut - diff sie nie zmienia
  });
}

/**
 * Hook do pobierania danych kalendarza logistycznego
 *
 * @param from - Data poczatkowa (YYYY-MM-DD)
 * @param to - Data koncowa (YYYY-MM-DD)
 * @returns Query result z wpisami kalendarza
 *
 * @example
 * const { data: calendar, isLoading } = useLogisticsCalendar('2024-01-01', '2024-01-31');
 */
export function useLogisticsCalendar(from: string, to: string) {
  return useQuery({
    queryKey: logisticsKeys.calendarRange(from, to),
    queryFn: () => logisticsApi.getCalendar(from, to),
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

// ============================================================================
// MUTATIONS - Modyfikacja danych
// ============================================================================

/**
 * Hook do parsowania tekstu emaila z awizacja
 *
 * Parsuje surowy tekst maila i wyciaga z niego:
 * - Date dostawy
 * - Dostawy (Klient nr 1, 2, ...)
 * - Pozycje z flagami (SIATKA, BRAK PLIKU, etc.)
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcja mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useParseEmail({
 *   onSuccess: (result) => setPreviewData(result)
 * });
 * mutate({ mailText: 'Mail z awizacja...' });
 */
export function useParseEmail(callbacks?: {
  onSuccess?: (result: ParseResult) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: (data: { mailText: string }) => logisticsApi.parseEmail(data),
    onSuccess: (result) => {
      // Zlicz wszystkie pozycje ze wszystkich dostaw
      const totalItems = result.deliveries.reduce(
        (sum, delivery) => sum + delivery.items.length,
        0
      );

      toast({
        title: 'Email sparsowany',
        description: `Rozpoznano ${result.deliveries.length} dostaw z ${totalItems} pozycjami.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      toast({
        title: 'Blad parsowania emaila',
        description: error.message || 'Nie udalo sie sparsowac emaila. Sprawdz format.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do zapisywania sparsowanej listy mailowej
 *
 * Po sukcesie:
 * - Invaliduje liste list mailowych
 * - Invaliduje wersje (jesli nowa wersja)
 * - Invaliduje kalendarz
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcja mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useSaveMailList({
 *   onSuccess: (mailList) => router.push(`/logistyka/${mailList.id}`)
 * });
 * mutate({ deliveryCode: '16.02.2026_I', deliveryDate: '2026-02-16', items: [...] });
 */
export function useSaveMailList(callbacks?: {
  onSuccess?: (mailList: MailList) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveMailListInput) => logisticsApi.save(data),
    onSuccess: (mailList) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: logisticsKeys.lists() });
      // Invaliduj wersje dla tego kodu dostawy
      queryClient.invalidateQueries({ queryKey: logisticsKeys.versionsByCode(mailList.deliveryCode) });
      queryClient.invalidateQueries({ queryKey: logisticsKeys.latestVersion(mailList.deliveryCode) });
      // Invaliduj kalendarz
      queryClient.invalidateQueries({ queryKey: logisticsKeys.calendar() });

      toast({
        title: 'Lista zapisana',
        description: `Lista ${mailList.deliveryCode} (wersja ${mailList.version}) zostala zapisana.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(mailList);
    },
    onError: (error: Error) => {
      toast({
        title: 'Blad zapisywania listy',
        description: error.message || 'Nie udalo sie zapisac listy. Sprobuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do usuwania listy mailowej (soft delete)
 *
 * Po sukcesie:
 * - Invaliduje liste list mailowych
 * - Invaliduje szczegoly listy
 * - Invaliduje wersje
 * - Invaliduje kalendarz
 * - Pokazuje toast z potwierdzeniem
 *
 * UWAGA: To jest SOFT DELETE - lista zostaje oznaczona jako usunieta (deletedAt).
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcja mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useDeleteMailList({
 *   onSuccess: () => router.push('/logistyka')
 * });
 * mutate(123); // ID listy
 */
export function useDeleteMailList(callbacks?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => logisticsApi.delete(id),
    onSuccess: (_, id) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: logisticsKeys.lists() });
      // Invaliduj szczegoly usuwanej listy
      queryClient.invalidateQueries({ queryKey: logisticsKeys.detail(id) });
      // Invaliduj wersje i kalendarz
      queryClient.invalidateQueries({ queryKey: logisticsKeys.versions() });
      queryClient.invalidateQueries({ queryKey: logisticsKeys.calendar() });

      toast({
        title: 'Lista usunieta',
        description: 'Lista mailowa zostala pomyslnie usunieta.',
        variant: 'success',
      });

      callbacks?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Blad usuwania listy',
        description: error.message || 'Nie udalo sie usunac listy. Sprobuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do aktualizacji pojedynczej pozycji na liscie mailowej
 *
 * Po sukcesie:
 * - Invaliduje szczegoly listy
 * - Invaliduje liste list (bo mogly sie zmienic agregaty)
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcja mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useUpdateMailItem();
 * mutate({
 *   id: 456,
 *   data: { quantity: 100, note: 'Zmieniona ilosc' }
 * });
 */
export function useUpdateMailItem(callbacks?: {
  onSuccess?: (item: MailItem) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMailItemInput }) =>
      logisticsApi.updateItem(id, data),
    onSuccess: (item) => {
      // Invaliduj szczegoly listy do ktorej nalezy pozycja
      queryClient.invalidateQueries({ queryKey: logisticsKeys.details() });
      // Invaliduj liste list (mogly sie zmienic agregaty)
      queryClient.invalidateQueries({ queryKey: logisticsKeys.lists() });

      toast({
        title: 'Pozycja zaktualizowana',
        description: 'Pozycja na liscie została pomyslnie zaktualizowana.',
        variant: 'success',
      });

      callbacks?.onSuccess?.(item);
    },
    onError: (error: Error) => {
      toast({
        title: 'Blad aktualizacji pozycji',
        description: error.message || 'Nie udalo sie zaktualizowac pozycji. Sprobuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

// ============================================================================
// DIFF ACTIONS - Akcje dla systemu decyzji diff
// ============================================================================

/**
 * Hook do usuwania pozycji z dostawy (soft delete)
 * Używane gdy pozycja została usunięta z maila - użytkownik potwierdza usunięcie
 */
export function useRemoveItemFromDelivery(callbacks?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => logisticsApi.removeItemFromDelivery(itemId),
    onSuccess: () => {
      // Invaliduj wszystkie powiązane dane
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });

      toast({
        title: 'Pozycja usunięta',
        description: 'Pozycja została usunięta z dostawy.',
        variant: 'success',
      });

      callbacks?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd usuwania pozycji',
        description: error.message || 'Nie udało się usunąć pozycji.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do potwierdzania dodanej pozycji
 * Używane gdy nowa pozycja została dodana w mailu - użytkownik akceptuje
 */
export function useConfirmAddedItem(callbacks?: {
  onSuccess?: (item: MailItem) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => logisticsApi.confirmAddedItem(itemId),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });

      toast({
        title: 'Pozycja potwierdzona',
        description: 'Pozycja została potwierdzona.',
        variant: 'success',
      });

      callbacks?.onSuccess?.(item);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd potwierdzania pozycji',
        description: error.message || 'Nie udało się potwierdzić pozycji.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do odrzucania dodanej pozycji (soft delete)
 * Używane gdy nowa pozycja została dodana w mailu - użytkownik odrzuca
 */
export function useRejectAddedItem(callbacks?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => logisticsApi.rejectAddedItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });

      toast({
        title: 'Pozycja odrzucona',
        description: 'Pozycja została odrzucona.',
        variant: 'success',
      });

      callbacks?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd odrzucania pozycji',
        description: error.message || 'Nie udało się odrzucić pozycji.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do akceptowania zmiany pozycji
 * Używane gdy pozycja została zmieniona - użytkownik akceptuje nową wartość
 */
export function useAcceptItemChange(callbacks?: {
  onSuccess?: (item: MailItem) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => logisticsApi.acceptItemChange(itemId),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });

      toast({
        title: 'Zmiana zaakceptowana',
        description: 'Zmiana została zaakceptowana.',
        variant: 'success',
      });

      callbacks?.onSuccess?.(item);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd akceptowania zmiany',
        description: error.message || 'Nie udało się zaakceptować zmiany.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do przywracania poprzedniej wartości pozycji
 * Używane gdy pozycja została zmieniona - użytkownik chce przywrócić starą wartość
 */
export function useRestoreItemValue(callbacks?: {
  onSuccess?: (item: MailItem) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, field, previousValue }: { itemId: number; field: string; previousValue: string }) =>
      logisticsApi.restoreItemValue(itemId, field, previousValue),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });

      toast({
        title: 'Wartość przywrócona',
        description: 'Poprzednia wartość została przywrócona.',
        variant: 'success',
      });

      callbacks?.onSuccess?.(item);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd przywracania wartości',
        description: error.message || 'Nie udało się przywrócić wartości.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

// ============================================================================
// COMBINED HOOKS - Hooki agregujace (convenience)
// ============================================================================

/**
 * Hook agregujacy wszystkie mutacje logistyki
 * Uzycie: const { parseMutation, saveMutation, deleteMutation, updateItemMutation } = useLogisticsMutations()
 */
export function useLogisticsMutations(callbacks?: {
  onParseSuccess?: (result: ParseResult) => void;
  onSaveSuccess?: (mailList: MailList) => void;
  onDeleteSuccess?: () => void;
  onUpdateItemSuccess?: (item: MailItem) => void;
}) {
  const parseMutation = useParseEmail({ onSuccess: callbacks?.onParseSuccess });
  const saveMutation = useSaveMailList({ onSuccess: callbacks?.onSaveSuccess });
  const deleteMutation = useDeleteMailList({ onSuccess: callbacks?.onDeleteSuccess });
  const updateItemMutation = useUpdateMailItem({ onSuccess: callbacks?.onUpdateItemSuccess });

  return {
    parseMutation,
    saveMutation,
    deleteMutation,
    updateItemMutation,
    // Shortcut dla pending states
    isAnyPending:
      parseMutation.isPending ||
      saveMutation.isPending ||
      deleteMutation.isPending ||
      updateItemMutation.isPending,
  };
}

/**
 * Hook agregujący wszystkie akcje diff
 */
export function useDiffActions() {
  const removeMutation = useRemoveItemFromDelivery();
  const confirmMutation = useConfirmAddedItem();
  const rejectMutation = useRejectAddedItem();
  const acceptChangeMutation = useAcceptItemChange();
  const restoreMutation = useRestoreItemValue();

  return {
    removeMutation,
    confirmMutation,
    rejectMutation,
    acceptChangeMutation,
    restoreMutation,
    isAnyPending:
      removeMutation.isPending ||
      confirmMutation.isPending ||
      rejectMutation.isPending ||
      acceptChangeMutation.isPending ||
      restoreMutation.isPending,
  };
}
