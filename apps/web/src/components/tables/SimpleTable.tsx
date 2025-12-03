import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SimpleTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
  className?: string;
}

interface SimpleTableProps<T> {
  columns: SimpleTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  maxHeight?: string;
  className?: string;
  emptyState?: ReactNode;
}

/**
 * Simple table component for modals and small data sets
 * Features: sticky header, zebra stripes, hover effect
 */
export function SimpleTable<T>({
  columns,
  data,
  keyExtractor,
  maxHeight = '400px',
  className,
  emptyState = <div className="text-center py-8 text-slate-500">Brak danych</div>,
}: SimpleTableProps<T>) {
  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('rounded border overflow-hidden', className)}>
      <div className={`max-h-[${maxHeight}] overflow-y-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 py-2 font-medium text-slate-700',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    !column.align && 'text-left',
                    column.className
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className={cn(
                  'border-t hover:bg-slate-200',
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      !column.align && 'text-left',
                      column.className
                    )}
                  >
                    {column.render
                      ? column.render(item, index)
                      : String((item as any)[column.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
