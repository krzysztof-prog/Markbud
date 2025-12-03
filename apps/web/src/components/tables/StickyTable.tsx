import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StickyColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
  sticky?: 'left' | 'right';
  width?: string;
  className?: string;
  headerClassName?: string;
}

interface StickyTableProps<T> {
  columns: StickyColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  maxHeight?: string;
  zebraStripes?: boolean;
  hoverEffect?: boolean;
  className?: string;
  emptyState?: ReactNode;
  headerRows?: ReactNode[]; // Dla tabel z wieloma wierszami nagłówka
}

export function StickyTable<T>({
  columns,
  data,
  keyExtractor,
  maxHeight = '600px',
  zebraStripes = true,
  hoverEffect = true,
  className,
  emptyState,
  headerRows,
}: StickyTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const getRowBgClass = (index: number) => {
    if (!zebraStripes) return '';
    return index % 2 === 0 ? 'bg-white' : 'bg-slate-100';
  };

  const getStickyClasses = (column: StickyColumn<T>) => {
    if (!column.sticky) return '';

    const baseClasses = 'sticky z-10';
    if (column.sticky === 'left') {
      return `${baseClasses} left-0`;
    }
    return `${baseClasses} right-0`;
  };

  return (
    <div className={cn('overflow-x-auto max-w-full', className)}>
      <div className={`max-h-[${maxHeight}] overflow-y-auto`}>
        <table className="w-full text-sm min-w-full">
          <thead className="bg-slate-50 sticky top-0 z-20">
            {headerRows ? (
              headerRows
            ) : (
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-4 py-3 font-medium bg-slate-50',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.align === 'left' && 'text-left',
                      !column.align && 'text-left',
                      getStickyClasses(column),
                      column.sticky && 'z-30',
                      column.headerClassName,
                      column.className
                    )}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {data.map((item, index) => {
              const rowBg = getRowBgClass(index);
              return (
                <tr
                  key={keyExtractor(item, index)}
                  className={cn(
                    'border-b',
                    hoverEffect && 'hover:bg-slate-200',
                    rowBg
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
                        getStickyClasses(column),
                        column.sticky && rowBg, // Sticky cells get row background
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(item, index)
                        : String((item as any)[column.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
