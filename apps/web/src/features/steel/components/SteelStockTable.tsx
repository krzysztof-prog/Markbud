'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileScrollHint } from '@/components/ui/mobile-scroll-hint';
import { steelApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { Package, ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react';
import type { SteelWithStock } from '@/types';

interface SteelStockTableProps {
  data: SteelWithStock[];
  isLoading: boolean;
}

/**
 * Tabela stanu magazynowego stali
 * Pokazuje wszystkie stale z ich stanem magazynowym
 */
export const SteelStockTable = React.memo(function SteelStockTable({
  data,
  isLoading,
}: SteelStockTableProps) {
  const queryClient = useQueryClient();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [newStockValue, setNewStockValue] = useState<number | ''>('');

  const updateStockMutation = useMutation({
    mutationFn: ({ steelId, currentStockBeams }: { steelId: number; currentStockBeams: number }) =>
      steelApi.updateStock(steelId, { currentStockBeams }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steels-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['steels'] });
      setEditingStock(null);
      setNewStockValue('');
      showSuccessToast('Stan zaktualizowany', 'Pomyslnie zaktualizowano stan magazynowy');
    },
    onError: (error) => {
      showErrorToast('Blad aktualizacji stanu', getErrorMessage(error));
    },
  });

  const toggleRow = (steelId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(steelId)) {
        next.delete(steelId);
      } else {
        next.add(steelId);
      }
      return next;
    });
  };

  const startEditing = (steelId: number, currentStock: number) => {
    setEditingStock(steelId);
    setNewStockValue(currentStock);
  };

  const cancelEditing = () => {
    setEditingStock(null);
    setNewStockValue('');
  };

  const saveStock = (steelId: number) => {
    if (newStockValue === '' || newStockValue < 0) {
      showErrorToast('Nieprawidlowa wartosc', 'Podaj poprawna liczbe belek');
      return;
    }
    updateStockMutation.mutate({ steelId, currentStockBeams: newStockValue });
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-12 w-12" />}
        title="Brak danych o stali"
        description="Nie znaleziono zadnych wzmocnien stalowych w bazie danych."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <MobileScrollHint />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-3 font-medium text-slate-600 text-sm w-8"></th>
                <th className="text-left p-3 font-medium text-slate-600 text-sm">Numer</th>
                <th className="text-left p-3 font-medium text-slate-600 text-sm">Nazwa</th>
                <th className="text-left p-3 font-medium text-slate-600 text-sm">Nr artykulu</th>
                <th className="text-center p-3 font-medium text-slate-600 text-sm">
                  Stan magazynu
                  <span className="block text-xs font-normal text-slate-400">(belki 6m)</span>
                </th>
                <th className="text-center p-3 font-medium text-slate-600 text-sm w-24">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {data.map((steel) => {
                const isExpanded = expandedRows.has(steel.id);
                const isEditing = editingStock === steel.id;
                const currentStock = steel.steelStock?.currentStockBeams ?? 0;
                const isLowStock = currentStock <= 5;
                const isZeroStock = currentStock === 0;

                return (
                  <React.Fragment key={steel.id}>
                    <tr
                      className={cn(
                        'border-b hover:bg-slate-50 transition-colors',
                        isZeroStock && 'bg-red-50',
                        isLowStock && !isZeroStock && 'bg-yellow-50'
                      )}
                    >
                      <td className="p-3">
                        <button
                          onClick={() => toggleRow(steel.id)}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-sm">{steel.number}</td>
                      <td className="p-3 text-sm">{steel.name}</td>
                      <td className="p-3 font-mono text-xs text-slate-500">
                        {steel.articleNumber || '-'}
                      </td>
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              value={newStockValue}
                              onChange={(e) => setNewStockValue(e.target.value === '' ? '' : parseInt(e.target.value))}
                              className="w-20 h-8 text-center"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => saveStock(steel.id)}
                              disabled={updateStockMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={cancelEditing}
                              disabled={updateStockMutation.isPending}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              'font-semibold',
                              isZeroStock && 'text-red-600',
                              isLowStock && !isZeroStock && 'text-yellow-600'
                            )}
                          >
                            {currentStock}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {!isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => startEditing(steel.id, currentStock)}
                          >
                            <Edit2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded row - details */}
                    {isExpanded && (
                      <tr className="bg-slate-50 border-b">
                        <td colSpan={6} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Opis:</span>
                              <p className="font-medium">{steel.description || '-'}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Stan poczatkowy:</span>
                              <p className="font-medium">
                                {steel.steelStock?.initialStockBeams ?? 0} belek
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Ostatnia aktualizacja:</span>
                              <p className="font-medium">
                                {steel.steelStock?.updatedAt
                                  ? new Date(steel.steelStock.updatedAt).toLocaleDateString('pl-PL')
                                  : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Kolejnosc sortowania:</span>
                              <p className="font-medium">{steel.sortOrder}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-3 border-t bg-slate-50 flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
            <span>Brak stanu (0 belek)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
            <span>Niski stan (1-5 belek)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
