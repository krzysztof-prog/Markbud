'use client';

/**
 * Komponent tabeli zleceń z inline editing
 * Refaktoryzowany - główny komponent orkiestrujący
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SchucoDeliveryLink } from '@/types';
import type { ExtendedOrder, Column, GroupBy, ColumnId } from '../types';
import type { EditingCell } from '../hooks/useOrderEdit';
import { OrderTableHeader } from './OrderTableHeader';
import { OrderTableFilters } from './OrderTableFilters';
import { OrderTableRow } from './OrderTableRow';

// ================================
// Props
// ================================

interface OrdersTableProps {
  groupKey: string;
  orders: ExtendedOrder[];
  visibleColumns: Column[];
  groupBy: GroupBy;
  searchQuery: string;
  filteredOrdersCount: number;
  columnFilters: Record<ColumnId, string>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<ColumnId, string>>>;
  eurRate: number;

  // Editing
  editingCell: EditingCell | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEdit: (orderId: number, field: 'valuePln' | 'valueEur' | 'deadline', currentValue: string) => void;
  cancelEdit: () => void;
  saveEdit: () => void;

  // Modal callbacks
  onOrderClick: (id: number, orderNumber: string) => void;
  onSchucoStatusClick: (orderNumber: string, schucoLinks: SchucoDeliveryLink[]) => void;

  // Grouping
  getGroupLabel: (key: string) => string;
}

// ================================
// Główny komponent
// ================================

export const OrdersTable: React.FC<OrdersTableProps> = ({
  groupKey,
  orders,
  visibleColumns,
  groupBy,
  searchQuery,
  filteredOrdersCount,
  columnFilters,
  setColumnFilters,
  eurRate,
  editingCell,
  editValue,
  setEditValue,
  startEdit,
  cancelEdit,
  saveEdit,
  onOrderClick,
  onSchucoStatusClick,
  getGroupLabel,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {groupBy !== 'none' ? getGroupLabel(groupKey) : 'Wszystkie zlecenia'}
          {groupBy !== 'none' && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({orders.length} {orders.length === 1 ? 'zlecenie' : orders.length < 5 ? 'zlecenia' : 'zleceń'})
            </span>
          )}
          {searchQuery && groupBy === 'none' && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredOrdersCount} wyników)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <OrderTableHeader visibleColumns={visibleColumns} />
              <OrderTableFilters
                visibleColumns={visibleColumns}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
              />
            </thead>
            <tbody>
              {orders.map((order: ExtendedOrder, index: number) => (
                <OrderTableRow
                  key={order.id}
                  order={order}
                  visibleColumns={visibleColumns}
                  index={index}
                  eurRate={eurRate}
                  editingCell={editingCell}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  startEdit={startEdit}
                  cancelEdit={cancelEdit}
                  saveEdit={saveEdit}
                  onOrderClick={onOrderClick}
                  onSchucoStatusClick={onSchucoStatusClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersTable;
