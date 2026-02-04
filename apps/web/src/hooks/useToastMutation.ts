/**
 * Wrapper hook dla useMutation z automatycznymi toastami
 *
 * Zapewnia spójny UX dla wszystkich mutacji w aplikacji:
 * - Automatyczne toasty sukcesu/błędu
 * - Opcjonalny progress bar dla długich operacji
 * - Opcjonalne undo dla akcji destrukcyjnych
 */

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { showProgressToast, ProgressToastController } from '@/lib/toast-extended';
import { showUndoToast } from '@/lib/toast-undo';
import { useRef } from 'react';

// ================================
// Typy
// ================================

export interface UseToastMutationOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'onSuccess' | 'onError' | 'onMutate'> {
  /**
   * Komunikat sukcesu - string lub funkcja generująca komunikat
   * @example "Zapisano" lub (data) => `Zapisano ${data.count} elementów`
   */
  successMessage?: string | ((data: TData, variables: TVariables) => string);

  /**
   * Komunikat błędu - string lub funkcja generująca komunikat
   * @example "Błąd zapisu" lub (error) => error.message
   */
  errorMessage?: string | ((error: TError) => string);

  /**
   * Opis sukcesu (opcjonalny)
   */
  successDescription?: string | ((data: TData, variables: TVariables) => string);

  /**
   * Opis błędu (opcjonalny)
   */
  errorDescription?: string | ((error: TError) => string);

  /**
   * Włącz toast z progress bar dla długich operacji
   */
  showProgress?: boolean;

  /**
   * Tytuł toastu progress (domyślnie "Przetwarzanie...")
   */
  progressTitle?: string;

  /**
   * Włącz akcję "Cofnij" po sukcesie
   */
  enableUndo?: boolean;

  /**
   * Funkcja cofająca operację (wymagana gdy enableUndo=true)
   */
  undoFn?: (data: TData, variables: TVariables) => Promise<void>;

  /**
   * Czas na cofnięcie w ms (domyślnie 5000)
   */
  undoDuration?: number;

  /**
   * Całkowicie wyłącz toasty (gdy chcesz obsłużyć ręcznie)
   */
  disableToast?: boolean;

  /**
   * Oryginalny onMutate callback (opcjonalny)
   */
  onMutate?: (variables: TVariables) => Promise<TContext | undefined> | TContext | undefined;

  /**
   * Oryginalny onSuccess callback (opcjonalny)
   */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;

  /**
   * Oryginalny onError callback (opcjonalny)
   */
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
}

// ================================
// useToastMutation
// ================================

/**
 * Hook wrapper dla useMutation z automatycznymi toastami.
 *
 * @example
 * // Podstawowe użycie
 * const mutation = useToastMutation({
 *   mutationFn: (data) => api.updateOrder(data),
 *   successMessage: 'Zlecenie zaktualizowane',
 *   errorMessage: 'Nie udało się zaktualizować zlecenia',
 * });
 *
 * @example
 * // Z dynamicznym komunikatem
 * const mutation = useToastMutation({
 *   mutationFn: importOrders,
 *   successMessage: (data) => `Zaimportowano ${data.count} zleceń`,
 *   errorMessage: (error) => `Import nieudany: ${error.message}`,
 * });
 *
 * @example
 * // Z progress bar
 * const mutation = useToastMutation({
 *   mutationFn: longRunningOperation,
 *   showProgress: true,
 *   progressTitle: 'Przetwarzanie danych...',
 *   successMessage: 'Operacja zakończona',
 * });
 *
 * @example
 * // Z undo
 * const deleteMutation = useToastMutation({
 *   mutationFn: (id) => api.softDeleteDelivery(id),
 *   enableUndo: true,
 *   undoFn: (_, id) => api.restoreDelivery(id),
 *   successMessage: 'Dostawa usunięta',
 * });
 */
export function useToastMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseToastMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const {
    successMessage,
    errorMessage,
    successDescription,
    errorDescription,
    showProgress = false,
    progressTitle = 'Przetwarzanie...',
    enableUndo = false,
    undoFn,
    undoDuration = 5000,
    disableToast = false,
    onMutate: userOnMutate,
    onSuccess: userOnSuccess,
    onError: userOnError,
    ...mutationOptions
  } = options;

  // Ref do kontrolera progress (aby móc go zaktualizować/zamknąć)
  const progressControllerRef = useRef<ProgressToastController | null>(null);

  return useMutation({
    ...mutationOptions,

    onMutate: async (variables: TVariables) => {
      // Jeśli showProgress, pokaż toast z progress bar
      if (showProgress && !disableToast) {
        progressControllerRef.current = showProgressToast({
          title: progressTitle,
          description: 'Proszę czekać...',
        });
      }

      // Wywołaj oryginalny onMutate jeśli istnieje
      if (userOnMutate) {
        return userOnMutate(variables) as TContext;
      }
      return undefined as TContext;
    },

    onSuccess: (data, variables, context) => {
      // Zamknij progress toast jeśli był
      if (progressControllerRef.current) {
        progressControllerRef.current.dismiss();
        progressControllerRef.current = null;
      }

      // Pokaż toast sukcesu
      if (!disableToast && successMessage) {
        const title =
          typeof successMessage === 'function'
            ? successMessage(data, variables)
            : successMessage;

        const description =
          typeof successDescription === 'function'
            ? successDescription(data, variables)
            : successDescription;

        // Jeśli undo jest włączone, pokaż toast z przyciskiem "Cofnij"
        if (enableUndo && undoFn) {
          showUndoToast({
            title,
            description,
            onUndo: () => undoFn(data, variables),
            duration: undoDuration,
          });
        } else {
          showSuccessToast(title, description);
        }
      }

      // Wywołaj callback użytkownika
      userOnSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      // Zamknij progress toast jeśli był
      if (progressControllerRef.current) {
        progressControllerRef.current.error();
        progressControllerRef.current = null;
      }

      // Pokaż toast błędu
      if (!disableToast) {
        const title =
          typeof errorMessage === 'function'
            ? errorMessage(error)
            : errorMessage || 'Wystąpił błąd';

        const description =
          typeof errorDescription === 'function'
            ? errorDescription(error)
            : errorDescription || (error instanceof Error ? error.message : undefined);

        showErrorToast(title, description);
      }

      // Wywołaj callback użytkownika
      userOnError?.(error, variables, context);
    },
  });
}

// ================================
// useToastMutationWithProgress
// ================================

/**
 * Wersja useToastMutation z kontrolerem progress do ręcznej aktualizacji.
 *
 * @example
 * const { mutation, progressController } = useToastMutationWithProgress({
 *   mutationFn: async (data) => {
 *     for (let i = 0; i < 100; i++) {
 *       await processItem(i);
 *       progressController.current?.update(i + 1, `${i + 1}/100`);
 *     }
 *     return { count: 100 };
 *   },
 *   progressTitle: 'Przetwarzanie...',
 *   successMessage: (data) => `Przetworzono ${data.count} elementów`,
 * });
 */
export function useToastMutationWithProgress<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<UseToastMutationOptions<TData, TError, TVariables, TContext>, 'showProgress'>
): {
  mutation: UseMutationResult<TData, TError, TVariables, TContext>;
  progressController: React.MutableRefObject<ProgressToastController | null>;
} {
  const progressController = useRef<ProgressToastController | null>(null);

  const mutation = useToastMutation({
    ...options,
    showProgress: true,
    onMutate: async (variables) => {
      // Progress toast jest tworzony przez useToastMutation
      // ale możemy go nadpisać tutaj dla dostępu z zewnątrz
      progressController.current = showProgressToast({
        title: options.progressTitle || 'Przetwarzanie...',
        description: 'Proszę czekać...',
      });

      if (options.onMutate) {
        return options.onMutate(variables);
      }
      return undefined as TContext;
    },
    onSuccess: (data, variables, context) => {
      if (progressController.current) {
        const title =
          typeof options.successMessage === 'function'
            ? options.successMessage(data, variables)
            : options.successMessage || 'Zakończono';

        const description =
          typeof options.successDescription === 'function'
            ? options.successDescription(data, variables)
            : options.successDescription;

        progressController.current.complete(title, description);
        progressController.current = null;
      }

      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (progressController.current) {
        const title =
          typeof options.errorMessage === 'function'
            ? options.errorMessage(error)
            : options.errorMessage || 'Wystąpił błąd';

        progressController.current.error(title);
        progressController.current = null;
      }

      options.onError?.(error, variables, context);
    },
    disableToast: true, // Ręcznie obsługujemy toasty
  });

  return { mutation, progressController };
}
