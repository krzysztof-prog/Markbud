'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  /** Czy pokazać overlay */
  isLoading: boolean;
  /** Opcjonalna wiadomość do wyświetlenia */
  message?: string;
  /** Zawartość pod overlay */
  children: React.ReactNode;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** Czy overlay ma być przeźroczysty (domyślnie tak) */
  transparent?: boolean;
}

/**
 * Komponent wyświetlający overlay z loaderem podczas ładowania.
 * Używaj do wrappowania sekcji które mogą być w stanie ładowania.
 *
 * @example
 * <LoadingOverlay isLoading={isMutating} message="Zapisywanie...">
 *   <Card>...</Card>
 * </LoadingOverlay>
 */
export function LoadingOverlay({
  isLoading,
  message,
  children,
  className,
  transparent = true,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center z-10 rounded-[inherit]',
            transparent ? 'bg-white/80' : 'bg-white'
          )}
          role="status"
          aria-live="polite"
          aria-label={message || 'Ładowanie...'}
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            {message && (
              <span className="text-sm text-slate-600 font-medium">
                {message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mniejsza wersja loadera do użycia inline (np. w przyciskach)
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn('h-4 w-4 animate-spin', className)}
      aria-hidden="true"
    />
  );
}
