'use client';

/**
 * Globalny error handler dla Next.js App Router
 * Przechwytuje błędy na poziomie aplikacji
 */

import { useEffect } from 'react';
import { AlertCircle, Home, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logComponentError } from '@/lib/error-logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Loguj błąd
    logComponentError(error, 'Global Error Boundary', error.stack, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Ikona błędu */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <AlertCircle className="h-16 w-16 text-destructive" />
          </div>
        </div>

        {/* Tytuł */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Coś poszło nie tak
          </h1>
          <p className="text-muted-foreground">
            Przepraszamy, wystąpił nieoczekiwany błąd w aplikacji.
          </p>
        </div>

        {/* Szczegóły błędu (tylko w development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="space-y-2 text-left">
              <p className="text-sm font-medium text-destructive">
                Szczegóły błędu (development):
              </p>
              <pre className="overflow-x-auto text-xs text-muted-foreground">
                <code>{error.message}</code>
              </pre>
              {error.digest && (
                <p className="text-xs text-muted-foreground">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Akcje */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            size="lg"
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Spróbuj ponownie
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Wróć do strony głównej
          </Button>
        </div>

        {/* Informacja o pomocy */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            Jeśli problem się powtarza, skontaktuj się z administratorem systemu.
          </p>
        </div>
      </div>
    </div>
  );
}
