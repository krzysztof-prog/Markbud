'use client';

import React from 'react';
import { formatDate } from '../helpers/dateHelpers';
import { getCompletionStatusInfo } from '../helpers/completionHelpers';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/types';

interface OrderCheckboxProps {
  order: Order;
  checked: boolean;
  onChange: (orderId: number, checked: boolean) => void;
  category?: 'overdue' | 'upcoming' | 'private';
}

export const OrderCheckbox: React.FC<OrderCheckboxProps> = ({ order, checked, onChange, category }) => {
  const completionInfo = getCompletionStatusInfo(order);

  const rowClass =
    category === 'overdue'
      ? 'border-red-300 bg-red-50'
      : category === 'upcoming'
        ? 'border-orange-300 bg-orange-50'
        : '';

  const deadlineClass =
    category === 'overdue'
      ? 'text-red-600 font-medium'
      : category === 'upcoming'
        ? 'text-orange-600 font-medium'
        : 'text-gray-500';

  return (
    <div
      className={`flex items-center gap-4 px-3 py-2 border rounded hover:bg-gray-50 transition-colors ${rowClass}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(order.id, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
      />
      <span className="font-medium text-gray-900 w-24 flex-shrink-0 truncate">{order.orderNumber}</span>
      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{order.client || 'Brak klienta'}</span>
      <span className="text-sm text-gray-900 w-20 text-right flex-shrink-0">{order.totalWindows || 0} szt.</span>
      <span className={`text-sm w-28 text-right flex-shrink-0 ${deadlineClass}`}>
        {order.deadline ? formatDate(order.deadline) : '-'}
      </span>
      <Badge className={`${completionInfo.color} flex-shrink-0`} title={completionInfo.label}>
        {completionInfo.label}
      </Badge>
    </div>
  );
};

export default OrderCheckbox;
