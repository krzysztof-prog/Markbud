import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  /** Opis dla screen readers */
  label?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  label = 'Ładowanie tabeli...'
}: TableSkeletonProps) {
  return (
    <div
      className="rounded border overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={label}
      aria-busy="true"
    >
      {/* Screen reader only text */}
      <span className="sr-only">{label}</span>
      <table className="w-full" aria-hidden="true">
        <thead className="bg-slate-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-full" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-t">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
