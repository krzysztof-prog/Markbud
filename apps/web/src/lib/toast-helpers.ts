import { toast } from '@/hooks/useToast';
import { ToastAction } from '@/components/ui/toast';
import * as React from 'react';

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

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (typeof err.message === 'string') {
      return err.message;
    }
  }
  return 'Coś poszło nie tak';
};
