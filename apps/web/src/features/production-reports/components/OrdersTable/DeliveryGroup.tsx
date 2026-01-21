'use client';

import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Truck } from 'lucide-react';

interface DeliveryGroupProps {
  deliveryName: string;
  ordersCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const DeliveryGroup: React.FC<DeliveryGroupProps> = ({
  deliveryName,
  ordersCount,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <>
      {/* Nagłówek grupy dostaw */}
      <TableRow
        className="bg-blue-50 hover:bg-blue-100 cursor-pointer"
        onClick={onToggle}
      >
        <TableCell colSpan={15} className="py-2">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Truck className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">{deliveryName}</span>
            <span className="text-sm text-blue-600">({ordersCount} zleceń)</span>
          </div>
        </TableCell>
      </TableRow>

      {/* Zlecenia w grupie - pokazane tylko gdy rozwinięte */}
      {isExpanded && children}
    </>
  );
};

export default DeliveryGroup;
