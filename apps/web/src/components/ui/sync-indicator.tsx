'use client';

import { CheckCircle, AlertCircle, RefreshCw, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type SyncStatus = 'synced' | 'pending' | 'error' | 'offline';

interface SyncIndicatorProps {
  /** Status synchronizacji */
  status: SyncStatus;
  /** Rozmiar ikony (domyślnie 'sm') */
  size?: 'xs' | 'sm' | 'md';
  /** Czy pokazać tooltip */
  showTooltip?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

const statusConfig = {
  synced: {
    icon: CheckCircle,
    className: 'text-green-500',
    tooltip: 'Zsynchronizowano',
    animate: false,
  },
  pending: {
    icon: RefreshCw,
    className: 'text-yellow-500',
    tooltip: 'Synchronizowanie...',
    animate: true,
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-500',
    tooltip: 'Błąd synchronizacji',
    animate: false,
  },
  offline: {
    icon: CloudOff,
    className: 'text-slate-400',
    tooltip: 'Offline - zmiany zostaną zapisane po połączeniu',
    animate: false,
  },
};

/**
 * Mała ikonka pokazująca status synchronizacji elementu.
 * Używaj przy elementach z optimistic updates.
 *
 * @example
 * <div className="flex items-center gap-2">
 *   <span>Zlecenie #123</span>
 *   <SyncIndicator status={item._optimistic ? 'pending' : 'synced'} />
 * </div>
 */
export function SyncIndicator({
  status,
  size = 'sm',
  showTooltip = true,
  className,
}: SyncIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const indicator = (
    <Icon
      className={cn(
        sizeClasses[size],
        config.className,
        config.animate && 'animate-spin',
        className
      )}
      aria-hidden={showTooltip}
      aria-label={!showTooltip ? config.tooltip : undefined}
    />
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{indicator}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Helper do określenia statusu na podstawie stanu mutacji
 */
export function getSyncStatus(options: {
  isPending?: boolean;
  isError?: boolean;
  isOffline?: boolean;
}): SyncStatus {
  if (options.isOffline) return 'offline';
  if (options.isError) return 'error';
  if (options.isPending) return 'pending';
  return 'synced';
}
