import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface VirtualizedTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T, index: number) => ReactNode;
  width?: string;
  className?: string;
  headerClassName?: string;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualizedTableColumn<T>[];
  rowHeight?: number;
  maxHeight?: string;
  onRowClick?: (row: T, index: number) => void;
  getRowKey: (row: T, index: number) => string | number;
  getRowClassName?: (row: T, index: number) => string;
  zebraStriping?: boolean;
  stickyHeader?: boolean;
  emptyMessage?: string;
}

/**
 * Virtualized table component for rendering large datasets efficiently
 *
 * Features:
 * - Virtual scrolling with @tanstack/react-virtual
 * - Sticky headers
 * - Zebra striping
 * - Custom row heights
 * - Row click handlers
 * - Responsive design
 * - ARIA attributes for accessibility
 *
 * @example
 * ```tsx
 * <VirtualizedTable
 *   data={items}
 *   getRowKey={(row) => row.id}
 *   columns={[
 *     {
 *       key: 'name',
 *       header: 'Name',
 *       cell: (row) => <span>{row.name}</span>,
 *     },
 *   ]}
 * />
 * ```
 */
export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 60,
  maxHeight = '600px',
  onRowClick,
  getRowKey,
  getRowClassName,
  zebraStriping = true,
  stickyHeader = true,
  emptyMessage = 'Brak danych do wyświetlenia',
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="border rounded-lg overflow-auto"
      style={{ height: maxHeight }}
      role="region"
      aria-label="Tabela danych"
    >
      <table className="w-full text-sm" role="grid">
        <thead
          className={cn(
            'bg-slate-50 border-b',
            stickyHeader && 'sticky top-0 z-10'
          )}
        >
          <tr role="row">
            {columns.map((col) => (
              <th
                key={col.key}
                role="columnheader"
                scope="col"
                className={cn(
                  'px-4 py-3 text-left font-medium text-slate-700',
                  col.headerClassName,
                  col.className
                )}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index];
            const rowKey = getRowKey(row, virtualRow.index);

            return (
              <tr
                key={rowKey}
                role="row"
                aria-rowindex={virtualRow.index + 1}
                className={cn(
                  'border-b transition-colors',
                  zebraStriping &&
                    (virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'),
                  onRowClick && 'cursor-pointer hover:bg-slate-100',
                  getRowClassName?.(row, virtualRow.index)
                )}
                onClick={() => onRowClick?.(row, virtualRow.index)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    role="gridcell"
                    className={cn('px-4 py-3', col.className)}
                  >
                    {col.cell(row, virtualRow.index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
