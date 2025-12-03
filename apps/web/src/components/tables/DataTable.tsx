import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  maxHeight?: string;
  stickyHeader?: boolean;
  zebraStripes?: boolean;
  hoverEffect?: boolean;
  className?: string;
  emptyState?: ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  maxHeight = '600px',
  stickyHeader = true,
  zebraStripes = true,
  hoverEffect = true,
  className,
  emptyState,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        'rounded border overflow-hidden',
        stickyHeader && `max-h-[${maxHeight}] overflow-y-auto`,
        className
      )}
    >
      <table className="w-full text-sm">
        <thead className={cn('bg-slate-50', stickyHeader && 'sticky top-0 z-10')}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 font-medium',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.align === 'left' && 'text-left',
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
                'border-t',
                hoverEffect && 'hover:bg-slate-200',
                zebraStripes && (index % 2 === 0 ? 'bg-white' : 'bg-slate-100')
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.align === 'left' && 'text-left',
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
  );
}
