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
import { Check, X, Pencil, MoreVertical, Ban, Clock, XCircle, CircleOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onGlassDiscrepancyClick?: (orderNumber: string) => void;

  // Manual status callback
  onManualStatusChange?: (orderId: number, manualStatus: 'do_not_cut' | 'cancelled' | 'on_hold' | null) => void;
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
  onGlassDiscrepancyClick,
  onManualStatusChange,
}) => {
  const isEditing = editingCell?.orderId === order.id;

  // Funkcja renderująca pojedynczą komórkę
  const renderCell = useCallback(
    (column: Column) => {
      const align = column.align || 'left';
      const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

      switch (column.id) {
        case 'status': {
          // Status ręczny ma priorytet nad statusem systemowym
          let statusLabel = '';
          let statusColorClass = '';

          // Najpierw sprawdź status ręczny
          if (order.manualStatus) {
            switch (order.manualStatus) {
              case 'do_not_cut':
                statusLabel = 'NIE CIĄĆ';
                statusColorClass = 'bg-yellow-200 text-yellow-800 font-semibold';
                break;
              case 'cancelled':
                statusLabel = 'Anulowane';
                statusColorClass = 'bg-red-200 text-red-800 font-semibold';
                break;
              case 'on_hold':
                statusLabel = 'Wstrzymane';
                statusColorClass = 'bg-orange-200 text-orange-800 font-semibold';
                break;
            }
          } else {
            // Standardowy status systemowy
            const orderStatus = order.status || 'new';
            switch (orderStatus) {
              case 'new':
                statusLabel = 'Nowe';
                statusColorClass = 'bg-slate-100 text-slate-600';
                break;
              case 'in_progress':
                statusLabel = 'W realizacji';
                statusColorClass = 'bg-blue-100 text-blue-700';
                break;
              case 'completed':
                statusLabel = 'Zakończone';
                statusColorClass = 'bg-green-100 text-green-700';
                break;
              case 'archived':
                statusLabel = 'Archiwum';
                statusColorClass = 'bg-gray-200 text-gray-600';
                break;
              default:
                statusLabel = orderStatus;
                statusColorClass = 'bg-slate-100 text-slate-600';
            }
          }

          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColorClass}`}>
                {statusLabel}
              </span>
            </td>
          );
        }

        case 'orderNumber': {
          // Ikona statusu manualnego przy numerze zlecenia
          const getManualStatusIcon = () => {
            switch (order.manualStatus) {
              case 'do_not_cut':
                return <Ban className="h-4 w-4 text-yellow-600" />;
              case 'cancelled':
                return <XCircle className="h-4 w-4 text-red-600" />;
              case 'on_hold':
                return <Clock className="h-4 w-4 text-orange-600" />;
              default:
                return null;
            }
          };

          const manualStatusIcon = getManualStatusIcon();

          return (
            <td key={column.id} className={`px-4 py-3 font-mono font-medium ${alignClass}`}>
              <div className="flex items-center gap-1">
                {/* Dropdown menu dla statusu manualnego */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                      title="Zmień status"
                    >
                      {manualStatusIcon || <MoreVertical className="h-4 w-4 text-slate-400" />}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onClick={() => onManualStatusChange?.(order.id, 'do_not_cut')}
                      className={order.manualStatus === 'do_not_cut' ? 'bg-yellow-50' : ''}
                    >
                      <Ban className="h-4 w-4 mr-2 text-yellow-600" />
                      <span>NIE CIĄĆ</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onManualStatusChange?.(order.id, 'cancelled')}
                      className={order.manualStatus === 'cancelled' ? 'bg-red-50' : ''}
                    >
                      <XCircle className="h-4 w-4 mr-2 text-red-600" />
                      <span>Anulowane</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onManualStatusChange?.(order.id, 'on_hold')}
                      className={order.manualStatus === 'on_hold' ? 'bg-orange-50' : ''}
                    >
                      <Clock className="h-4 w-4 mr-2 text-orange-600" />
                      <span>Wstrzymane</span>
                    </DropdownMenuItem>
                    {order.manualStatus && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onManualStatusChange?.(order.id, null)}
                        >
                          <CircleOff className="h-4 w-4 mr-2 text-slate-400" />
                          <span>Usuń status</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Numer zlecenia - klikalny */}
                <button
                  onClick={() => onOrderClick(order.id, order.orderNumber)}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {order.orderNumber}
                </button>
              </div>
            </td>
          );
        }

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
          const deadline = order.deadline ? new Date(order.deadline) : null;
          const now = new Date();
          const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

          let content: string;
          let colorClass: string;
          let tooltipContent: string | null = null;
          let isClickable = false;

          // Priorytet statusów:
          // 1. Brak zamówienia (ordered = 0) + sprawdź czy zbliża się deadline
          // 2. Dostarczone (delivered >= ordered)
          // 3. Rozbieżność (częściowo/nadwyżka) - klikalny
          // 4. Zamówione ale nie dostarczone
          // 5. Brak danych

          if (ordered === 0) {
            // Sprawdź czy deadline jest w ciągu 2 tygodni
            if (deadline && deadline <= twoWeeksFromNow && deadline > now) {
              content = 'ZAMÓW';
              colorClass = 'bg-red-100 text-red-700 font-semibold';
              tooltipContent = `Termin realizacji: ${formatDate(order.deadline)}\nZbliża się termin - zamów szyby!`;
            } else if (deadline && deadline <= now) {
              content = 'ZAMÓW';
              colorClass = 'bg-red-200 text-red-800 font-semibold animate-pulse';
              tooltipContent = `Termin realizacji: ${formatDate(order.deadline)}\nTermin minął - pilnie zamów szyby!`;
            } else {
              content = '-';
              colorClass = 'text-slate-400';
            }
          } else if (delivered >= ordered && delivered > 0) {
            // Dostarczone (lub nadwyżka)
            content = 'Dostarczone';
            colorClass = 'bg-green-100 text-green-700';
            const deliveryDate = order.glassDeliveryDate ? formatDate(order.glassDeliveryDate) : null;
            tooltipContent = `Data dostawy: ${deliveryDate || 'brak'}\nZamówiono: ${ordered} szt.\nDostarczone: ${delivered} szt.`;

            // Nadwyżka - pokaż jako klikalny
            if (delivered > ordered) {
              content = 'Nadwyżka';
              colorClass = 'bg-orange-100 text-orange-700 cursor-pointer hover:bg-orange-200';
              isClickable = true;
              tooltipContent = `Nadwyżka szyb!\nZamówiono: ${ordered} szt.\nDostarczone: ${delivered} szt.\nKliknij aby zobaczyć szczegóły`;
            }
          } else if (delivered > 0 && delivered < ordered) {
            // Częściowo dostarczone - klikalny
            content = `Częściowo`;
            colorClass = 'bg-yellow-100 text-yellow-700 cursor-pointer hover:bg-yellow-200';
            isClickable = true;
            tooltipContent = `Częściowa dostawa\nZamówiono: ${ordered} szt.\nDostarczone: ${delivered} szt.\nBrakuje: ${ordered - delivered} szt.\nKliknij aby zobaczyć szczegóły`;
          } else if (ordered > 0 && delivered === 0) {
            // Zamówione ale nie dostarczone - pokaż datę oczekiwanej dostawy w formacie DD.MM
            const expectedDeliveryShort = order.glassDeliveryDate ? formatDateShort(order.glassDeliveryDate) : null;
            const expectedDeliveryFull = order.glassDeliveryDate ? formatDate(order.glassDeliveryDate) : null;
            content = expectedDeliveryShort || 'Zamówione';
            colorClass = 'bg-blue-100 text-blue-700';
            tooltipContent = expectedDeliveryFull
              ? `Szyby zamówione\nIlość: ${ordered} szt.\nOczekiwana dostawa: ${expectedDeliveryFull}`
              : `Szyby zamówione\nIlość: ${ordered} szt.\nOczekiwanie na dostawę`;
          } else {
            content = '-';
            colorClass = 'text-slate-400';
          }

          // Renderowanie z tooltipem
          const cellContent = (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}
              onClick={isClickable ? () => onGlassDiscrepancyClick?.(order.orderNumber) : undefined}
            >
              {content}
            </span>
          );

          if (tooltipContent) {
            return (
              <td key={column.id} className="px-4 py-3 text-center">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {cellContent}
                    </TooltipTrigger>
                    <TooltipContent className="whitespace-pre-line">
                      {tooltipContent}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </td>
            );
          }

          return (
            <td key={column.id} className="px-4 py-3 text-center">
              {cellContent}
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

        case 'schucoStatus': {
          // Status dostawy profili Schuco (z systemu Schuco)
          const schucoStatus = aggregateSchucoStatus(order.schucoLinks);
          const hasSchucoLinks = schucoStatus !== '';

          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              {hasSchucoLinks ? (
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSchucoStatusColor(schucoStatus)} cursor-pointer hover:opacity-80`}
                  onClick={() => {
                    if (order.schucoLinks) {
                      onSchucoStatusClick(order.orderNumber, order.schucoLinks);
                    }
                  }}
                >
                  {schucoStatus}
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
    [order, isEditing, editingCell, editValue, setEditValue, startEdit, cancelEdit, saveEdit, eurRate, onOrderClick, onSchucoStatusClick, onGlassDiscrepancyClick, onManualStatusChange]
  );

  // Wyróżnienie wiersza w zależności od statusu
  // Priorytet: manualStatus > completed > standardowy
  const getRowBgClass = () => {
    // Statusy manualne mają najwyższy priorytet
    switch (order.manualStatus) {
      case 'do_not_cut':
        // NIE CIĄĆ - żółte tło
        return 'bg-yellow-100 hover:bg-yellow-200';
      case 'cancelled':
        // Anulowane - czerwone tło
        return 'bg-red-100 hover:bg-red-200';
      case 'on_hold':
        // Wstrzymane - pomarańczowe tło
        return 'bg-orange-100 hover:bg-orange-200';
      default:
        // Standardowe kolorowanie
        if (order.status === 'completed') {
          return 'bg-green-50 hover:bg-green-100';
        }
        return index % 2 === 0
          ? 'bg-white hover:bg-slate-100'
          : 'bg-slate-50 hover:bg-slate-100';
    }
  };

  return (
    <tr className={`border-t ${getRowBgClass()}`}>
      {visibleColumns.map((column) => renderCell(column))}
    </tr>
  );
});

OrderTableRow.displayName = 'OrderTableRow';
