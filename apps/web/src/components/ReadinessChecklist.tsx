'use client';

/**
 * ReadinessChecklist - System Brain UI Component
 *
 * Wyświetla inline checklist gotowości produkcji/wysyłki.
 * Zawsze widoczny - pokazuje co jest zrobione i co blokuje.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ordersApi, deliveriesApi, type ReadinessResult, type ChecklistItem as ChecklistItemType } from '@/lib/api';

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
  signal?: {
    message: string;
    actionRequired?: string;
    status: 'ok' | 'warning' | 'blocking';
  };
}

const ChecklistRow: React.FC<ChecklistRowProps> = ({ item, signal }) => {
  const getIcon = () => {
    if (item.checked) {
      return <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />;
    }
    if (item.blocking) {
      return <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />;
  };

  const getRowClass = () => {
    if (item.checked) {
      return 'text-green-700 bg-green-50';
    }
    if (item.blocking) {
      return 'text-red-700 bg-red-50';
    }
    return 'text-yellow-700 bg-yellow-50';
  };

  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 rounded-md text-sm', getRowClass())}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{item.label}</div>
        {signal && (
          <div className="text-xs opacity-80 mt-0.5">
            {signal.message}
            {signal.actionRequired && (
              <span className="block mt-0.5 font-medium">
                → {signal.actionRequired}
              </span>
            )}
          </div>
        )}
      </div>
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

  const { ready, blocking, warnings, checklist } = data;

  // Utwórz mapę sygnałów dla szybkiego dostępu
  const signalMap = new Map<string, { message: string; actionRequired?: string; status: 'ok' | 'warning' | 'blocking' }>();
  for (const signal of [...blocking, ...warnings]) {
    signalMap.set(signal.requirement, {
      message: signal.message,
      actionRequired: signal.actionRequired,
      status: signal.status,
    });
  }

  const title = type === 'production' ? 'Gotowość do produkcji' : 'Gotowość do wysyłki';

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 flex items-center justify-between',
          ready
            ? 'bg-green-100 border-b border-green-200'
            : 'bg-red-100 border-b border-red-200'
        )}
      >
        <div className="flex items-center gap-2">
          {ready ? (
            <CheckCircle2 className="h-5 w-5 text-green-700" />
          ) : (
            <XCircle className="h-5 w-5 text-red-700" />
          )}
          <span className={cn('font-semibold text-sm', ready ? 'text-green-800' : 'text-red-800')}>
            {title}
          </span>
        </div>
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            ready
              ? 'bg-green-200 text-green-800'
              : 'bg-red-200 text-red-800'
          )}
        >
          {ready ? 'GOTOWE' : `${blocking.length} BLOKAD`}
        </span>
      </div>

      {/* Checklist */}
      <div className="p-2 space-y-1 bg-white">
        {checklist.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            signal={signalMap.get(item.id.replace(/_/g, '_')) || signalMap.get(
              // Dopasuj requirement do id (np. warehouse_stock -> sufficient_stock)
              [...blocking, ...warnings].find(s => s.requirement.includes(item.id.split('_').pop() || ''))?.requirement || ''
            )}
          />
        ))}
      </div>

      {/* Warnings section */}
      {warnings.length > 0 && (
        <div className="border-t bg-yellow-50 px-4 py-2">
          <div className="text-xs text-yellow-800 font-medium">
            {warnings.length} ostrzeżeń (nie blokują)
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadinessChecklist;
