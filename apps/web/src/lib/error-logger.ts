/**
 * Centralizowane logowanie błędów dla frontendu
 * Przygotowane do integracji z Sentry/LogRocket
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Główna funkcja logowania błędów
 */
export function logError(
  error: unknown,
  context?: ErrorContext,
  severity: ErrorSeverity = 'error'
): void {
  const errorInfo = extractErrorInfo(error);

  // Console logging (zawsze w development)
  if (process.env.NODE_ENV === 'development') {
    const logFn = severity === 'error' ? console.error : severity === 'warning' ? console.warn : console.log;

    logFn('[Error Logger]', {
      severity,
      message: errorInfo.message,
      context,
      error: errorInfo,
    });
  }

  // W production - wysyłaj do serwisu (np. Sentry)
  if (process.env.NODE_ENV === 'production') {
    sendToErrorService(errorInfo, context, severity);
  }

  // Zapisz do localStorage dla debugging (max 50 ostatnich)
  saveToLocalStorage(errorInfo, context, severity);
}

/**
 * Logowanie błędu API
 */
export function logApiError(
  error: unknown,
  endpoint: string,
  method: string = 'GET',
  additionalContext?: ErrorContext
): void {
  logError(error, {
    ...additionalContext,
    component: 'API Client',
    endpoint,
    method,
  });
}

/**
 * Logowanie błędu React Query
 */
export function logQueryError(
  error: unknown,
  queryKey: unknown[],
  additionalContext?: ErrorContext
): void {
  logError(error, {
    ...additionalContext,
    component: 'React Query',
    queryKey: JSON.stringify(queryKey),
  });
}

/**
 * Logowanie błędu mutacji
 */
export function logMutationError(
  error: unknown,
  mutationKey: string,
  variables?: unknown,
  additionalContext?: ErrorContext
): void {
  logError(error, {
    ...additionalContext,
    component: 'React Query Mutation',
    mutationKey,
    variables: variables ? JSON.stringify(variables) : undefined,
  });
}

/**
 * Logowanie błędu komponentu React
 */
export function logComponentError(
  error: unknown,
  componentName: string,
  componentStack?: string,
  additionalContext?: ErrorContext
): void {
  logError(error, {
    ...additionalContext,
    component: componentName,
    componentStack,
  });
}

/**
 * Logowanie błędu WebSocket
 */
export function logWebSocketError(
  error: unknown,
  event: string,
  additionalContext?: ErrorContext
): void {
  logError(error, {
    ...additionalContext,
    component: 'WebSocket',
    event,
  }, 'warning');
}

/**
 * Wyciąga informacje z błędu
 */
function extractErrorInfo(error: unknown): {
  message: string;
  stack?: string;
  status?: number;
  code?: string;
  name?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // @ts-expect-error - ApiError ma dodatkowe pola
      status: error.status,
      // @ts-expect-error - ApiError ma dodatkowe pola
      code: error.code,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    return {
      message: 'message' in error ? String(error.message) : 'Nieznany błąd',
      // @ts-expect-error - może mieć status
      status: 'status' in error ? error.status : undefined,
      // @ts-expect-error - może mieć code
      code: 'code' in error ? error.code : undefined,
    };
  }

  return { message: 'Nieznany błąd' };
}

/**
 * Wysyła błąd do zewnętrznego serwisu (np. Sentry)
 * TODO: Implementacja integracji z Sentry/LogRocket
 */
function sendToErrorService(
  errorInfo: ReturnType<typeof extractErrorInfo>,
  context?: ErrorContext,
  severity?: ErrorSeverity
): void {
  // Placeholder dla integracji z Sentry:
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureException(new Error(errorInfo.message), {
  //     level: severity,
  //     extra: {
  //       ...context,
  //       ...errorInfo,
  //     },
  //   });
  // }

  // Na razie tylko console w production
  console.error('[Error Service]', { errorInfo, context, severity });
}

/**
 * Zapisuje błąd do localStorage dla debugging
 */
function saveToLocalStorage(
  errorInfo: ReturnType<typeof extractErrorInfo>,
  context?: ErrorContext,
  severity?: ErrorSeverity
): void {
  try {
    const key = 'error-logs';
    const maxLogs = 50;

    const existingLogs = localStorage.getItem(key);
    const logs: Array<{
      timestamp: string;
      severity: ErrorSeverity;
      error: ReturnType<typeof extractErrorInfo>;
      context?: ErrorContext;
    }> = existingLogs ? JSON.parse(existingLogs) : [];

    logs.unshift({
      timestamp: new Date().toISOString(),
      severity: severity || 'error',
      error: errorInfo,
      context,
    });

    // Zachowaj tylko ostatnie N logów
    if (logs.length > maxLogs) {
      logs.splice(maxLogs);
    }

    localStorage.setItem(key, JSON.stringify(logs));
  } catch (e) {
    // Ignoruj błędy localStorage (może być pełny lub niedostępny)
    console.warn('Nie można zapisać błędu do localStorage', e);
  }
}

/**
 * Pobiera logi błędów z localStorage
 */
export function getErrorLogs(): Array<{
  timestamp: string;
  severity: ErrorSeverity;
  error: ReturnType<typeof extractErrorInfo>;
  context?: ErrorContext;
}> {
  try {
    const logs = localStorage.getItem('error-logs');
    return logs ? JSON.parse(logs) : [];
  } catch (e) {
    console.warn('Nie można pobrać logów błędów', e);
    return [];
  }
}

/**
 * Czyści logi błędów z localStorage
 */
export function clearErrorLogs(): void {
  try {
    localStorage.removeItem('error-logs');
  } catch (e) {
    console.warn('Nie można wyczyścić logów błędów', e);
  }
}

/**
 * Sprawdza czy cache React Query jest uszkodzony i czyści go jeśli tak
 */
export function validateAndClearCorruptedCache(): void {
  if (typeof window === 'undefined') return;

  const cacheKey = 'AKROBUD_REACT_QUERY_CACHE';
  try {
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      // Próbujemy sparsować cache - jeśli się nie uda, jest uszkodzony
      JSON.parse(cache);
    }
  } catch {
    console.warn('[Cache Validator] Uszkodzony cache React Query wykryty, czyszczenie...');
    try {
      localStorage.removeItem(cacheKey);
      console.info('[Cache Validator] Cache wyczyszczony pomyślnie');
    } catch (removeError) {
      console.error('[Cache Validator] Nie można wyczyścić cache', removeError);
    }
  }
}

/**
 * Czyści cache React Query (do ręcznego użycia)
 */
export function clearReactQueryCache(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('AKROBUD_REACT_QUERY_CACHE');
    console.info('[Cache] React Query cache wyczyszczony');
  } catch (e) {
    console.warn('Nie można wyczyścić cache React Query', e);
  }
}

/**
 * Hook window.onerror dla globalnego przechwytywania błędów
 */
export function setupGlobalErrorHandler(): void {
  if (typeof window === 'undefined') return;

  // Waliduj cache przy starcie aplikacji
  validateAndClearCorruptedCache();

  window.onerror = (message, source, lineno, colno, error) => {
    logError(error || message, {
      component: 'Global Error Handler',
      source,
      line: lineno,
      column: colno,
    });

    return false; // Pozwól innym handlerom obsłużyć błąd
  };

  window.onunhandledrejection = (event) => {
    logError(event.reason, {
      component: 'Unhandled Promise Rejection',
      promise: String(event.promise),
    });
  };
}
