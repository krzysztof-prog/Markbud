/**
 * Uniwersalny komponent do wyświetlania błędów
 * Używany w query states, formularzach i innych miejscach
 */

import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';

export interface ErrorUIProps {
  /** Wiadomość błędu */
  message?: string;
  /** Tytuł błędu */
  title?: string;
  /** Funkcja retry */
  onRetry?: () => void;
  /** Tekst przycisku retry */
  retryText?: string;
  /** Czy pokazać przycisk powrotu do strony głównej */
  showHomeButton?: boolean;
  /** Wariant wyświetlania */
  variant?: 'inline' | 'centered' | 'alert';
  /** Czy wyświetlić szczegóły błędu (tylko dev) */
  error?: Error;
  /** Dodatkowe akcje */
  actions?: React.ReactNode;
}

export function ErrorUI({
  message = 'Wystąpił nieoczekiwany błąd',
  title = 'Błąd',
  onRetry,
  retryText = 'Spróbuj ponownie',
  showHomeButton = false,
  variant = 'inline',
  error,
  actions,
}: ErrorUIProps) {
  // Wariant Alert
  if (variant === 'alert') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{message}</p>

          {/* Szczegóły w dev */}
          {process.env.NODE_ENV === 'development' && error && (
            <pre className="mt-2 overflow-x-auto rounded bg-destructive/10 p-2 text-xs">
              {error.message}
            </pre>
          )}

          {/* Akcje */}
          {(onRetry || showHomeButton || actions) && (
            <div className="flex gap-2 pt-2">
              {onRetry && (
                <Button onClick={onRetry} size="sm" variant="outline">
                  <RefreshCcw className="mr-2 h-3 w-3" />
                  {retryText}
                </Button>
              )}
              {showHomeButton && (
                <Button
                  onClick={() => (window.location.href = '/')}
                  size="sm"
                  variant="outline"
                >
                  <Home className="mr-2 h-3 w-3" />
                  Strona główna
                </Button>
              )}
              {actions}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Wariant Centered (pełna strona)
  if (variant === 'centered') {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <div className="w-full max-w-md space-y-6">
          {/* Ikona */}
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>

          {/* Treść */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          {/* Szczegóły w dev */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="mb-2 text-xs font-medium text-destructive">
                Szczegóły błędu (development):
              </p>
              <pre className="overflow-x-auto text-xs text-muted-foreground">
                {error.message}
              </pre>
            </div>
          )}

          {/* Akcje */}
          {(onRetry || showHomeButton || actions) && (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {onRetry && (
                <Button onClick={onRetry} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  {retryText}
                </Button>
              )}
              {showHomeButton && (
                <Button
                  onClick={() => (window.location.href = '/')}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Strona główna
                </Button>
              )}
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Wariant Inline (domyślny)
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <div className="flex-1 space-y-2">
          <div>
            <p className="font-medium text-destructive">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          {/* Szczegóły w dev */}
          {process.env.NODE_ENV === 'development' && error && (
            <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
              {error.message}
            </pre>
          )}

          {/* Akcje */}
          {(onRetry || showHomeButton || actions) && (
            <div className="flex flex-wrap gap-2">
              {onRetry && (
                <Button onClick={onRetry} size="sm" variant="outline">
                  <RefreshCcw className="mr-2 h-3 w-3" />
                  {retryText}
                </Button>
              )}
              {showHomeButton && (
                <Button
                  onClick={() => (window.location.href = '/')}
                  size="sm"
                  variant="outline"
                >
                  <Home className="mr-2 h-3 w-3" />
                  Strona główna
                </Button>
              )}
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Kompaktowy inline error dla tabel i list
 */
export function InlineError({
  message = 'Nie udało się załadować danych',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 rounded border border-destructive/20 bg-destructive/5 p-3">
      <AlertCircle className="h-4 w-4 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="ghost">
          <RefreshCcw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
