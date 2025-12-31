'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { OrderCheckbox } from './OrderCheckbox';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
 */
export const DeliveryCheckbox: React.FC<DeliveryCheckboxProps> = ({
  delivery,
  checked,
  onChange,
  onOrderToggle,
  selectedOrderIds = new Set(),
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('pl-PL');
  };

  const ordersCount = delivery.deliveryOrders?.length || 0;
  const totalWindows =
    delivery.deliveryOrders?.reduce((sum, dOrder) => sum + (dOrder.order?.totalWindows || 0), 0) ||
    0;

  const statusColors: Record<string, string> = {
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels: Record<string, string> = {
    planned: 'Planowana',
    in_progress: 'W trakcie',
    completed: 'Zakończona',
  };

  const statusColor = statusColors[delivery.status || 'planned'] || 'bg-gray-100 text-gray-800';
  const statusLabel = statusLabels[delivery.status || 'planned'] || delivery.status;

  return (
    <div className="border rounded overflow-hidden">
      {/* Header - Checkbox całej dostawy */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 transition-colors">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation();
            onChange(delivery.id, e.target.checked);
          }}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <div
          className="flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="font-medium text-gray-900">
            {formatDate(delivery.deliveryDate)} • {delivery.deliveryNumber || 'Bez numeru'}
          </div>
          <div className="text-sm text-gray-600">
            {ordersCount} {ordersCount === 1 ? 'zlecenie' : 'zleceń'} • {totalWindows} okien
          </div>
        </div>
        <Badge className={statusColor}>{statusLabel}</Badge>
        {onOrderToggle && delivery.deliveryOrders && delivery.deliveryOrders.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-blue-200 rounded transition-colors"
            aria-label={isExpanded ? 'Zwiń' : 'Rozwiń'}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-600" />
            )}
          </button>
        )}
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
