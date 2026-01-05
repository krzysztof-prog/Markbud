'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { OrderCheckbox } from './OrderCheckbox';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatDate } from '../helpers/dateHelpers';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  DEFAULT_STATUS_COLOR,
  COMPLETION_STATUS,
  type CompletionStatus,
} from '../helpers/constants';
import { getOrderCompletionStatus } from '../helpers/completionHelpers';
import type { Delivery } from '@/types';

interface DeliveryCheckboxProps {
  delivery: Delivery;
  checked: boolean;
  onChange: (deliveryId: number, checked: boolean) => void;
  onOrderToggle?: (orderId: number, checked: boolean) => void;
  selectedOrderIds?: Set<number>;
}

/**
 * Komponent checkbox dla dostawy AKROBUD
 * Wyświetla: data dostawy, numer, liczba zleceń, liczba okien, status
 * Opcjonalnie: rozwijalna lista zleceń z checkboxami (domyślnie zwinięte)
 *
 * Obsługuje 3 stany checkboxa:
 * - Checked (wszystkie zlecenia zaznaczone)
 * - Unchecked (żadne zlecenie nie zaznaczone)
 * - Indeterminate (część zleceń zaznaczona)
 */
export const DeliveryCheckbox: React.FC<DeliveryCheckboxProps> = ({
  delivery,
  checked,
  onChange,
  onOrderToggle,
  selectedOrderIds = new Set(),
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const ordersCount = delivery.deliveryOrders?.length || 0;
  const totalWindows = useMemo(
    () =>
      delivery.deliveryOrders?.reduce(
        (sum, dOrder) => sum + (dOrder.order?.totalWindows || 0),
        0
      ) || 0,
    [delivery.deliveryOrders]
  );

  // Agreguj statusy kompletacji zleceń w dostawie
  const completionStatusCounts = useMemo(() => {
    const counts: Record<CompletionStatus, number> = {
      [COMPLETION_STATUS.INCOMPLETE]: 0,
      [COMPLETION_STATUS.READY]: 0,
      [COMPLETION_STATUS.IN_PRODUCTION]: 0,
      [COMPLETION_STATUS.COMPLETED]: 0,
    };

    delivery.deliveryOrders?.forEach((dOrder) => {
      if (dOrder.order) {
        const status = getOrderCompletionStatus(dOrder.order as any);
        counts[status]++;
      }
    });

    return counts;
  }, [delivery.deliveryOrders]);

  // Stwórz czytelny tekst z podsumowaniem statusów
  const completionSummary = useMemo(() => {
    const parts: string[] = [];
    if (completionStatusCounts[COMPLETION_STATUS.COMPLETED] > 0) {
      parts.push(`${completionStatusCounts[COMPLETION_STATUS.COMPLETED]} wyprodukowanych`);
    }
    if (completionStatusCounts[COMPLETION_STATUS.IN_PRODUCTION] > 0) {
      parts.push(`${completionStatusCounts[COMPLETION_STATUS.IN_PRODUCTION]} w produkcji`);
    }
    if (completionStatusCounts[COMPLETION_STATUS.READY] > 0) {
      parts.push(`${completionStatusCounts[COMPLETION_STATUS.READY]} gotowych`);
    }
    if (completionStatusCounts[COMPLETION_STATUS.INCOMPLETE] > 0) {
      parts.push(`${completionStatusCounts[COMPLETION_STATUS.INCOMPLETE]} w kompletacji`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Brak zleceń';
  }, [completionStatusCounts]);

  // Calculate checkbox state (checked, indeterminate, unchecked)
  const checkboxState = useMemo(() => {
    if (!delivery.deliveryOrders || delivery.deliveryOrders.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const orderIds = delivery.deliveryOrders.map((dOrder) => dOrder.order.id);
    const selectedCount = orderIds.filter((id) => selectedOrderIds.has(id)).length;

    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === orderIds.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [delivery.deliveryOrders, selectedOrderIds]);

  // Update checkbox indeterminate state
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = checkboxState.indeterminate;
    }
  }, [checkboxState.indeterminate]);

  const statusColor = STATUS_COLORS[delivery.status || 'planned'] || DEFAULT_STATUS_COLOR;
  const statusLabel = STATUS_LABELS[delivery.status || 'planned'] || delivery.status;

  return (
    <div className="border rounded overflow-hidden">
      {/* Header - Checkbox całej dostawy */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 transition-colors">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={checkboxState.checked}
          onChange={(e) => {
            e.stopPropagation();
            onChange(delivery.id, e.target.checked);
          }}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          aria-label={`Zaznacz dostawę ${delivery.deliveryNumber || delivery.id}`}
        />

        {/* Klikalna ikona rozwinięcia/zwinięcia (tylko jeśli są zlecenia) */}
        {onOrderToggle && delivery.deliveryOrders && delivery.deliveryOrders.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-blue-200 rounded transition-colors flex-shrink-0"
            aria-label={isExpanded ? 'Zwiń zlecenia' : 'Rozwiń zlecenia'}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-600" />
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">
            {formatDate(delivery.deliveryDate)} • {delivery.deliveryNumber || 'Bez numeru'}
          </div>
          <div className="text-sm text-gray-600">
            {ordersCount} {ordersCount === 1 ? 'zlecenie' : 'zleceń'} • {totalWindows} okien
          </div>
          <div className="text-xs text-gray-500 mt-1" title={completionSummary}>
            {completionSummary}
          </div>
        </div>
        <Badge className={statusColor}>{statusLabel}</Badge>
      </div>

      {/* Lista zleceń w dostawie (opcjonalna, rozwijalna) */}
      {isExpanded && onOrderToggle && delivery.deliveryOrders && delivery.deliveryOrders.length > 0 && (
        <div className="p-2 space-y-1 bg-gray-50">
          {delivery.deliveryOrders.map((dOrder) => (
            <OrderCheckbox
              key={dOrder.order.id}
              order={dOrder.order as any}
              checked={selectedOrderIds.has(dOrder.order.id)}
              onChange={onOrderToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryCheckbox;
