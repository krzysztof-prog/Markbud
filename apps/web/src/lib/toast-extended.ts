/**
 * Rozszerzone funkcje toastów
 * - showPersistentToast - toast który nie znika automatycznie (dla krytycznych błędów)
 * - showProgressToast - toast z paskiem postępu (dla długich operacji)
 * - showGroupedToast - podsumowanie wielu operacji (dla bulk actions)
 */

import * as React from 'react';
import { toast } from '@/hooks/useToast';
import { ToastAction } from '@/components/ui/toast';

// ================================
// Typy
// ================================

export interface PersistentToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'info' | 'warning';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ProgressToastController {
  /** Aktualizuj postęp (0-100) i opcjonalnie opis */
  update: (progress: number, description?: string) => void;
  /** Zakończ z sukcesem */
  complete: (title?: string, description?: string) => void;
  /** Zakończ z błędem */
  error: (title?: string, description?: string) => void;
  /** Zamknij toast */
  dismiss: () => void;
}

export interface ProgressToastOptions {
  title: string;
  description?: string;
}

export interface GroupedToastOptions {
  title: string;
  results: {
    success: number;
    failed: number;
    total: number;
  };
  /** Lista nazw elementów które się nie powiodły (max 3 pokazane) */
  failedItems?: string[];
  /** Callback gdy użytkownik kliknie "Pokaż szczegóły" */
  onShowDetails?: () => void;
}

// ================================
// showPersistentToast
// ================================

/**
 * Pokazuje toast który NIE znika automatycznie.
 * Użyj dla krytycznych błędów wymagających uwagi użytkownika.
 *
 * @example
 * const { dismiss } = showPersistentToast({
 *   title: 'Błąd połączenia z bazą danych',
 *   description: 'Sprawdź połączenie sieciowe',
 *   variant: 'destructive',
 *   action: {
 *     label: 'Spróbuj ponownie',
 *     onClick: () => refetch(),
 *   },
 * });
 */
export function showPersistentToast(options: PersistentToastOptions): { dismiss: () => void } {
  const { title, description, variant = 'destructive', action } = options;

  // Tworzymy toast z akcją jeśli podana
  const toastAction = action
    ? React.createElement(
        ToastAction,
        {
          altText: action.label,
          onClick: action.onClick,
        },
        action.label
      )
    : undefined;

  // Toast z duration w Radix nie jest bezpośrednio wspierany przez nasz system,
  // ale możemy użyć update aby uniemożliwić automatyczne zamknięcie
  const { id, dismiss, update } = toast({
    title,
    description,
    variant,
    action: toastAction,
  });

  // Hack: Periodycznie odświeżamy toast aby nie zniknął
  // (TOAST_REMOVE_DELAY = 5000ms, więc odświeżamy co 4s)
  const intervalId = setInterval(() => {
    update({
      id,
      title,
      description,
      variant,
      action: toastAction,
      open: true,
    });
  }, 4000);

  return {
    dismiss: () => {
      clearInterval(intervalId);
      dismiss();
    },
  };
}

// ================================
// showProgressToast
// ================================

/**
 * Pokazuje toast z paskiem postępu dla długich operacji.
 * Zwraca kontroler do aktualizacji postępu.
 *
 * @example
 * const progress = showProgressToast({
 *   title: 'Importowanie zleceń...',
 *   description: '0 / 100',
 * });
 *
 * // W trakcie operacji:
 * progress.update(50, '50 / 100');
 *
 * // Po zakończeniu:
 * progress.complete('Import zakończony', 'Zaimportowano 100 zleceń');
 * // lub
 * progress.error('Import nie powiódł się', 'Wystąpił błąd');
 */
export function showProgressToast(options: ProgressToastOptions): ProgressToastController {
  const { title, description } = options;

  // Używamy custom description z paskiem postępu
  let currentProgress = 0;

  const createDescription = (progress: number, text?: string): React.ReactNode => {
    return React.createElement(
      'div',
      { className: 'space-y-2' },
      text && React.createElement('span', null, text),
      React.createElement(
        'div',
        { className: 'w-full h-2 bg-slate-200 rounded-full overflow-hidden' },
        React.createElement('div', {
          className: 'h-full bg-blue-500 transition-all duration-300',
          style: { width: `${progress}%` },
        })
      )
    );
  };

  const { id, dismiss, update } = toast({
    title,
    description: createDescription(0, description),
    variant: 'info',
  });

  // Jak w showPersistentToast - zapobiegamy auto-dismiss
  const intervalId = setInterval(() => {
    update({
      id,
      title,
      description: createDescription(currentProgress, description),
      variant: 'info',
      open: true,
    });
  }, 4000);

  return {
    update: (progress: number, newDescription?: string) => {
      currentProgress = Math.min(100, Math.max(0, progress));
      update({
        id,
        title,
        description: createDescription(currentProgress, newDescription),
        variant: 'info',
        open: true,
      });
    },

    complete: (successTitle?: string, successDescription?: string) => {
      clearInterval(intervalId);
      update({
        id,
        title: successTitle || 'Zakończono',
        description: successDescription,
        variant: 'success',
        open: true,
      });
      // Auto-dismiss po 3s
      setTimeout(dismiss, 3000);
    },

    error: (errorTitle?: string, errorDescription?: string) => {
      clearInterval(intervalId);
      update({
        id,
        title: errorTitle || 'Wystąpił błąd',
        description: errorDescription,
        variant: 'destructive',
        open: true,
      });
      // Auto-dismiss po 5s (dłużej dla błędów)
      setTimeout(dismiss, 5000);
    },

    dismiss: () => {
      clearInterval(intervalId);
      dismiss();
    },
  };
}

// ================================
// showGroupedToast
// ================================

/**
 * Pokazuje podsumowanie wielu operacji zamiast N osobnych toastów.
 * Przydatne dla bulk import, bulk delete, itp.
 *
 * @example
 * showGroupedToast({
 *   title: 'Import zakończony',
 *   results: { success: 45, failed: 3, total: 48 },
 *   failedItems: ['Zlecenie 123', 'Zlecenie 456', 'Zlecenie 789'],
 *   onShowDetails: () => setShowErrorDialog(true),
 * });
 */
export function showGroupedToast(options: GroupedToastOptions): void {
  const { title, results, failedItems, onShowDetails } = options;
  const { success, failed, total } = results;

  // Określ wariant na podstawie wyników
  let variant: 'success' | 'warning' | 'destructive' = 'success';
  if (failed === total) {
    variant = 'destructive';
  } else if (failed > 0) {
    variant = 'warning';
  }

  // Buduj opis
  let descriptionText = `Sukces: ${success}/${total}`;
  if (failed > 0) {
    descriptionText += ` | Błędy: ${failed}`;
    if (failedItems && failedItems.length > 0) {
      const displayItems = failedItems.slice(0, 3);
      const moreCount = failedItems.length - 3;
      descriptionText += `\n${displayItems.join(', ')}`;
      if (moreCount > 0) {
        descriptionText += ` i ${moreCount} więcej...`;
      }
    }
  }

  // Akcja "Pokaż szczegóły" jeśli są błędy i callback
  const action =
    failed > 0 && onShowDetails
      ? React.createElement(
          ToastAction,
          {
            altText: 'Pokaż szczegóły',
            onClick: onShowDetails,
          },
          'Szczegóły'
        )
      : undefined;

  toast({
    title,
    description: descriptionText,
    variant,
    action,
  });
}
