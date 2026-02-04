import { toast } from '@/hooks/useToast';
import { ToastAction } from '@/components/ui/toast';
import * as React from 'react';
import { getErrorMessage as getCentralErrorMessage, getErrorAction } from './error-messages';

// Re-eksporty rozszerzonych funkcji toastów
export {
  showPersistentToast,
  showProgressToast,
  showGroupedToast,
  type PersistentToastOptions,
  type ProgressToastController,
  type ProgressToastOptions,
  type GroupedToastOptions,
} from './toast-extended';

export {
  showUndoToast,
  showUndoToastWithCountdown,
  type UndoToastOptions,
} from './toast-undo';

export const showSuccessToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'success',
  });
};

export const showErrorToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'destructive',
  });
};

export const showInfoToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'info',
  });
};

export const showWarningToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'warning',
  });
};

/**
 * Pokazuje toast z błędem i przyciskiem "Ponów"
 * Użyj gdy operacja może być ponowiona (np. błąd sieci)
 */
export const showRetryableErrorToast = (
  title: string,
  description: string,
  onRetry: () => void
) => {
  toast({
    title,
    description,
    variant: 'destructive',
    action: React.createElement(ToastAction, {
      altText: 'Ponów operację',
      onClick: onRetry,
    }, 'Ponów'),
  });
};

/**
 * Kategorie błędów dla lepszego UX
 */
export type ErrorCategory = 'network' | 'timeout' | 'validation' | 'server' | 'unknown';

/**
 * Rozpoznaje kategorię błędu na podstawie jego treści
 */
export const categorizeError = (error: unknown): ErrorCategory => {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes('timeout') || message.includes('czas')) {
    return 'timeout';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('sieć') || message.includes('połączenie')) {
    return 'network';
  }
  if (message.includes('validation') || message.includes('walidacja') || message.includes('wymagane') || message.includes('nieprawidłow')) {
    return 'validation';
  }
  if (message.includes('500') || message.includes('server') || message.includes('serwer')) {
    return 'server';
  }
  return 'unknown';
};

/**
 * Pokazuje odpowiedni toast w zależności od kategorii błędu
 */
export const showCategorizedErrorToast = (
  error: unknown,
  onRetry?: () => void
) => {
  const message = getErrorMessage(error);
  const category = categorizeError(error);

  switch (category) {
    case 'timeout':
      if (onRetry) {
        showRetryableErrorToast(
          'Przekroczono czas oczekiwania',
          'Operacja trwała zbyt długo. Spróbuj ponownie.',
          onRetry
        );
      } else {
        showErrorToast('Przekroczono czas oczekiwania', 'Operacja trwała zbyt długo.');
      }
      break;
    case 'network':
      if (onRetry) {
        showRetryableErrorToast(
          'Błąd połączenia',
          'Sprawdź połączenie z internetem i spróbuj ponownie.',
          onRetry
        );
      } else {
        showErrorToast('Błąd połączenia', 'Sprawdź połączenie z internetem.');
      }
      break;
    case 'validation':
      showWarningToast('Błąd walidacji', message);
      break;
    case 'server':
      showErrorToast('Błąd serwera', 'Wystąpił problem po stronie serwera. Spróbuj później.');
      break;
    default:
      showErrorToast('Wystąpił błąd', message);
  }
};

/**
 * Pobiera user-friendly komunikat błędu (używa centralnego systemu)
 *
 * @deprecated Użyj getCentralErrorMessage z error-messages.ts bezpośrednio
 */
export const getErrorMessage = (error: unknown): string => {
  return getCentralErrorMessage(error);
};

/**
 * Pokazuje toast z błędem używając centralnego systemu error-messages
 * Automatycznie dodaje sugerowaną akcję jeśli jest dostępna
 */
export const showApiErrorToast = (title: string, error: unknown) => {
  const message = getCentralErrorMessage(error);
  const action = getErrorAction(error);

  const description = action ? `${message} ${action}` : message;

  toast({
    title,
    description,
    variant: 'destructive',
  });
};
