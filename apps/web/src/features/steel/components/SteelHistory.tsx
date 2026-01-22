'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { History, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api-client';

interface SteelHistoryEntry {
  id: number;
  steelId: number;
  calculatedStock: number;
  actualStock: number;
  difference: number;
  previousStock: number | null;
  currentStock: number | null;
  changeType: string | null;
  notes: string | null;
  recordedAt: string;
  steel: {
    number: string;
    name: string;
  };
  recordedBy?: {
    name: string;
  } | null;
}

/**
 * Komponent wyswietlajacy historie zmian stanu magazynowego stali
 */
export function SteelHistory() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['steel-history'],
    queryFn: () => fetchApi<SteelHistoryEntry[]>('/api/steel/history'),
  });

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={<History className="h-12 w-12" />}
            title="Brak historii"
            description="Nie znaleziono zadnych wpisow w historii zmian stanu magazynowego stali."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Historia zmian stanu magazynowego
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-3 font-medium text-slate-600 text-sm">Data</th>
                <th className="text-left p-3 font-medium text-slate-600 text-sm">Stal</th>
                <th className="text-center p-3 font-medium text-slate-600 text-sm">Poprzedni stan</th>
                <th className="text-center p-3 font-medium text-slate-600 text-sm">Nowy stan</th>
                <th className="text-center p-3 font-medium text-slate-600 text-sm">Zmiana</th>
                <th className="text-left p-3 font-medium text-slate-600 text-sm">Typ</th>
                <th className="text-left p-3 font-medium text-slate-600 text-sm">Uzytkownik</th>
                <th className="text-left p-3 font-medium text-slate-600 text-sm">Notatki</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const change = (entry.currentStock ?? 0) - (entry.previousStock ?? 0);
                const isPositive = change > 0;
                const isNegative = change < 0;

                return (
                  <tr key={entry.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-600">
                      {new Date(entry.recordedAt).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3">
                      <div>
                        <span className="font-mono text-sm">{entry.steel.number}</span>
                        <p className="text-xs text-slate-500">{entry.steel.name}</p>
                      </div>
                    </td>
                    <td className="p-3 text-center text-sm">
                      {entry.previousStock ?? '-'}
                    </td>
                    <td className="p-3 text-center text-sm font-medium">
                      {entry.currentStock ?? '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-sm font-medium',
                          isPositive && 'text-green-600',
                          isNegative && 'text-red-600',
                          !isPositive && !isNegative && 'text-slate-500'
                        )}
                      >
                        {isPositive && <ArrowUp className="h-3 w-3" />}
                        {isNegative && <ArrowDown className="h-3 w-3" />}
                        {isPositive && '+'}
                        {change}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-600">
                      {entry.changeType || '-'}
                    </td>
                    <td className="p-3 text-sm text-slate-600">
                      {entry.recordedBy?.name || '-'}
                    </td>
                    <td className="p-3 text-sm text-slate-500 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
