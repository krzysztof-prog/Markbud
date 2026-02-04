'use client';

/**
 * ReadinessStatusBadge - Kompaktowy badge statusu gotowości
 *
 * QW-2: Mały badge do wyświetlania w listach, tabelach i kalendarzach.
 * Obsługuje 4 statusy: ready, conditional, blocked, pending
 *
 * Używa danych z batch query (useBatchReadiness) zamiast własnego fetch.
 */

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ReadinessResult, AggregatedReadinessStatus } from '@/lib/api/orders';

// ============================================
// STATUS CONFIG
// ============================================

interface StatusConfig {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  textColor: string;
  label: string;
  shortLabel: string;
}

const STATUS_CONFIG: Record<AggregatedReadinessStatus, StatusConfig> = {
  ready: {
    icon: CheckCircle2,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    label: 'Gotowe do wysyłki',
    shortLabel: 'OK',
  },
  conditional: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    label: 'Warunkowe - sprawdź ostrzeżenia',
    shortLabel: 'Ost.',
  },
  blocked: {
    icon: XCircle,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    label: 'Zablokowane - sprawdź blokady',
    shortLabel: 'Blok.',
  },
  pending: {
    icon: Clock,
    iconColor: 'text-slate-400',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-500',
    label: 'Oczekuje na sprawdzenie',
    shortLabel: '...',
  },
};

// ============================================
// TYPES
// ============================================

type BadgeSize = 'xs' | 'sm' | 'md';
type BadgeVariant = 'icon' | 'badge' | 'pill';

interface ReadinessStatusBadgeProps {
  /** Dane readiness z batch query lub pojedynczego zapytania */
  readiness?: ReadinessResult | null;
  /** Rozmiar badge'a */
  size?: BadgeSize;
  /** Wariant wyświetlania */
  variant?: BadgeVariant;
  /** Czy pokazywać tooltip z szczegółami */
  showTooltip?: boolean;
  /** Czy pokazywać liczniki (np. "2 blokad") */
  showCounts?: boolean;
  /** Dodatkowa klasa CSS */
  className?: string;
}

// ============================================
// SIZE CONFIG
// ============================================

const SIZE_CONFIG: Record<BadgeSize, { icon: string; text: string; padding: string }> = {
  xs: { icon: 'h-3 w-3', text: 'text-xs', padding: 'px-1 py-0.5' },
  sm: { icon: 'h-3.5 w-3.5', text: 'text-xs', padding: 'px-1.5 py-0.5' },
  md: { icon: 'h-4 w-4', text: 'text-sm', padding: 'px-2 py-1' },
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ReadinessStatusBadge: React.FC<ReadinessStatusBadgeProps> = ({
  readiness,
  size = 'sm',
  variant = 'icon',
  showTooltip = true,
  showCounts = false,
  className,
}) => {
  // Jeśli brak danych - pokaż placeholder
  if (!readiness) {
    const config = STATUS_CONFIG.pending;
    const sizeConfig = SIZE_CONFIG[size];
    const Icon = HelpCircle;

    const content = (
      <span
        className={cn(
          'inline-flex items-center gap-1',
          variant !== 'icon' && cn(sizeConfig.padding, 'rounded-full', config.bgColor),
          className
        )}
      >
        <Icon className={cn(sizeConfig.icon, 'text-slate-300')} />
        {variant === 'pill' && (
          <span className={cn(sizeConfig.text, 'text-slate-400')}>...</span>
        )}
      </span>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Ładowanie statusu...</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  }

  const status = readiness.status;
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  // Buduj tooltip content
  const buildTooltipContent = () => {
    const lines: string[] = [config.label];

    if (showCounts) {
      if (readiness.blocking?.length > 0) {
        lines.push(`${readiness.blocking.length} blokad`);
      }
      if (readiness.warnings?.length > 0) {
        lines.push(`${readiness.warnings.length} ostrzeżeń`);
      }
    }

    // Dodaj szczegóły blokad
    if (readiness.blocking?.length > 0) {
      const blockingMessages = readiness.blocking.slice(0, 3).map((b) => `• ${b.message}`);
      if (readiness.blocking.length > 3) {
        blockingMessages.push(`... i ${readiness.blocking.length - 3} więcej`);
      }
      lines.push('', 'Blokady:', ...blockingMessages);
    }

    // Dodaj szczegóły ostrzeżeń (jeśli nie ma blokad)
    if (readiness.warnings?.length > 0 && readiness.blocking?.length === 0) {
      const warningMessages = readiness.warnings.slice(0, 3).map((w) => `• ${w.message}`);
      if (readiness.warnings.length > 3) {
        warningMessages.push(`... i ${readiness.warnings.length - 3} więcej`);
      }
      lines.push('', 'Ostrzeżenia:', ...warningMessages);
    }

    return lines.join('\n');
  };

  // Buduj label dla badge/pill
  const getLabel = () => {
    if (showCounts) {
      if (status === 'blocked' && readiness.blocking?.length > 0) {
        return `${readiness.blocking.length}`;
      }
      if (status === 'conditional' && readiness.warnings?.length > 0) {
        return `${readiness.warnings.length}`;
      }
    }
    return config.shortLabel;
  };

  // Renderuj odpowiedni wariant
  const content = (() => {
    switch (variant) {
      case 'icon':
        return (
          <span className={cn('inline-flex items-center', className)}>
            <Icon className={cn(sizeConfig.icon, config.iconColor)} />
          </span>
        );

      case 'badge':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md',
              sizeConfig.padding,
              config.bgColor,
              className
            )}
          >
            <Icon className={cn(sizeConfig.icon, config.iconColor)} />
            <span className={cn(sizeConfig.text, config.textColor, 'font-medium')}>
              {getLabel()}
            </span>
          </span>
        );

      case 'pill':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full',
              sizeConfig.padding,
              config.bgColor,
              className
            )}
          >
            <Icon className={cn(sizeConfig.icon, config.iconColor)} />
            <span className={cn(sizeConfig.text, config.textColor, 'font-medium')}>
              {getLabel()}
            </span>
          </span>
        );

      default:
        return null;
    }
  })();

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <pre className="text-xs whitespace-pre-wrap font-sans">
              {buildTooltipContent()}
            </pre>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Zwraca kolor tła dla statusu readiness
 */
export function getReadinessBackgroundColor(status: AggregatedReadinessStatus | undefined): string {
  if (!status) return 'bg-slate-100';
  return STATUS_CONFIG[status].bgColor;
}

/**
 * Zwraca kolor tekstu dla statusu readiness
 */
export function getReadinessTextColor(status: AggregatedReadinessStatus | undefined): string {
  if (!status) return 'text-slate-500';
  return STATUS_CONFIG[status].textColor;
}

/**
 * Sprawdza czy readiness jest w stanie zablokowanym
 */
export function isReadinessBlocked(readiness?: ReadinessResult | null): boolean {
  return readiness?.status === 'blocked';
}

/**
 * Sprawdza czy readiness jest gotowy (bez blokad i ostrzeżeń)
 */
export function isReadinessReady(readiness?: ReadinessResult | null): boolean {
  return readiness?.status === 'ready';
}

export default ReadinessStatusBadge;
