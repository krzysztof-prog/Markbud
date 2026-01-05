/**
 * Mapowanie błędów API na komunikaty zrozumiałe dla użytkownika (PL)
 *
 * @module error-messages
 * @description Centralne miejsce dla wszystkich komunikatów błędów w aplikacji
 */

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.',
  TIMEOUT: 'Serwer nie odpowiada. Spróbuj ponownie za chwilę.',
  ECONNABORTED: 'Połączenie przerwane. Spróbuj ponownie.',

  // HTTP status codes
  400: 'Wysłane dane są nieprawidłowe. Sprawdź formularz.',
  401: 'Sesja wygasła. Zaloguj się ponownie.',
  403: 'Brak uprawnień do wykonania tej operacji.',
  404: 'Nie znaleziono żądanego zasobu.',
  409: 'Ta operacja koliduje z istniejącymi danymi.',
  422: 'Dane nie przeszły walidacji. Sprawdź poprawność.',
  500: 'Błąd serwera. Skontaktuj się z administratorem.',
  502: 'Serwer tymczasowo niedostępny. Spróbuj ponownie później.',
  503: 'Serwis w trakcie konserwacji. Spróbuj ponownie później.',
  504: 'Przekroczono czas oczekiwania na odpowiedź serwera.',

  // Business errors - Warehouse
  PROFILE_NOT_FOUND: 'Nie znaleziono profilu w magazynie.',
  INSUFFICIENT_STOCK: 'Niewystarczający stan magazynowy.',
  WAREHOUSE_ORDER_EXISTS: 'Zamówienie magazynowe już istnieje.',
  REMANENT_ALREADY_FINALIZED: 'Remanent został już sfinalizowany.',
  CANNOT_MODIFY_FINALIZED: 'Nie można modyfikować sfinalizowanego remanentu.',

  // Business errors - Deliveries
  DELIVERY_HAS_ORDERS: 'Nie można usunąć dostawy zawierającej zlecenia.',
  DELIVERY_NOT_FOUND: 'Nie znaleziono dostawy.',
  DELIVERY_DATE_INVALID: 'Data dostawy jest nieprawidłowa.',
  DELIVERY_ALREADY_EXISTS: 'Dostawa na ten dzień już istnieje.',

  // Business errors - Orders
  DUPLICATE_ORDER: 'Zlecenie o tym numerze już istnieje w systemie.',
  ORDER_NOT_FOUND: 'Nie znaleziono zlecenia.',
  ORDER_ALREADY_ARCHIVED: 'Zlecenie zostało już zarchiwizowane.',
  CANNOT_DELETE_ARCHIVED: 'Nie można usunąć zarchiwizowanego zlecenia.',

  // Business errors - Import
  IMPORT_CONFLICT: 'Plik zawiera dane które już istnieją w systemie.',
  IMPORT_VALIDATION_FAILED: 'Plik zawiera nieprawidłowe dane.',
  FILE_TOO_LARGE: 'Plik jest zbyt duży. Maksymalny rozmiar to 10MB.',
  INVALID_FILE_FORMAT: 'Nieprawidłowy format pliku. Dozwolone: CSV, PDF.',
  FILE_PARSE_ERROR: 'Nie można odczytać pliku. Sprawdź format.',

  // Business errors - Glass
  GLASS_ORDER_NOT_FOUND: 'Nie znaleziono zamówienia szyb.',
  GLASS_DELIVERY_NOT_FOUND: 'Nie znaleziono dostawy szyb.',

  // Business errors - Schuco
  SCHUCO_SYNC_FAILED: 'Nie udało się zsynchronizować danych Schuco.',
  SCHUCO_LOGIN_FAILED: 'Błąd logowania do systemu Schuco.',

  // Generic fallback
  UNKNOWN: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub skontaktuj się z administratorem.'
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

/**
 * Sugestie akcji dla użytkownika na podstawie błędu
 */
const ERROR_ACTIONS: Partial<Record<ErrorCode | number, string>> = {
  400: 'Popraw dane i spróbuj ponownie',
  401: 'Zaloguj się ponownie',
  403: 'Skontaktuj się z administratorem w sprawie uprawnień',
  404: 'Sprawdź czy zasób istnieje',
  409: 'Sprawdź istniejące dane przed kontynuowaniem',
  422: 'Popraw błędy walidacji i spróbuj ponownie',
  500: 'Poczekaj chwilę i odśwież stronę',
  502: 'Poczekaj chwilę i odśwież stronę',
  503: 'Poczekaj na zakończenie konserwacji',
  504: 'Spróbuj ponownie za chwilę',
  NETWORK_ERROR: 'Sprawdź połączenie internetowe i spróbuj ponownie',
  TIMEOUT: 'Spróbuj ponownie za chwilę',
  IMPORT_CONFLICT: 'Sprawdź jakie dane już istnieją lub pomiń duplikaty',
  INSUFFICIENT_STOCK: 'Złóż zamówienie na brakujące profile'
};

/**
 * Interface dla szczegółów błędu
 */
export interface ErrorDetails {
  message: string;
  action?: string;
  originalError?: unknown;
}

/**
 * Pobiera przyjazny komunikat błędu z API error
 *
 * @param error - Błąd z API (axios error, fetch error, lub Error object)
 * @returns Przyjazny komunikat po polsku
 *
 * @example
 * ```typescript
 * try {
 *   await createDelivery(data);
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   toast({ title: 'Błąd', description: message, variant: 'destructive' });
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  // Sprawdź czy to axios error
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: {
          message?: string;
          error?: string;
          code?: string;
        };
      };
    };

    const response = axiosError.response;

    // Sprawdź czy backend zwrócił custom message
    if (response?.data) {
      // Priorytet 1: Backend message (jeśli jest po polsku)
      if (response.data.message && typeof response.data.message === 'string') {
        // Jeśli message zawiera known error code, użyj naszego mappingu
        const upperMessage = response.data.message.toUpperCase();
        for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
          if (upperMessage.includes(code)) {
            return message;
          }
        }
        // Jeśli message nie jest techniczny, użyj go
        if (!response.data.message.match(/error|exception|stack/i)) {
          return response.data.message;
        }
      }

      // Priorytet 2: Error code
      if (response.data.code && response.data.code in ERROR_MESSAGES) {
        return ERROR_MESSAGES[response.data.code as ErrorCode];
      }

      // Priorytet 3: Error field
      if (response.data.error && typeof response.data.error === 'string') {
        const upperError = response.data.error.toUpperCase();
        for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
          if (upperError.includes(code)) {
            return message;
          }
        }
      }
    }

    // Mapuj status code
    const status = response?.status;
    if (status && status in ERROR_MESSAGES) {
      return ERROR_MESSAGES[status as keyof typeof ERROR_MESSAGES];
    }
  }

  // Sprawdź czy to network error
  if (error && typeof error === 'object' && 'code' in error) {
    const networkError = error as { code?: string };
    if (networkError.code === 'ERR_NETWORK') {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (networkError.code === 'ECONNABORTED') {
      return ERROR_MESSAGES.ECONNABORTED;
    }
  }

  // Error object with message
  if (error instanceof Error) {
    // Sprawdź czy message zawiera znany kod błędu
    const upperMessage = error.message.toUpperCase();
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      if (upperMessage.includes(code)) {
        return message;
      }
    }

    // Timeout errors
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT;
    }

    // Network errors
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
  }

  // Fallback
  return ERROR_MESSAGES.UNKNOWN;
}

/**
 * Pobiera sugestię co użytkownik może zrobić
 *
 * @param error - Błąd z API
 * @returns Sugestia akcji lub null jeśli brak
 *
 * @example
 * ```typescript
 * const action = getErrorAction(error);
 * if (action) {
 *   toast({
 *     description: `${getErrorMessage(error)}. ${action}`,
 *     variant: 'destructive'
 *   });
 * }
 * ```
 */
export function getErrorAction(error: unknown): string | null {
  // Sprawdź axios error status
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: { code?: string } } };
    const status = axiosError.response?.status;
    const code = axiosError.response?.data?.code;

    // Sprawdź custom error code
    if (code && code in ERROR_ACTIONS) {
      return ERROR_ACTIONS[code as ErrorCode] || null;
    }

    // Sprawdź status code
    if (status && status in ERROR_ACTIONS) {
      return ERROR_ACTIONS[status] || null;
    }
  }

  // Sprawdź network error
  if (error && typeof error === 'object' && 'code' in error) {
    const networkError = error as { code?: string };
    if (networkError.code === 'ERR_NETWORK') {
      return ERROR_ACTIONS.NETWORK_ERROR || null;
    }
    if (networkError.code === 'ECONNABORTED') {
      return ERROR_ACTIONS.TIMEOUT || null;
    }
  }

  return null;
}

/**
 * Pobiera pełne szczegóły błędu (message + action)
 *
 * @param error - Błąd z API
 * @returns Obiekt z message, action i originalError
 *
 * @example
 * ```typescript
 * const { message, action } = getErrorDetails(error);
 * toast({
 *   title: 'Błąd',
 *   description: action ? `${message}. ${action}` : message,
 *   variant: 'destructive'
 * });
 * ```
 */
export function getErrorDetails(error: unknown): ErrorDetails {
  return {
    message: getErrorMessage(error),
    action: getErrorAction(error) || undefined,
    originalError: error
  };
}

/**
 * Formatuje błąd do user-friendly stringa (message + action)
 *
 * @param error - Błąd z API
 * @returns Sformatowany string z komunikatem i akcją
 *
 * @example
 * ```typescript
 * toast({
 *   title: 'Błąd',
 *   description: formatError(error),
 *   variant: 'destructive'
 * });
 * ```
 */
export function formatError(error: unknown): string {
  const message = getErrorMessage(error);
  const action = getErrorAction(error);

  return action ? `${message} ${action}` : message;
}
