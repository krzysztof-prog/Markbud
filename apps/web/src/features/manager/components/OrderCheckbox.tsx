'use client';

import React from 'react';
import { formatDate, isOverdue as checkIsOverdue } from '../helpers/dateHelpers';
import { getCompletionStatusInfo } from '../helpers/completionHelpers';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/types';

interface OrderCheckboxProps {
  order: Order;
  checked: boolean;
  onChange: (orderId: number, checked: boolean) => void;
}

/**
 * Komponent checkbox dla pojedynczego zlecenia
 * Wyświetla: numer zlecenia, klient, system, termin, liczba okien, status kompletacji
 */
export const OrderCheckbox: React.FC<OrderCheckboxProps> = ({ order, checked, onChange }) => {
  const isOverdue = checkIsOverdue(order.deadline);
  const completionInfo = getCompletionStatusInfo(order);

  return (
    <div
      className={`flex items-center gap-3 p-3 border rounded hover:bg-gray-50 transition-colors ${
        isOverdue ? 'border-red-300 bg-red-50' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(order.id, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{order.orderNumber}</div>
        <div className="text-sm text-gray-600 truncate">
          {order.client || 'Brak klienta'} • {order.system || 'Brak systemu'}
        </div>
        {order.deadline && (
          <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            Termin: {formatDate(order.deadline)}
            {isOverdue && ' (przeterminowane)'}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{order.totalWindows || 0} okien</div>
        </div>
        <Badge className={completionInfo.color} title={completionInfo.label}>
          {completionInfo.label}
        </Badge>
      </div>
    </div>
  );
};

export default OrderCheckbox;
