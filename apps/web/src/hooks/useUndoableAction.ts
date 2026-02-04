/**
 * Hook dla akcji z możliwością cofnięcia
 *
 * Upraszcza pattern undo dla operacji destrukcyjnych:
 * 1. Wykonaj akcję (np. soft delete)
 * 2. Pokaż toast z przyciskiem "Cofnij"
 * 3. Jeśli użytkownik kliknie "Cofnij" - wykonaj undoAction
 * 4. Jeśli czas minie - opcjonalnie wykonaj finalAction (np. hard delete)
 */

import { useState, useCallback } from 'react';
import { showUndoToast, showUndoToastWithCountdown } from '@/lib/toast-undo';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';

// ================================
// Typy
// ================================

export interface UseUndoableActionOptions<TResult> {
  /**
   * Główna akcja do wykonania (np. soft delete)
   */
  action: () => Promise<TResult>;

  /**
   * Akcja cofająca (np. restore)
   */
  undoAction: (result: TResult) => Promise<void>;

  /**
   * Komunikat sukcesu po wykonaniu głównej akcji
   */
  successMessage: string;

  /**
   * Opis sukcesu (opcjonalny)
   */
  successDescription?: string;

  /**
   * Komunikat po cofnięciu (opcjonalny, domyślnie "Cofnięto")
   */
  undoMessage?: string;

  /**
   * Czas na cofnięcie w ms (domyślnie 5000)
   */
  duration?: number;

  /**
   * Pokaż pasek postępu odliczający czas
   */
  showCountdown?: boolean;

  /**
   * Akcja wykonywana po wygaśnięciu czasu na cofnięcie
   * (np. hard delete, wysłanie webhooków, itp.)
   */
  onExpire?: (result: TResult) => Promise<void>;

  /**
   * Callback po wykonaniu głównej akcji (przed toastem)
   */
  onSuccess?: (result: TResult) => void;

  /**
   * Callback po błędzie
   */
  onError?: (error: Error) => void;
}

export interface UseUndoableActionReturn<TResult> {
  /**
   * Wykonaj akcję z możliwością cofnięcia
   */
  execute: () => Promise<TResult | undefined>;

  /**
   * Czy główna akcja jest w trakcie wykonywania
   */
  isExecuting: boolean;

  /**
   * Czy akcja cofania jest w trakcie wykonywania
   */
  isUndoing: boolean;

  /**
   * Ostatni wynik akcji (do użycia w undoAction)
   */
  lastResult: TResult | undefined;
}

// ================================
// useUndoableAction
// ================================

/**
 * Hook upraszczający pattern undo dla operacji destrukcyjnych.
 *
 * @example
 * // Proste użycie z soft delete
 * const { execute, isExecuting } = useUndoableAction({
 *   action: () => api.softDeleteDelivery(deliveryId),
 *   undoAction: () => api.restoreDelivery(deliveryId),
 *   successMessage: 'Dostawa usunięta',
 * });
 *
 * <Button onClick={execute} disabled={isExecuting}>
 *   {isExecuting ? 'Usuwanie...' : 'Usuń'}
 * </Button>
 *
 * @example
 * // Z hard delete po wygaśnięciu
 * const { execute } = useUndoableAction({
 *   action: () => api.softDeleteDelivery(deliveryId),
 *   undoAction: () => api.restoreDelivery(deliveryId),
 *   successMessage: 'Dostawa usunięta',
 *   duration: 10000, // 10 sekund na cofnięcie
 *   showCountdown: true,
 *   onExpire: () => api.permanentDeleteDelivery(deliveryId),
 * });
 *
 * @example
 * // Z cache invalidation
 * const { execute } = useUndoableAction({
 *   action: async () => {
 *     const result = await api.softDeleteOrder(orderId);
 *     queryClient.invalidateQueries(['orders']);
 *     return result;
 *   },
 *   undoAction: async () => {
 *     await api.restoreOrder(orderId);
 *     queryClient.invalidateQueries(['orders']);
 *   },
 *   successMessage: 'Zlecenie usunięte',
 *   onSuccess: () => {
 *     // Dodatkowe akcje po usunięciu
 *   },
 * });
 */
export function useUndoableAction<TResult>(
  options: UseUndoableActionOptions<TResult>
): UseUndoableActionReturn<TResult> {
  const {
    action,
    undoAction,
    successMessage,
    successDescription,
    undoMessage = 'Cofnięto',
    duration = 5000,
    showCountdown = false,
    onExpire,
    onSuccess,
    onError,
  } = options;

  const [isExecuting, setIsExecuting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [lastResult, setLastResult] = useState<TResult | undefined>(undefined);

  const execute = useCallback(async (): Promise<TResult | undefined> => {
    setIsExecuting(true);

    try {
      // Wykonaj główną akcję
      const result = await action();
      setLastResult(result);

      // Callback onSuccess
      onSuccess?.(result);

      // Pokaż toast z opcją cofnięcia
      const toastOptions = {
        title: successMessage,
        description: successDescription,
        duration,
        onUndo: async () => {
          setIsUndoing(true);
          try {
            await undoAction(result);
            setLastResult(undefined);
            showSuccessToast(undoMessage);
          } catch (undoError) {
            const errorMsg = undoError instanceof Error ? undoError.message : 'Nieznany błąd';
            showErrorToast('Nie udało się cofnąć', errorMsg);
            throw undoError;
          } finally {
            setIsUndoing(false);
          }
        },
        onExpire: onExpire
          ? async () => {
              try {
                await onExpire(result);
              } catch (expireError) {
                console.error('Error in onExpire callback:', expireError);
              }
            }
          : undefined,
      };

      if (showCountdown) {
        showUndoToastWithCountdown(toastOptions);
      } else {
        showUndoToast(toastOptions);
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      showErrorToast('Wystąpił błąd', errorObj.message);
      onError?.(errorObj);
      return undefined;
    } finally {
      setIsExecuting(false);
    }
  }, [
    action,
    undoAction,
    successMessage,
    successDescription,
    undoMessage,
    duration,
    showCountdown,
    onExpire,
    onSuccess,
    onError,
  ]);

  return {
    execute,
    isExecuting,
    isUndoing,
    lastResult,
  };
}

// ================================
// useConfirmAndUndo
// ================================

/**
 * Hook łączący confirmation dialog z undo.
 * Używaj dla operacji które wymagają najpierw potwierdzenia,
 * ale po wykonaniu można je jeszcze cofnąć.
 *
 * @example
 * const { isOpen, openConfirm, confirm, cancel, isExecuting } = useConfirmAndUndo({
 *   action: () => api.softDeleteDelivery(id),
 *   undoAction: () => api.restoreDelivery(id),
 *   successMessage: 'Dostawa usunięta',
 * });
 *
 * <AlertDialog open={isOpen}>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>Czy na pewno chcesz usunąć?</AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel onClick={cancel}>Anuluj</AlertDialogCancel>
 *       <AlertDialogAction onClick={confirm} disabled={isExecuting}>
 *         Usuń
 *       </AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 *
 * <Button onClick={openConfirm}>Usuń dostawę</Button>
 */
export function useConfirmAndUndo<TResult>(
  options: UseUndoableActionOptions<TResult>
): UseUndoableActionReturn<TResult> & {
  isOpen: boolean;
  openConfirm: () => void;
  confirm: () => Promise<TResult | undefined>;
  cancel: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const undoable = useUndoableAction(options);

  const openConfirm = useCallback(() => {
    setIsOpen(true);
  }, []);

  const confirm = useCallback(async () => {
    setIsOpen(false);
    return undoable.execute();
  }, [undoable]);

  const cancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    ...undoable,
    isOpen,
    openConfirm,
    confirm,
    cancel,
  };
}
