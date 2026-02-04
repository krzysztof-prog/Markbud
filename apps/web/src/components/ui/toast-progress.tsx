/**
 * Komponent paska postępu dla toastów
 *
 * Może być użyty samodzielnie lub jako część ToastDescription
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ================================
// ToastProgress
// ================================

interface ToastProgressProps {
  /** Wartość postępu 0-100 */
  progress: number;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** Wariant kolorystyczny */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  /** Pokaż etykietę z procentami */
  showLabel?: boolean;
  /** Rozmiar paska */
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  destructive: 'bg-red-500',
};

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

/**
 * Pasek postępu do użycia w toastach
 *
 * @example
 * <ToastProgress progress={50} />
 *
 * @example
 * <ToastProgress progress={75} variant="success" showLabel />
 */
export function ToastProgress({
  progress,
  className,
  variant = 'default',
  showLabel = false,
  size = 'md',
}: ToastProgressProps) {
  // Clamp progress do 0-100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Postęp</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full overflow-hidden bg-slate-200',
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            variantStyles[variant]
          )}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ================================
// ToastCountdown
// ================================

interface ToastCountdownProps {
  /** Całkowity czas w ms */
  duration: number;
  /** Callback gdy odliczanie się skończy */
  onComplete?: () => void;
  /** Czy odliczanie jest aktywne */
  isActive?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Pasek odliczający czas (dla undo toastów)
 *
 * @example
 * <ToastCountdown duration={5000} onComplete={handleExpire} />
 */
export function ToastCountdown({
  duration,
  onComplete,
  isActive = true,
  className,
}: ToastCountdownProps) {
  const [progress, setProgress] = React.useState(100);
  const startTimeRef = React.useRef<number | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!isActive) {
      setProgress(100);
      return;
    }

    startTimeRef.current = Date.now();

    const animate = () => {
      if (!startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);

      setProgress(remaining);

      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [duration, isActive, onComplete]);

  return (
    <ToastProgress
      progress={progress}
      variant="warning"
      size="sm"
      className={className}
    />
  );
}

// ================================
// ToastWithProgress (helper component)
// ================================

interface ToastWithProgressProps {
  /** Tekst opisu */
  description?: string;
  /** Wartość postępu 0-100 */
  progress: number;
  /** Wariant kolorystyczny */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

/**
 * Helper component łączący opis z paskiem postępu
 * Do użycia jako description w toast()
 *
 * @example
 * toast({
 *   title: 'Importowanie...',
 *   description: <ToastWithProgress description="50/100" progress={50} />,
 * });
 */
export function ToastWithProgress({
  description,
  progress,
  variant = 'default',
}: ToastWithProgressProps) {
  return (
    <div className="space-y-2">
      {description && <span className="text-sm">{description}</span>}
      <ToastProgress progress={progress} variant={variant} size="sm" />
    </div>
  );
}

export default ToastProgress;
