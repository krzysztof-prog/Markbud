/**
 * Toast z akcją "Cofnij" dla operacji destrukcyjnych
 *
 * Umożliwia użytkownikowi cofnięcie akcji w określonym czasie (domyślnie 5s)
 */

import * as React from 'react';
import { toast } from '@/hooks/useToast';
import { ToastAction } from '@/components/ui/toast';

// ================================
// Typy
// ================================

export interface UndoToastOptions {
  /** Tytuł toastu */
  title: string;
  /** Opis (opcjonalny) */
  description?: string;
  /** Etykieta przycisku cofnij (domyślnie "Cofnij") */
  undoLabel?: string;
  /** Callback wykonywany gdy użytkownik kliknie "Cofnij" */
  onUndo: () => void | Promise<void>;
  /** Czas na cofnięcie w ms (domyślnie 5000) */
  duration?: number;
  /** Callback gdy czas na cofnięcie minął */
  onExpire?: () => void;
}

// ================================
// showUndoToast
// ================================

/**
 * Pokazuje toast z przyciskiem "Cofnij" dla akcji destrukcyjnych.
 *
 * WAŻNE: Użyj tego dla operacji które można cofnąć (soft delete, zmiana statusu).
 * Dla hard delete użyj confirmation dialog PRZED akcją.
 *
 * @example
 * // Po soft delete:
 * const { dismiss } = showUndoToast({
 *   title: 'Dostawa usunięta',
 *   description: 'Kliknij "Cofnij" aby przywrócić',
 *   onUndo: async () => {
 *     await api.restoreDelivery(id);
 *     queryClient.invalidateQueries(['deliveries']);
 *   },
 *   onExpire: () => {
 *     // Opcjonalnie: hard delete po wygaśnięciu
 *     api.permanentDeleteDelivery(id);
 *   },
 * });
 */
export function showUndoToast(options: UndoToastOptions): { dismiss: () => void } {
  const {
    title,
    description,
    undoLabel = 'Cofnij',
    onUndo,
    duration = 5000,
    onExpire,
  } = options;

  let undoClicked = false;
  let timeoutId: NodeJS.Timeout | null = null;

  // Utworzenie akcji "Cofnij"
  const undoAction = React.createElement(
    ToastAction,
    {
      altText: undoLabel,
      onClick: async () => {
        undoClicked = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        try {
          await onUndo();
          // Pokaż potwierdzenie cofnięcia
          toast({
            title: 'Cofnięto',
            description: 'Operacja została cofnięta',
            variant: 'success',
          });
        } catch (error) {
          toast({
            title: 'Błąd cofania',
            description: error instanceof Error ? error.message : 'Nie udało się cofnąć operacji',
            variant: 'destructive',
          });
        }
      },
    },
    undoLabel
  );

  const { dismiss } = toast({
    title,
    description,
    variant: 'warning',
    action: undoAction,
  });

  // Ustaw timeout dla onExpire
  if (onExpire) {
    timeoutId = setTimeout(() => {
      if (!undoClicked) {
        onExpire();
      }
    }, duration);
  }

  return {
    dismiss: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      dismiss();
    },
  };
}

/**
 * Pokazuje toast z odliczaniem czasu na cofnięcie.
 * Bardziej wizualna wersja showUndoToast z paskiem postępu.
 *
 * @example
 * showUndoToastWithCountdown({
 *   title: 'Usuwanie za 5s...',
 *   onUndo: () => restoreItem(),
 *   onExpire: () => permanentDelete(),
 * });
 */
export function showUndoToastWithCountdown(options: UndoToastOptions): { dismiss: () => void } {
  const {
    title,
    description,
    undoLabel = 'Cofnij',
    onUndo,
    duration = 5000,
    onExpire,
  } = options;

  let undoClicked = false;
  let currentProgress = 100;
  const updateInterval = 100; // Aktualizuj co 100ms
  const decrementPerUpdate = (100 / duration) * updateInterval;

  // Tworzymy opis z paskiem postępu
  const createDescription = (progress: number, text?: string): React.ReactNode => {
    return React.createElement(
      'div',
      { className: 'space-y-2' },
      text && React.createElement('span', null, text),
      React.createElement(
        'div',
        { className: 'w-full h-1.5 bg-slate-200 rounded-full overflow-hidden' },
        React.createElement('div', {
          className: 'h-full bg-yellow-500 transition-all duration-100',
          style: { width: `${progress}%` },
        })
      )
    );
  };

  // Utworzenie akcji "Cofnij"
  const undoAction = React.createElement(
    ToastAction,
    {
      altText: undoLabel,
      onClick: async () => {
        undoClicked = true;

        try {
          await onUndo();
          update({
            id,
            title: 'Cofnięto',
            description: 'Operacja została cofnięta',
            variant: 'success',
            action: undefined,
          });
          setTimeout(dismiss, 2000);
        } catch (error) {
          update({
            id,
            title: 'Błąd cofania',
            description: error instanceof Error ? error.message : 'Nie udało się cofnąć operacji',
            variant: 'destructive',
            action: undefined,
          });
          setTimeout(dismiss, 3000);
        }
      },
    },
    undoLabel
  );

  const { id, dismiss, update } = toast({
    title,
    description: createDescription(100, description),
    variant: 'warning',
    action: undoAction,
  });

  // Animuj pasek postępu
  const intervalId = setInterval(() => {
    if (undoClicked) {
      clearInterval(intervalId);
      return;
    }

    currentProgress -= decrementPerUpdate;

    if (currentProgress <= 0) {
      clearInterval(intervalId);
      dismiss();
      if (onExpire) {
        onExpire();
      }
      return;
    }

    update({
      id,
      title,
      description: createDescription(currentProgress, description),
      variant: 'warning',
      action: undoAction,
      open: true,
    });
  }, updateInterval);

  return {
    dismiss: () => {
      clearInterval(intervalId);
      dismiss();
    },
  };
}
