'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { warehouseApi } from '@/lib/api';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RemanentHistoryEntry } from '@/types/warehouse';

// Helper functions outside component to avoid recreation on each render
const getDifferenceIcon = (diff: number) => {
  if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (diff < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
};

const getDifferenceColor = (diff: number) => {
  if (diff > 0) return 'text-green-600 bg-green-50';
  if (diff < 0) return 'text-red-600 bg-red-50';
  return 'text-slate-500 bg-slate-50';
};

interface WarehouseHistoryProps {
  colorId: number;
  colorName?: string;
}

export function WarehouseHistory({ colorId, colorName }: WarehouseHistoryProps) {
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['warehouse-history', colorId],
    queryFn: () => warehouseApi.getHistory(colorId, 100),
    staleTime: 5 * 60 * 1000, // 5 minut
  });

  if (isLoading) {
    return <TableSkeleton rows={10} columns={5} />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Błąd ładowania historii: {error instanceof Error ? error.message : 'Nieznany błąd'}
      </div>
    );
  }

  // Memoize grouped data to avoid recalculation on each render
  const { groupedByDate, sortedDates } = useMemo(() => {
    if (!history || history.length === 0) {
      return { groupedByDate: {}, sortedDates: [] };
    }

    const grouped = history.reduce((groups, entry) => {
      const dateKey = new Date(entry.recordedAt).toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
      return groups;
    }, {} as Record<string, RemanentHistoryEntry[]>);

    const sorted = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return { groupedByDate: grouped, sortedDates: sorted };
  }, [history]);

  if (!history || history.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-12 w-12" />}
        title="Brak historii"
        description={`Dla koloru ${colorName || ''} nie ma jeszcze żadnych wpisów historii magazynu.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const entries = groupedByDate[dateKey];
        const totalDifference = entries.reduce((sum, e) => sum + e.difference, 0);
        const differencesCount = entries.filter((e) => e.difference !== 0).length;

        return (
          <div key={dateKey} className="border rounded-lg overflow-hidden">
            {/* Nagłówek grupy - data */}
            <div className="bg-slate-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-slate-500" />
                <span className="font-semibold">
                  {formatDate(dateKey)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {entries.length} profili
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {differencesCount > 0 && (
                  <span className="text-amber-600">
                    {differencesCount} różnic
                  </span>
                )}
                <span className={cn('font-mono', getDifferenceColor(totalDifference))}>
                  Suma: {totalDifference > 0 ? '+' : ''}{totalDifference} bel
                </span>
              </div>
            </div>

            {/* Tabela wpisów */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Profil</th>
                    <th className="px-4 py-2 text-center font-medium">Stan obliczony</th>
                    <th className="px-4 py-2 text-center font-medium">Stan rzeczywisty</th>
                    <th className="px-4 py-2 text-center font-medium">Różnica</th>
                  </tr>
                </thead>
                <tbody>
                  {entries
                    .sort((a, b) => a.profile.number.localeCompare(b.profile.number))
                    .map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={cn(
                          'border-b last:border-0',
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                          entry.difference !== 0 && 'bg-amber-50/50'
                        )}
                      >
                        <td className="px-4 py-2">
                          <span className="font-mono font-semibold">{entry.profile.number}</span>
                          {entry.profile.name && (
                            <span className="ml-2 text-slate-500 text-xs">{entry.profile.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center font-mono">
                          {entry.calculatedStock} bel
                        </td>
                        <td className="px-4 py-2 text-center font-mono">
                          {entry.actualStock} bel
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getDifferenceIcon(entry.difference)}
                            <span
                              className={cn(
                                'font-mono px-2 py-0.5 rounded',
                                getDifferenceColor(entry.difference)
                              )}
                            >
                              {entry.difference > 0 ? '+' : ''}{entry.difference}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
