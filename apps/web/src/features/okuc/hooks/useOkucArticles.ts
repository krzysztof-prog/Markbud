/**
 * React Query Hooks for OKUC Articles Module
 *
 * Hooki do zarządzania artykułami okuć z modułu DualStock:
 * - Lista artykułów z filtrami
 * - Pojedynczy artykuł
 * - Tworzenie, aktualizacja, usuwanie
 * - Aliasy artykułów
 *
 * Backend API: apps/api/src/routes/okuc/articles.ts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { okucArticlesApi } from '@/features/okuc/api/okucApi';
import { toast } from '@/hooks/useToast';
import type {
  OkucArticle,
  OkucArticleAlias,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleFilters,
  AddAliasInput,
} from '@/types/okuc';

// ============================================================================
// QUERY KEYS - Klucze dla React Query cache
// ============================================================================

export const okucArticlesKeys = {
  all: ['okuc-articles'] as const,
  lists: () => [...okucArticlesKeys.all, 'list'] as const,
  list: (filters?: ArticleFilters) => [...okucArticlesKeys.lists(), { filters }] as const,
  details: () => [...okucArticlesKeys.all, 'detail'] as const,
  detail: (id: number) => [...okucArticlesKeys.details(), id] as const,
  aliases: (id: number) => [...okucArticlesKeys.all, 'aliases', id] as const,
  pendingReview: () => [...okucArticlesKeys.all, 'pending-review'] as const,
};

// ============================================================================
// QUERIES - Pobieranie danych
// ============================================================================

/**
 * Hook do pobierania listy artykułów z opcjonalnymi filtrami
 *
 * @param filters - Opcjonalne filtry (usedInPvc, usedInAlu, orderClass, sizeClass, search)
 * @returns Query result z listą artykułów
 *
 * @example
 * const { data: articles, isLoading } = useOkucArticles({ usedInPvc: true });
 */
export function useOkucArticles(filters?: ArticleFilters) {
  return useQuery({
    queryKey: okucArticlesKeys.list(filters),
    queryFn: () => okucArticlesApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania pojedynczego artykułu po ID
 *
 * @param id - ID artykułu w bazie danych
 * @returns Query result z artykułem
 *
 * @example
 * const { data: article, isLoading } = useOkucArticle(123);
 */
export function useOkucArticle(id: number) {
  return useQuery({
    queryKey: okucArticlesKeys.detail(id),
    queryFn: () => okucArticlesApi.getById(id),
    enabled: !!id, // Nie wykonuj zapytania jeśli brak ID
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania aliasów artykułu
 *
 * @param id - ID artykułu
 * @returns Query result z listą aliasów
 *
 * @example
 * const { data: aliases, isLoading } = useOkucArticleAliases(123);
 */
export function useOkucArticleAliases(id: number) {
  return useQuery({
    queryKey: okucArticlesKeys.aliases(id),
    queryFn: () => okucArticlesApi.getAliases(id),
    enabled: !!id, // Nie wykonuj zapytania jeśli brak ID
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

// ============================================================================
// MUTATIONS - Modyfikacja danych
// ============================================================================

/**
 * Hook do tworzenia nowego artykułu
 *
 * Po sukcesie:
 * - Invaliduje listę artykułów
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useCreateOkucArticle({
 *   onSuccess: () => router.push('/okuc/articles')
 * });
 * mutate({ articleId: 'A123', name: 'Test', ... });
 */
export function useCreateOkucArticle(callbacks?: {
  onSuccess?: (article: OkucArticle) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateArticleInput) => okucArticlesApi.create(data),
    onSuccess: (article) => {
      // Invaliduj wszystkie listy artykułów
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.lists() });

      toast({
        title: 'Artykuł utworzony',
        description: `Artykuł ${article.articleId} został pomyślnie dodany do systemu.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(article);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd tworzenia artykułu',
        description: error.message || 'Nie udało się utworzyć artykułu. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do aktualizacji artykułu
 *
 * Po sukcesie:
 * - Invaliduje listę artykułów
 * - Invaliduje szczegóły artykułu
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useUpdateOkucArticle();
 * mutate({ id: 123, data: { name: 'Nowa nazwa' } });
 */
export function useUpdateOkucArticle(callbacks?: {
  onSuccess?: (article: OkucArticle) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateArticleInput }) =>
      okucArticlesApi.update(id, data),
    onSuccess: (article) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.lists() });
      // Invaliduj szczegóły tego artykułu
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.detail(article.id) });

      toast({
        title: 'Artykuł zaktualizowany',
        description: `Artykuł ${article.articleId} został pomyślnie zaktualizowany.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(article);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji artykułu',
        description: error.message || 'Nie udało się zaktualizować artykułu. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do usuwania artykułu (soft delete)
 *
 * Po sukcesie:
 * - Invaliduje listę artykułów
 * - Invaliduje szczegóły artykułu
 * - Pokazuje toast z potwierdzeniem
 *
 * UWAGA: To jest soft delete - artykuł zostaje oznaczony jako usunięty
 * ale pozostaje w bazie danych.
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useDeleteOkucArticle({
 *   onSuccess: () => router.push('/okuc/articles')
 * });
 * mutate(123); // ID artykułu
 */
export function useDeleteOkucArticle(callbacks?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => okucArticlesApi.delete(id),
    onSuccess: (_, id) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.lists() });
      // Invaliduj szczegóły usuniętego artykułu
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.detail(id) });

      toast({
        title: 'Artykuł usunięty',
        description: 'Artykuł został pomyślnie usunięty z systemu.',
        variant: 'success',
      });

      callbacks?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd usuwania artykułu',
        description: error.message || 'Nie udało się usunąć artykułu. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook do dodawania aliasu do artykułu
 *
 * Aliasy służą do mapowania starych numerów artykułów na nowe.
 * Na przykład: stary numer "OLD-123" → nowy numer "A123"
 *
 * Po sukcesie:
 * - Invaliduje listę aliasów
 * - Invaliduje szczegóły artykułu
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useAddOkucArticleAlias();
 * mutate({ id: 123, data: { aliasNumber: 'OLD-123' } });
 */
export function useAddOkucArticleAlias(callbacks?: {
  onSuccess?: (alias: OkucArticleAlias) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddAliasInput }) =>
      okucArticlesApi.addAlias(id, data),
    onSuccess: (alias) => {
      // Invaliduj listę aliasów dla tego artykułu
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.aliases(alias.articleId) });
      // Invaliduj szczegóły artykułu (bo mógł się zmienić)
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.detail(alias.articleId) });

      toast({
        title: 'Alias dodany',
        description: `Alias "${alias.aliasNumber}" został pomyślnie dodany.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(alias);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd dodawania aliasu',
        description: error.message || 'Nie udało się dodać aliasu. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

// ============================================================================
// PENDING REVIEW - Artykuły oczekujące na weryfikację orderClass
// ============================================================================

/**
 * Hook do pobierania artykułów oczekujących na weryfikację orderClass
 * (utworzonych automatycznie podczas importu zapotrzebowania)
 *
 * @returns Query result z listą artykułów z orderClass='pending_review'
 *
 * @example
 * const { data: pendingArticles, isLoading } = useOkucArticlesPendingReview();
 */
export function useOkucArticlesPendingReview() {
  return useQuery({
    queryKey: okucArticlesKeys.pendingReview(),
    queryFn: () => okucArticlesApi.getPendingReview(),
    staleTime: 1 * 60 * 1000, // 1 minuta - częściej odświeżamy bo to krytyczne
  });
}

/**
 * Hook do batch update orderClass dla wielu artykułów
 *
 * Używane w modalu weryfikacji nowych artykułów po imporcie.
 * Po sukcesie:
 * - Invaliduje listę pending review
 * - Invaliduje wszystkie listy artykułów
 * - Pokazuje toast z podsumowaniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useBatchUpdateOrderClass({
 *   onSuccess: () => setModalOpen(false)
 * });
 * mutate([
 *   { id: 1, orderClass: 'typical' },
 *   { id: 2, orderClass: 'atypical' }
 * ]);
 */
export function useBatchUpdateOrderClass(callbacks?: {
  onSuccess?: (result: { updated: number; failed: number }) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articles: Array<{ id: number; orderClass: 'typical' | 'atypical' }>) =>
      okucArticlesApi.batchUpdateOrderClass(articles),
    onSuccess: (result) => {
      // Invaliduj pending review (powinny zniknąć po aktualizacji)
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.pendingReview() });
      // Invaliduj wszystkie listy artykułów
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.lists() });

      if (result.updated > 0) {
        toast({
          title: 'Artykuły zaktualizowane',
          description: `Zaktualizowano ${result.updated} artykułów.${
            result.failed > 0 ? ` ${result.failed} nie udało się zaktualizować.` : ''
          }`,
          variant: result.failed > 0 ? 'default' : 'success',
        });
      }

      callbacks?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji',
        description: error.message || 'Nie udało się zaktualizować artykułów. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

// ============================================================================
// ARTICLE LOCATION - Przypisywanie lokalizacji do artykulu
// ============================================================================

/**
 * Hook do aktualizacji lokalizacji artykułu (inline edit)
 *
 * Po sukcesie:
 * - Invaliduje listę artykułów
 * - Pokazuje toast z potwierdzeniem
 *
 * @param callbacks - Opcjonalne callbacki (onSuccess, onError)
 * @returns Mutation z funkcją mutate i stanem isPending
 *
 * @example
 * const { mutate, isPending } = useUpdateArticleLocation();
 * mutate({ articleId: 123, locationId: 5 });
 */
export function useUpdateArticleLocation(callbacks?: {
  onSuccess?: (article: OkucArticle) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, locationId }: { articleId: number; locationId: number | null }) =>
      okucArticlesApi.update(articleId, { locationId }),
    onSuccess: (article) => {
      // Invaliduj wszystkie listy
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.lists() });
      // Invaliduj szczegóły tego artykułu
      queryClient.invalidateQueries({ queryKey: okucArticlesKeys.detail(article.id) });

      toast({
        title: 'Lokalizacja zmieniona',
        description: article.location
          ? `Artykuł ${article.articleId} przypisano do lokalizacji "${article.location.name}".`
          : `Usunięto lokalizację artykułu ${article.articleId}.`,
        variant: 'success',
      });

      callbacks?.onSuccess?.(article);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd zmiany lokalizacji',
        description: error.message || 'Nie udało się zmienić lokalizacji. Spróbuj ponownie.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}
