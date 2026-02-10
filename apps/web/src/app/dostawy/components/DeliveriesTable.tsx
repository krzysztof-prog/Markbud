'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Package, CheckCircle2, XCircle, AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import type { ReadinessResult, AggregatedReadinessStatus } from '@/lib/api/orders';
import { getTodayWarsaw } from '@/lib/date-utils';
import DeliveryStats from './DeliveryStats';
import DeliveryValue from './DeliveryValue';
import DeliveryActions from './DeliveryActions';
import DeliveryDetails from './DeliveryDetails';

// Helper functions for date formatting
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getWeekdayName = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', { weekday: 'long' });
};

// Sprawdza czy dostawa jest przeterminowana (data w przeszłości i niezakończona)
const isDeliveryOverdue = (dateStr: string, status?: string) => {
  const today = getTodayWarsaw();
  const deliveryDate = dateStr.split('T')[0];
  return deliveryDate < today && status !== 'completed';
};

// Types
interface DeliveryOrder {
  orderId?: number;
  order: {
    id: number;
    orderNumber: string;
    totalWindows?: number | null;
    totalSashes?: number | null;
    totalGlasses?: number | null;
    valuePln?: string | number | null;
    valueEur?: string | number | null;
  };
}

interface DeliveryItem {
  id: number;
  itemType: string;
  description: string;
  quantity: number;
}

interface LabelCheckData {
  id: number;
  status: string;
  okCount: number;
  mismatchCount: number;
  errorCount: number;
  results: Array<{
    orderId: number;
    status: string;
  }>;
}

interface DeliveryRow {
  id: number;
  deliveryDate: string;
  deliveryNumber: string | null;
  status?: string;
  notes?: string | null;
  deliveryOrders?: DeliveryOrder[];
  deliveryItems?: DeliveryItem[];
  labelChecks?: LabelCheckData[];
}

interface DeliveriesTableProps {
  deliveries: DeliveryRow[];
  expandedRows: Set<number>;
  onToggleRow: (id: number) => void;
  onComplete: (deliveryId: number) => void;
  onOptimize: (deliveryId: number) => void;
  onProtocol: (deliveryId: number) => void;
  onVerify: (deliveryId: number, deliveryDate: string) => void;
  onCheckLabels: (deliveryId: number, labelCheckId: number | null) => void;
  onViewOrder: (orderId: number) => void;
  onRemoveOrder?: (deliveryId: number, orderId: number) => void;
  protocolLoadingId?: number | null;
  checkLabelsLoadingId?: number | null;
  isRemovingOrder?: boolean;
  /** QW-1: Mapa statusów readiness z batch query */
  readinessMap?: Record<number, ReadinessResult>;
}

/**
 * Komponent do wyświetlania ikony statusu readiness w tabeli
 * QW-1: Zoptymalizowany - otrzymuje status z batch query
 */
function ReadinessIcon({ readiness }: { readiness?: ReadinessResult }) {
  const iconClass = 'h-4 w-4 flex-shrink-0';

  if (!readiness) {
    return (
      <span title="Ładowanie statusu..." className="inline-flex">
        <Clock className={`${iconClass} text-slate-400`} />
      </span>
    );
  }

  const status: AggregatedReadinessStatus = readiness.status;

  switch (status) {
    case 'ready':
      return (
        <span title="Gotowe do wysyłki" className="inline-flex">
          <CheckCircle2 className={`${iconClass} text-green-600`} />
        </span>
      );
    case 'conditional':
      return (
        <span title="Warunkowe - sprawdź ostrzeżenia" className="inline-flex">
          <AlertTriangle className={`${iconClass} text-yellow-600`} />
        </span>
      );
    case 'blocked':
      return (
        <span title="Zablokowane - sprawdź blokady" className="inline-flex">
          <XCircle className={`${iconClass} text-red-600`} />
        </span>
      );
    case 'pending':
    default:
      return (
        <span title="Oczekuje na sprawdzenie" className="inline-flex">
          <Clock className={`${iconClass} text-slate-400`} />
        </span>
      );
  }
}

const columnHelper = createColumnHelper<DeliveryRow>();

export default function DeliveriesTable({
  deliveries,
  expandedRows,
  onToggleRow,
  onComplete,
  onOptimize,
  onProtocol,
  onVerify,
  onCheckLabels,
  onViewOrder,
  onRemoveOrder,
  protocolLoadingId,
  checkLabelsLoadingId,
  isRemovingOrder,
  readinessMap,
}: DeliveriesTableProps) {
  // Sorting state: default by date ascending (oldest first)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'deliveryDate', desc: false }
  ]);

  // Static columns - no dependencies on expandedRows
  const staticColumns = useMemo(
    () => [
      // QW-1: Kolumna statusu readiness
      columnHelper.display({
        id: 'readiness',
        header: 'Status',
        cell: (info) => {
          const delivery = info.row.original;
          return <ReadinessIcon readiness={readinessMap?.[delivery.id]} />;
        },
      }),
      columnHelper.accessor('deliveryDate', {
        header: 'Data',
        cell: (info) => {
          const dateStr = info.getValue();
          const delivery = info.row.original;
          const overdue = isDeliveryOverdue(dateStr, delivery.status);
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                {overdue && (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <span className={`font-medium ${overdue ? 'text-red-600' : ''}`}>
                  {formatDate(dateStr)}
                </span>
              </div>
              <span className={`text-xs capitalize ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
                {overdue ? 'Przeterminowana' : getWeekdayName(dateStr)}
              </span>
            </div>
          );
        },
        sortingFn: 'datetime',
      }),
      columnHelper.accessor('deliveryNumber', {
        header: 'Numer',
        cell: (info) => {
          const deliveryNumber = info.getValue();
          const id = info.row.original.id;
          return (
            <Badge variant="outline">
              {deliveryNumber || `#${id}`}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('deliveryOrders', {
        header: 'Zlecenia',
        cell: (info) => {
          const orders = info.getValue();
          const count = orders?.length || 0;
          return (
            <span className="text-sm font-medium">
              {count === 0 ? (
                <span className="text-slate-400">—</span>
              ) : (
                count
              )}
            </span>
          );
        },
        enableSorting: false,
      }),
      columnHelper.display({
        id: 'stats',
        header: 'Statystyki',
        cell: (info) => {
          const delivery = info.row.original;
          return <DeliveryStats delivery={delivery} />;
        },
      }),
      columnHelper.display({
        id: 'value',
        header: 'Wartość',
        cell: (info) => {
          const delivery = info.row.original;
          return <DeliveryValue delivery={delivery} />;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="text-center block">Akcje</span>,
        meta: {
          className: 'text-center',
        },
        cell: (info) => {
          const delivery = info.row.original;
          const isProtocolLoading = protocolLoadingId === delivery.id;
          const isCheckLabelsLoading = checkLabelsLoadingId === delivery.id;
          const hasLabelCheck = Boolean(delivery.labelChecks?.[0]?.id);

          return (
            <DeliveryActions
              delivery={delivery}
              onComplete={() => onComplete(delivery.id)}
              onOptimize={() => onOptimize(delivery.id)}
              onProtocol={() => onProtocol(delivery.id)}
              onVerify={() => onVerify(delivery.id, delivery.deliveryDate)}
              onCheckLabels={() => onCheckLabels(delivery.id, delivery.labelChecks?.[0]?.id ?? null)}
              isProtocolLoading={isProtocolLoading}
              isCheckLabelsLoading={isCheckLabelsLoading}
              hasLabelCheck={hasLabelCheck}
            />
          );
        },
      }),
    ],
    [onComplete, onOptimize, onProtocol, onVerify, onCheckLabels, protocolLoadingId, checkLabelsLoadingId, readinessMap]
  );

  // Expand column - depends on expandedRows
  const expandColumn = useMemo(
    () =>
      columnHelper.display({
        id: 'expand',
        header: '',
        cell: (info) => {
          const id = info.row.original.id;
          const isExpanded = expandedRows.has(id);

          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleRow(id)}
              aria-label={isExpanded ? 'Zwiń szczegóły dostawy' : 'Rozwiń szczegóły dostawy'}
              aria-expanded={isExpanded}
              aria-controls={`delivery-details-${id}`}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          );
        },
      }),
    [expandedRows, onToggleRow]
  );

  const columns = useMemo(
    () => [...staticColumns, expandColumn],
    [staticColumns, expandColumn]
  );

  const table = useReactTable({
    data: deliveries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    initialState: {
      sorting: [{ id: 'deliveryDate', desc: false }],
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as { className?: string } | undefined;
                return (
                  <TableHead key={header.id} className={meta?.className}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <Package className="h-10 w-10 text-slate-300" aria-hidden="true" />
                  <p className="text-slate-500 font-medium">Brak dostaw</p>
                  <p className="text-sm text-slate-400">
                    Kliknij na dzień w kalendarzu aby dodać dostawę
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const isExpanded = expandedRows.has(row.original.id);
              const overdue = isDeliveryOverdue(row.original.deliveryDate, row.original.status);

              return (
                <React.Fragment key={row.id}>
                  <TableRow className={overdue ? 'bg-red-50 hover:bg-red-100' : ''}>
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { className?: string } | undefined;
                      return (
                        <TableCell key={cell.id} className={meta?.className}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* Expanded row with details */}
                  {isExpanded && (
                    <TableRow id={`delivery-details-${row.original.id}`}>
                      <TableCell colSpan={columns.length} className="bg-slate-50">
                        <DeliveryDetails
                          delivery={row.original}
                          onViewOrder={onViewOrder}
                          onRemoveOrder={onRemoveOrder}
                          isRemovingOrder={isRemovingOrder}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
