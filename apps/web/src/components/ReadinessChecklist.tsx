'use client';

/**
 * ReadinessChecklist - System Brain UI Component
 *
 * Wyświetla inline checklist gotowości produkcji/wysyłki.
 * Zawsze widoczny - pokazuje co jest zrobione i co blokuje.
 *
 * Używa nowego DeliveryReadinessAggregator z backendu.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ordersApi, deliveriesApi, type ReadinessResult, type ChecklistItem as ChecklistItemType } from '@/lib/api';

// ============================================
// ACTION MAPPING - Mapowanie modułów na akcje
// ============================================

interface ActionConfig {
  label: string;
  href: string | ((entityId: number, type: 'production' | 'shipping') => string);
}

// Mapowanie nazw modułów na akcje "napraw"
const MODULE_ACTIONS: Record<string, ActionConfig> = {
  mail_completeness: {
    label: 'Logistyka',
    href: '/logistyka',
  },
  pallet_validation: {
    label: 'Palety',
    href: (entityId, type) => type === 'shipping' ? `/dostawy?dostawa=${entityId}&tab=palety` : '/dostawy',
  },
  delivery_date_mismatch: {
    label: 'Dostawa',
    href: (entityId, type) => type === 'shipping' ? `/dostawy?dostawa=${entityId}` : '/dostawy',
  },
  missing_delivery_date: {
    label: 'Ustaw datę',
    href: (entityId, type) => type === 'shipping' ? `/dostawy?dostawa=${entityId}` : '/dostawy',
  },
  // Moduły produkcyjne
  schuco_orders: {
    label: 'Schuco',
    href: '/schuco',
  },
  profile_requirements: {
    label: 'Magazyn',
    href: '/magazyn/akrobud',
  },
};

// ============================================
// TYPES
// ============================================

interface ReadinessChecklistProps {
  /** 'production' dla zlecenia, 'shipping' dla dostawy */
  type: 'production' | 'shipping';
  /** ID zlecenia (dla production) lub dostawy (dla shipping) */
  entityId: number;
  /** Dodatkowa klasa CSS */
  className?: string;
}

// ============================================
// SUBCOMPONENTS
// ============================================

interface ChecklistRowProps {
  item: ChecklistItemType;
  entityId: number;
  type: 'production' | 'shipping';
}

const ChecklistRow: React.FC<ChecklistRowProps> = ({ item, entityId, type }) => {
  const getIcon = () => {
    if (item.status === 'ok') {
      return <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />;
    }
    if (item.status === 'blocking') {
      return <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />;
  };

  const getRowClass = () => {
    if (item.status === 'ok') {
      return 'text-green-700 bg-green-50';
    }
    if (item.status === 'blocking') {
      return 'text-red-700 bg-red-50';
    }
    return 'text-yellow-700 bg-yellow-50';
  };

  // Sprawdź czy moduł ma zdefiniowaną akcję
  const action = MODULE_ACTIONS[item.module];
  const actionHref = action
    ? typeof action.href === 'function'
      ? action.href(entityId, type)
      : action.href
    : null;

  // Pokaż przycisk akcji tylko dla blocking/warning
  const showAction = item.status !== 'ok' && actionHref;

  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 rounded-md text-sm', getRowClass())}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{item.label}</div>
        {item.message && (
          <div className="text-xs opacity-80 mt-0.5">
            {item.message}
          </div>
        )}
      </div>
      {showAction && action && (
        <Link href={actionHref}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 text-xs flex-shrink-0',
              item.status === 'blocking'
                ? 'text-red-700 hover:text-red-800 hover:bg-red-100'
                : 'text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100'
            )}
          >
            {action.label}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ReadinessChecklist: React.FC<ReadinessChecklistProps> = ({
  type,
  entityId,
  className,
}) => {
  const { data, isLoading, error } = useQuery<ReadinessResult>({
    queryKey: [type === 'production' ? 'order-readiness' : 'delivery-readiness', entityId],
    queryFn: () =>
      type === 'production'
        ? ordersApi.getReadiness(entityId)
        : deliveriesApi.getReadiness(entityId),
    staleTime: 30000, // 30 sekund cache
    refetchInterval: 60000, // odświeżaj co minutę
  });

  if (isLoading) {
    return (
      <div className={cn('p-4 border rounded-lg bg-slate-50', className)}>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Sprawdzanie gotowości...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 border border-red-200 rounded-lg bg-red-50', className)}>
        <div className="flex items-center gap-2 text-sm text-red-700">
          <XCircle className="h-4 w-4" />
          <span>Błąd podczas sprawdzania gotowości</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { status, checklist } = data;

  // Określ czy gotowe na podstawie nowego statusu
  const isReady = status === 'ready';
  const isConditional = status === 'conditional';
  const isBlocked = status === 'blocked';

  const title = 'Gotowość do produkcji';

  // Określ kolory nagłówka
  const getHeaderClass = () => {
    if (isReady) return 'bg-green-100 border-b border-green-200';
    if (isConditional) return 'bg-yellow-100 border-b border-yellow-200';
    return 'bg-red-100 border-b border-red-200';
  };

  const getHeaderTextClass = () => {
    if (isReady) return 'text-green-800';
    if (isConditional) return 'text-yellow-800';
    return 'text-red-800';
  };

  const getStatusBadgeClass = () => {
    if (isReady) return 'bg-green-200 text-green-800';
    if (isConditional) return 'bg-yellow-200 text-yellow-800';
    return 'bg-red-200 text-red-800';
  };

  const getStatusIcon = () => {
    if (isReady) return <CheckCircle2 className="h-5 w-5 text-green-700" />;
    if (isConditional) return <AlertTriangle className="h-5 w-5 text-yellow-700" />;
    return <XCircle className="h-5 w-5 text-red-700" />;
  };

  const getStatusLabel = () => {
    if (isReady) return 'GOTOWE';
    const blockingCount = checklist.filter(c => c.status === 'blocking').length;
    const warningCount = checklist.filter(c => c.status === 'warning').length;
    if (isBlocked) return `${blockingCount} BLOKAD`;
    return `${warningCount} OSTRZEŻEŃ`;
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className={cn('px-4 py-3 flex items-center justify-between', getHeaderClass())}>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={cn('font-semibold text-sm', getHeaderTextClass())}>
            {title}
          </span>
        </div>
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusBadgeClass())}>
          {getStatusLabel()}
        </span>
      </div>

      {/* Checklist */}
      <div className="p-2 space-y-1 bg-white">
        {checklist.map((item, index) => (
          <ChecklistRow key={`${item.module}-${index}`} item={item} entityId={entityId} type={type} />
        ))}
      </div>

    </div>
  );
};

export default ReadinessChecklist;
