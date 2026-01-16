'use client';

/**
 * Komponent wiersza tabeli zleceń
 * Odpowiada za renderowanie pojedynczego wiersza z wszystkimi komórkami
 */

import React, { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check, X, Pencil } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { formatGrosze, formatCenty, centyToEur, type Grosze, type Centy } from '@/lib/money';
import type { SchucoDeliveryLink } from '@/types';
import type { ExtendedOrder, Column, ColumnId } from '../types';
import type { EditingCell } from '../hooks/useOrderEdit';
import {
  aggregateSchucoStatus,
  getEarliestSchucoDelivery,
  formatDeliveryWeek,
  formatDateShort,
  getAkrobudDeliveryDate,
  formatClientName,
  getSchucoStatusColor,
} from '../helpers/orderHelpers';

// ================================
// Props
// ================================

interface OrderTableRowProps {
  order: ExtendedOrder;
  visibleColumns: Column[];
  index: number;
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
}

// ================================
// Funkcja pomocnicza
// ================================

/**
 * Pobiera wartość dla standardowych kolumn
 */
const getCellValue = (order: ExtendedOrder, columnId: ColumnId): string => {
  switch (columnId) {
    case 'system':
      return order.system || '';
    case 'documentAuthor':
      return order.documentAuthor || '';
    case 'productionDate':
      return order.productionDate ? formatDate(order.productionDate) : '';
    default:
      return '';
  }
};

// ================================
// Komponent
// ================================

export const OrderTableRow = React.memo<OrderTableRowProps>(({
  order,
  visibleColumns,
  index,
  eurRate,
  editingCell,
  editValue,
  setEditValue,
  startEdit,
  cancelEdit,
  saveEdit,
  onOrderClick,
  onSchucoStatusClick,
}) => {
  const isEditing = editingCell?.orderId === order.id;

  // Funkcja renderująca pojedynczą komórkę
  const renderCell = useCallback(
    (column: Column) => {
      const align = column.align || 'left';
      const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

      switch (column.id) {
        case 'orderNumber':
          return (
            <td key={column.id} className={`px-4 py-3 font-mono font-medium ${alignClass}`}>
              <button
                onClick={() => onOrderClick(order.id, order.orderNumber)}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {order.orderNumber}
              </button>
            </td>
          );

        case 'pvcDelivery': {
          const schucoDeliveryWeek = getEarliestSchucoDelivery(order.schucoLinks);
          const hasSchucoLinks = order.schucoLinks && order.schucoLinks.length > 0;
          const schucoCount = order.schucoLinks?.length || 0;

          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              {hasSchucoLinks ? (
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm font-medium text-slate-700">
                    {formatDeliveryWeek(schucoDeliveryWeek)}
                  </span>
                  {schucoCount > 1 && (
                    <span className="text-xs text-slate-400">
                      ({schucoCount} zamówień)
                    </span>
                  )}
                </div>
              ) : order.deliveryDate ? (
                <span className="text-sm font-medium text-green-700">
                  {formatDate(order.deliveryDate)}
                </span>
              ) : order.pvcDeliveryDate ? (
                <span className="text-muted-foreground">{formatDate(order.pvcDeliveryDate)}</span>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </td>
          );
        }

        case 'glassDeliveryDate': {
          const ordered = order.orderedGlassCount ?? 0;
          const delivered = order.deliveredGlassCount ?? 0;

          let content: string;
          let colorClass: string;
          let tooltipDate: string | null = null;

          if (ordered === 0) {
            content = '-';
            colorClass = 'text-slate-400';
          } else if (delivered >= ordered) {
            content = 'Dostarczono';
            colorClass = 'bg-green-100 text-green-700';
            if (order.glassDeliveryDate) {
              const formattedDate = formatDate(order.glassDeliveryDate);
              if (formattedDate) {
                tooltipDate = formattedDate;
              }
            }
          } else if (delivered > 0) {
            content = `Częściowo: ${delivered}/${ordered}`;
            colorClass = 'bg-yellow-100 text-yellow-700';
          } else if (order.glassDeliveryDate) {
            const deliveryDate = new Date(order.glassDeliveryDate);
            const isOverdue = deliveryDate < new Date() && delivered === 0;
            content = formatDateShort(order.glassDeliveryDate);
            colorClass = isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700';
          } else {
            content = 'Brak daty';
            colorClass = 'bg-slate-100 text-slate-600';
          }

          if (tooltipDate) {
            return (
              <td key={column.id} className="px-4 py-3 text-center">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-help ${colorClass}`}>
                        {content}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Data dostawy: {tooltipDate}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </td>
            );
          }

          return (
            <td key={column.id} className="px-4 py-3 text-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                {content}
              </span>
            </td>
          );
        }

        case 'deadline': {
          const akrobudDeliveryDate = getAkrobudDeliveryDate(order.deliveryOrders);
          const hasAkrobudDelivery = akrobudDeliveryDate !== null;
          const deliveryCount = order.deliveryOrders?.length || 0;

          // Jeśli zlecenie jest przypisane do dostawy - pokaż datę dostawy (bez możliwości edycji)
          if (hasAkrobudDelivery) {
            return (
              <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm font-medium text-blue-700">
                    {formatDateShort(akrobudDeliveryDate)}
                  </span>
                  {deliveryCount > 1 && (
                    <span className="text-xs text-slate-400">
                      ({deliveryCount} dostaw)
                    </span>
                  )}
                </div>
              </td>
            );
          }

          // Edytowalne pole - Termin realizacji
          if (isEditing && editingCell?.field === 'deadline') {
            return (
              <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <button
                    onClick={saveEdit}
                    className="p-1 hover:bg-green-100 rounded text-green-600"
                    title="Zapisz"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                    title="Anuluj"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </td>
            );
          }
          return (
            <td
              key={column.id}
              className={`px-4 py-3 text-muted-foreground ${alignClass} group cursor-pointer hover:bg-slate-50`}
              onClick={() => startEdit(order.id, 'deadline', order.deadline || '')}
            >
              <div className="flex items-center gap-2 justify-between">
                <span>{order.deadline ? formatDate(order.deadline) : '-'}</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
              </div>
            </td>
          );
        }

        case 'valuePln': {
          if (isEditing && editingCell?.field === 'valuePln') {
            return (
              <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="0.00"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <button
                    onClick={saveEdit}
                    className="p-1 hover:bg-green-100 rounded text-green-600"
                    title="Zapisz"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                    title="Anuluj"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </td>
            );
          }
          // Wartości są przechowywane jako grosze/centy (integer)
          const plnValueGrosze = typeof order.valuePln === 'number' ? order.valuePln : null;
          const eurForPlnCenty = typeof order.valueEur === 'number' ? order.valueEur : null;
          // Przelicz EUR na PLN: (centy -> EUR) * kurs = PLN
          const plnFromEur = plnValueGrosze == null && eurForPlnCenty != null ? centyToEur(eurForPlnCenty as Centy) * eurRate : null;
          return (
            <td
              key={column.id}
              className={`px-4 py-3 ${alignClass} group cursor-pointer hover:bg-slate-50`}
              onClick={() => startEdit(order.id, 'valuePln', order.valuePln != null ? String(order.valuePln) : '')}
            >
              <div className="flex items-center gap-2 justify-between">
                {plnValueGrosze != null ? (
                  <span>{formatGrosze(plnValueGrosze as Grosze)}</span>
                ) : plnFromEur != null ? (
                  <span className="text-muted-foreground">~{formatCurrency(plnFromEur, 'PLN')}</span>
                ) : (
                  <span>-</span>
                )}
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
              </div>
            </td>
          );
        }

        case 'valueEur': {
          if (isEditing && editingCell?.field === 'valueEur') {
            return (
              <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="0.00"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <button
                    onClick={saveEdit}
                    className="p-1 hover:bg-green-100 rounded text-green-600"
                    title="Zapisz"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                    title="Anuluj"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </td>
            );
          }
          const eurValueCenty = typeof order.valueEur === 'number' ? order.valueEur : null;
          return (
            <td
              key={column.id}
              className={`px-4 py-3 ${alignClass} group cursor-pointer hover:bg-slate-50`}
              onClick={() => startEdit(order.id, 'valueEur', order.valueEur != null ? String(order.valueEur) : '')}
            >
              <div className="flex items-center gap-2 justify-between">
                <span>{eurValueCenty != null ? formatCenty(eurValueCenty as Centy) : '-'}</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
              </div>
            </td>
          );
        }

        case 'totalWindows':
          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              {order.totalWindows || order._count?.windows || 0}
            </td>
          );

        case 'totalSashes':
          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              {order.totalSashes || '-'}
            </td>
          );

        case 'glasses':
          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              {order.totalGlasses || '-'}
            </td>
          );

        case 'orderStatus': {
          const schucoStatus = aggregateSchucoStatus(order.schucoLinks);
          const displayStatus = schucoStatus || order.status || '-';
          const hasStatusLinks = schucoStatus !== '';

          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              {displayStatus !== '-' ? (
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    hasStatusLinks
                      ? `${getSchucoStatusColor(schucoStatus)} cursor-pointer hover:opacity-80`
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  onClick={() => {
                    if (hasStatusLinks && order.schucoLinks) {
                      onSchucoStatusClick(order.orderNumber, order.schucoLinks);
                    }
                  }}
                >
                  {displayStatus}
                </span>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </td>
          );
        }

        case 'okucDemandStatus': {
          const okucStatus = order.okucDemandStatus || 'none';
          let okucLabel = '';
          let okucColorClass = '';

          switch (okucStatus) {
            case 'none':
              okucLabel = '-';
              okucColorClass = 'text-slate-400';
              break;
            case 'imported':
              okucLabel = 'OK';
              okucColorClass = 'bg-green-100 text-green-700';
              break;
            case 'has_atypical':
              okucLabel = 'Nietypowe!';
              okucColorClass = 'bg-yellow-100 text-yellow-700';
              break;
            case 'pending':
              okucLabel = 'Oczekuje';
              okucColorClass = 'bg-blue-100 text-blue-600';
              break;
            default:
              okucLabel = okucStatus;
              okucColorClass = 'bg-slate-100 text-slate-600';
          }

          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              {okucStatus === 'none' ? (
                <span className={okucColorClass}>{okucLabel}</span>
              ) : (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${okucColorClass}`}>
                  {okucLabel}
                </span>
              )}
            </td>
          );
        }

        case 'archived':
          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                order.archivedAt
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-green-100 text-green-700'
              }`}>
                {order.archivedAt ? 'Archiwum' : 'Aktywne'}
              </span>
            </td>
          );

        case 'client':
          return (
            <td
              key={column.id}
              className={`px-4 py-3 text-muted-foreground ${alignClass} whitespace-nowrap`}
              title={order.client || undefined}
            >
              {formatClientName(order.client) || '-'}
            </td>
          );

        case 'project':
          return (
            <td
              key={column.id}
              className={`px-4 py-3 text-muted-foreground ${alignClass}`}
              title={order.project || undefined}
            >
              <div className="max-w-xs truncate">
                {order.project || '-'}
              </div>
            </td>
          );

        default:
          return (
            <td key={column.id} className={`px-4 py-3 text-muted-foreground ${alignClass}`}>
              {getCellValue(order, column.id) || '-'}
            </td>
          );
      }
    },
    [order, isEditing, editingCell, editValue, setEditValue, startEdit, cancelEdit, saveEdit, eurRate, onOrderClick, onSchucoStatusClick]
  );

  return (
    <tr className={`border-t hover:bg-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
      {visibleColumns.map((column) => renderCell(column))}
    </tr>
  );
});

OrderTableRow.displayName = 'OrderTableRow';
