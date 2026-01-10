'use client';

import { useState, useMemo } from 'react';
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
import { ChevronDown, ChevronUp } from 'lucide-react';
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

interface DeliveryRow {
  id: number;
  deliveryDate: string;
  deliveryNumber: string | null;
  status?: string;
  notes?: string | null;
  deliveryOrders?: DeliveryOrder[];
  deliveryItems?: DeliveryItem[];
}

interface DeliveriesTableProps {
  deliveries: DeliveryRow[];
  expandedRows: Set<number>;
  onToggleRow: (id: number) => void;
  onComplete: (deliveryId: number) => void;
  onOptimize: (deliveryId: number) => void;
  onProtocol: (deliveryId: number) => void;
  onVerify: (deliveryId: number, deliveryDate: string) => void;
  onViewOrder: (orderId: number) => void;
  protocolLoadingId?: number | null;
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
  onViewOrder,
  protocolLoadingId,
}: DeliveriesTableProps) {
  // Sorting state: default by date ascending (oldest first)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'deliveryDate', desc: false }
  ]);

  // Static columns - no dependencies on expandedRows
  const staticColumns = useMemo(
    () => [
      columnHelper.accessor('deliveryDate', {
        header: 'Data',
        cell: (info) => {
          const dateStr = info.getValue();
          return (
            <div className="flex flex-col">
              <span className="font-medium">{formatDate(dateStr)}</span>
              <span className="text-xs text-slate-500 capitalize">
                {getWeekdayName(dateStr)}
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
        header: 'Akcje',
        cell: (info) => {
          const delivery = info.row.original;
          const isLoading = protocolLoadingId === delivery.id;

          return (
            <DeliveryActions
              delivery={delivery}
              onComplete={() => onComplete(delivery.id)}
              onOptimize={() => onOptimize(delivery.id)}
              onProtocol={() => onProtocol(delivery.id)}
              onVerify={() => onVerify(delivery.id, delivery.deliveryDate)}
              isProtocolLoading={isLoading}
            />
          );
        },
      }),
    ],
    [onComplete, onOptimize, onProtocol, onVerify, protocolLoadingId]
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
              aria-label={isExpanded ? 'Zwiń wiersz' : 'Rozwiń wiersz'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
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
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-slate-400"
              >
                Brak dostaw
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const isExpanded = expandedRows.has(row.original.id);

              return (
                <>
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expanded row with details */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="bg-slate-50">
                        <DeliveryDetails
                          delivery={row.original}
                          onViewOrder={onViewOrder}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
