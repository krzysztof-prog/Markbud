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
  onGlassDiscrepancyClick?: (orderNumber: string) => void;
  onGlassDeliveryDateSet?: (orderId: number, date: string) => void;

  // Manual status callback
  onManualStatusChange?: (orderId: number, manualStatus: 'do_not_cut' | 'cancelled' | 'on_hold' | null) => void;

  // Delete order (tylko dla admin/kierownik)
  canDeleteOrders?: boolean;
  onDeleteOrder?: (orderId: number, orderNumber: string) => void;

  // Grouping
  getGroupLabel: (key: string) => string;

  // Missing order numbers
  missingOrderNumbers?: string[];
  showOnlyMissing?: boolean;
  hideMissing?: boolean;

  // Zachowaj oryginalną kolejność (nie sortuj po numerze zlecenia)
  preserveOrder?: boolean;
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
  onGlassDiscrepancyClick,
  onGlassDeliveryDateSet,
  onManualStatusChange,
  canDeleteOrders,
  onDeleteOrder,
  getGroupLabel,
  missingOrderNumbers = [],
  showOnlyMissing = false,
  hideMissing = false,
  preserveOrder = false,
}) => {
  // Jeśli tryb "tylko brakujące" - renderuj tylko brakujące numery
  if (showOnlyMissing) {
    // Posortuj brakujące numery malejąco (najwyższy na górze)
    const sortedMissing = [...missingOrderNumbers].sort((a, b) => parseInt(b) - parseInt(a));

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Brakujące numery zleceń
            <span className="ml-2 text-sm font-normal text-orange-600">
              ({missingOrderNumbers.length} {missingOrderNumbers.length === 1 ? 'brakujący numer' : 'brakujących numerów'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missingOrderNumbers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak luk w numeracji zleceń
            </div>
          ) : (
            <div className="rounded border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <OrderTableHeader visibleColumns={visibleColumns} />
                </thead>
                <tbody>
                  {sortedMissing.map((orderNumber) => (
                    <tr
                      key={orderNumber}
                      className="bg-slate-100 text-slate-400 italic"
                    >
                      {visibleColumns.map((column) => (
                        <td
                          key={column.id}
                          className={`px-4 py-3 whitespace-nowrap border-b ${
                            column.align === 'center' ? 'text-center' :
                            column.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {column.id === 'orderNumber' ? orderNumber : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Normalny tryb - połącz zlecenia z brakującymi numerami i posortuj
  // Parsuj numery zleceń do liczb dla sortowania
  const parseNum = (num: string | undefined | null): number => {
    if (!num) return 0;
    const match = num.replace(/\D/g, '');
    return match ? parseInt(match, 10) : 0;
  };

  // Utwórz połączoną listę: zlecenia + brakujące numery
  type TableItem = { type: 'order'; data: ExtendedOrder } | { type: 'missing'; orderNumber: string };

  const combinedItems: TableItem[] = React.useMemo(() => {
    const items: TableItem[] = orders.map(order => ({ type: 'order' as const, data: order }));

    // Dodaj brakujące numery tylko jeśli nie są ukryte i mieszczą się w zakresie wyświetlanych zleceń
    if (!hideMissing && !preserveOrder && missingOrderNumbers.length > 0 && orders.length > 0) {
      const orderNumbers = orders.map(o => parseNum(o.orderNumber));
      const minOrder = Math.min(...orderNumbers);
      const maxOrder = Math.max(...orderNumbers);

      missingOrderNumbers.forEach(num => {
        const numParsed = parseInt(num, 10);
        // Dodaj tylko brakujące numery które są w zakresie wyświetlanych
        if (numParsed >= minOrder && numParsed <= maxOrder) {
          items.push({ type: 'missing', orderNumber: num });
        }
      });
    }

    // Sortuj malejąco po numerze (pomiń jeśli preserveOrder=true - zachowaj oryginalną kolejność)
    if (!preserveOrder) {
      items.sort((a, b) => {
        const numA = a.type === 'order' ? parseNum(a.data.orderNumber) : parseInt(a.orderNumber, 10);
        const numB = b.type === 'order' ? parseNum(b.data.orderNumber) : parseInt(b.orderNumber, 10);
        return numB - numA; // malejąco
      });
    }

    return items;
  }, [orders, missingOrderNumbers, hideMissing, preserveOrder]);

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
              {combinedItems.map((item, index) => {
                if (item.type === 'missing') {
                  // Wiersz dla brakującego numeru
                  return (
                    <tr
                      key={`missing-${item.orderNumber}`}
                      className="bg-slate-100 text-slate-400 italic"
                    >
                      {visibleColumns.map((column) => (
                        <td
                          key={column.id}
                          className={`px-4 py-3 whitespace-nowrap border-b ${
                            column.align === 'center' ? 'text-center' :
                            column.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {column.id === 'orderNumber' ? item.orderNumber : '-'}
                        </td>
                      ))}
                    </tr>
                  );
                }

                // Normalny wiersz zlecenia
                return (
                  <OrderTableRow
                    key={item.data.id}
                    order={item.data}
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
                    onGlassDiscrepancyClick={onGlassDiscrepancyClick}
                    onGlassDeliveryDateSet={onGlassDeliveryDateSet}
                    onManualStatusChange={onManualStatusChange}
                    canDeleteOrders={canDeleteOrders}
                    onDeleteOrder={onDeleteOrder}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersTable;
