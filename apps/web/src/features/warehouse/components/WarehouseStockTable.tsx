'use client';

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileScrollHint } from '@/components/ui/mobile-scroll-hint';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { warehouseOrdersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { Package, AlertTriangle, Check, X, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { WarehouseOrder, CreateWarehouseOrderData, WarehouseTableRow } from '@/types';
import { useAverageMonthly } from '@/features/warehouse/remanent/hooks/useRemanent';
import { useDebounce } from '@/hooks/useDebounce';

interface WarehouseStockTableProps {
  data: WarehouseTableRow[];
  isLoading: boolean;
  colorId: number;
}

/**
 * Tabela stanu magazynowego dla wybranego koloru
 * Pokazuje stan magazynu, zapotrzebowanie, średnie zużycie i zamówienia
 */
export const WarehouseStockTable = React.memo(function WarehouseStockTable({
  data,
  isLoading,
  colorId,
}: WarehouseStockTableProps) {
  const queryClient = useQueryClient();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set());
  const [addingOrderFor, setAddingOrderFor] = useState<number | null>(null);
  const [months, setMonths] = useState(6);
  const [newOrder, setNewOrder] = useState<{
    orderedBeams: number | '';
    expectedDeliveryDate: string;
    notes: string;
  }>({ orderedBeams: '', expectedDeliveryDate: '', notes: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<{ id: number; beams: number } | null>(null);

  // Debounce months to avoid too many API calls
  const debouncedMonths = useDebounce(months, 500);
  const { data: averageData } = useAverageMonthly(colorId, debouncedMonths);

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateWarehouseOrderData) => warehouseOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', colorId] });
      setAddingOrderFor(null);
      setNewOrder({ orderedBeams: '', expectedDeliveryDate: '', notes: '' });
      showSuccessToast('Zamówienie dodane', 'Pomyślnie dodano nowe zamówienie do magazynu');
    },
    onError: (error) => {
      showErrorToast('Błąd dodawania zamówienia', getErrorMessage(error));
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: number) => warehouseOrdersApi.delete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', colorId] });
      showSuccessToast('Zamówienie usunięte', 'Pomyślnie usunięto zamówienie');
    },
    onError: (error) => {
      showErrorToast('Błąd usuwania zamówienia', getErrorMessage(error));
    },
  });

  const handleDeleteOrder = (orderId: number, beams: number) => {
    setOrderToDelete({ id: orderId, beams });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (orderToDelete) {
      deleteOrderMutation.mutate(orderToDelete.id);
      setOrderToDelete(null);
    }
  };

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: 'pending' | 'received' | 'cancelled' }) =>
      warehouseOrdersApi.update(orderId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', colorId] });
      showSuccessToast('Status zaktualizowany', 'Pomyślnie zaktualizowano status zamówienia');
    },
    onError: (error) => {
      showErrorToast('Błąd aktualizacji zamówienia', getErrorMessage(error));
    },
  });

  const toggleRow = (profileId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(profileId)) {
      newExpanded.delete(profileId);
    } else {
      newExpanded.add(profileId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleHistory = (profileId: number) => {
    const newExpanded = new Set(expandedHistory);
    if (newExpanded.has(profileId)) {
      newExpanded.delete(profileId);
    } else {
      newExpanded.add(profileId);
    }
    setExpandedHistory(newExpanded);
  };

  const startAddingOrder = (profileId: number) => {
    setAddingOrderFor(profileId);
    setNewOrder({ orderedBeams: '', expectedDeliveryDate: '', notes: '' });
  };

  const cancelAddingOrder = () => {
    setAddingOrderFor(null);
    setNewOrder({ orderedBeams: '', expectedDeliveryDate: '', notes: '' });
  };

  const saveNewOrder = (profileId: number) => {
    if (!newOrder.orderedBeams || !newOrder.expectedDeliveryDate) return;

    createOrderMutation.mutate({
      profileId,
      colorId,
      orderedBeams: Number(newOrder.orderedBeams),
      expectedDeliveryDate: newOrder.expectedDeliveryDate,
      notes: newOrder.notes || undefined,
    });
  };

  // Helper to get average for a profile - memoized to avoid recalculation
  const getAverageForProfile = useCallback(
    (profileId: number) => {
      const profileAverage = averageData?.averages.find((a) => a.profileId === profileId);
      return profileAverage?.averageBeamsPerMonth || 0;
    },
    [averageData]
  );

  // Spójny wrapper dla wszystkich stanów - zapobiega layout shift
  if (isLoading) {
    return (
      <>
        <MobileScrollHint />
        <Card>
          <CardContent className="p-0">
            <TableSkeleton rows={6} columns={8} />
          </CardContent>
        </Card>
      </>
    );
  }

  if (!data?.length) {
    return (
      <>
        <MobileScrollHint />
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="Brak danych magazynowych"
              description="Nie znaleziono informacji o stanach magazynowych dla tego koloru. Dane pojawią się automatycznie po dodaniu profili i zleceń."
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <MobileScrollHint />
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="months-input" className="text-sm font-medium text-slate-700">
          Średnia z ostatnich:
        </label>
        <Input
          id="months-input"
          type="number"
          min="1"
          max="24"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value) || 6)}
          className="w-20"
        />
        <span className="text-sm text-slate-600">miesięcy</span>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-w-full max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="px-2 py-3 w-8 bg-slate-50"></th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 sticky left-0 bg-slate-50 z-30">
                    Profil
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Stan magazynu</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Zapotrzebowanie</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Po zapotrzeb.</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Średnia</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Zamówione</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Najbliższa dostawa</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900 w-20">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row: WarehouseTableRow, index: number) => {
                  const isExpanded = expandedRows.has(row.profileId);
                  const isHistoryExpanded = expandedHistory.has(row.profileId);
                  const pendingOrders = row.pendingOrders || [];
                  const receivedOrders = row.receivedOrders || [];
                  const isAddingOrder = addingOrderFor === row.profileId;

                  return (
                    <React.Fragment key={row.profileId}>
                      {/* Główny wiersz profilu */}
                      <tr
                        className={cn(
                          'border-b hover:bg-slate-100',
                          row.isNegative && 'bg-red-50',
                          row.isLow && !row.isNegative && 'bg-yellow-50',
                          !row.isNegative && !row.isLow && (index % 2 === 0 ? 'bg-white' : 'bg-slate-100')
                        )}
                      >
                        <td className="px-2 py-3">
                          <button
                            onClick={() => toggleRow(row.profileId)}
                            className="text-slate-400 hover:text-slate-600"
                            aria-label={
                              isExpanded
                                ? `Zwiń szczegóły profilu ${row.profileNumber}`
                                : `Rozwiń szczegóły profilu ${row.profileNumber}`
                            }
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-base font-bold text-slate-900">{row.profileNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'text-xl font-semibold',
                              row.isLow && 'text-yellow-600',
                              !row.isLow && 'text-slate-700'
                            )}
                          >
                            {row.currentStock}
                          </span>
                          {row.isLow && !row.isNegative && (
                            <AlertTriangle className="inline-block ml-1 h-4 w-4 text-yellow-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-slate-600">{row.demand}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'text-lg font-semibold',
                              row.isNegative ? 'text-red-600' : 'text-green-600'
                            )}
                          >
                            {row.afterDemand}
                          </span>
                          {row.isNegative && <AlertTriangle className="inline-block ml-1 h-4 w-4 text-red-500" />}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-slate-700">
                            {getAverageForProfile(row.profileId).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {row.orderedBeams || '-'}
                          {pendingOrders.length > 0 && (
                            <span className="ml-1 text-xs text-slate-500">({pendingOrders.length})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.expectedDeliveryDate
                            ? new Date(row.expectedDeliveryDate).toLocaleDateString('pl-PL')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
                            onClick={() => startAddingOrder(row.profileId)}
                            aria-label={`Dodaj zamówienie dla profilu ${row.profileNumber}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>

                      {/* Rozwinięta sekcja z zamówieniami */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="bg-slate-50/50 px-8 py-4">
                            <div className="space-y-4">
                              {/* Sekcja: Oczekujące zamówienia */}
                              <div>
                                <h4 className="text-xs font-semibold text-slate-600 mb-3">
                                  Oczekujące zamówienia ({pendingOrders.length})
                                </h4>

                                {pendingOrders.length === 0 && !isAddingOrder && (
                                  <p className="text-xs text-slate-400 italic">Brak oczekujących zamówień</p>
                                )}

                                {/* Lista pending zamówień */}
                                <div className="space-y-2">
                                  {pendingOrders.map((order: WarehouseOrder) => (
                                    <div
                                      key={order.id}
                                      className="flex items-center gap-4 p-3 bg-white rounded border text-xs"
                                    >
                                      <div className="flex-1">
                                        <span className="font-medium">{order.orderedBeams} bel</span>
                                      </div>
                                      <div className="flex-1">
                                        <span className="text-slate-600">
                                          Dostawa: {new Date(order.expectedDeliveryDate).toLocaleDateString('pl-PL')}
                                        </span>
                                      </div>
                                      {order.notes && <div className="flex-1 text-slate-500">{order.notes}</div>}
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-green-600 hover:text-green-700"
                                          onClick={() =>
                                            updateOrderMutation.mutate({
                                              orderId: order.id,
                                              status: 'received',
                                            })
                                          }
                                          disabled={updateOrderMutation.isPending}
                                        >
                                          Otrzymano
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                          onClick={() => handleDeleteOrder(order.id, order.orderedBeams)}
                                          disabled={deleteOrderMutation.isPending}
                                          aria-label={`Usuń zamówienie ${order.orderedBeams} bel`}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Sekcja: Historia otrzymanych zamówień (rozwijana) */}
                              {receivedOrders.length > 0 && (
                                <div>
                                  <button
                                    onClick={() => toggleHistory(row.profileId)}
                                    className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-800 mb-3"
                                  >
                                    {isHistoryExpanded ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                    Historia otrzymanych ({receivedOrders.length})
                                  </button>

                                  {isHistoryExpanded && (
                                    <div className="space-y-2">
                                      {receivedOrders.map((order: WarehouseOrder) => (
                                        <div
                                          key={order.id}
                                          className="flex items-center gap-4 p-3 bg-green-50/50 rounded border border-green-200 text-xs"
                                        >
                                          <div className="flex-1">
                                            <span className="font-medium text-green-700">{order.orderedBeams} bel</span>
                                          </div>
                                          <div className="flex-1">
                                            <span className="text-slate-600">
                                              Otrzymano: {new Date(order.expectedDeliveryDate).toLocaleDateString('pl-PL')}
                                            </span>
                                          </div>
                                          {order.notes && <div className="flex-1 text-slate-500">{order.notes}</div>}
                                          <div className="text-green-600 font-medium">Otrzymano</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Formularz dodawania nowego zamówienia */}
                              {isAddingOrder && (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={newOrder.orderedBeams}
                                    onChange={(e) =>
                                      setNewOrder((prev) => ({
                                        ...prev,
                                        orderedBeams: e.target.value === '' ? '' : Number(e.target.value),
                                      }))
                                    }
                                    className="w-24 h-8 text-xs"
                                    placeholder="Bele"
                                  />
                                  <Input
                                    type="date"
                                    value={newOrder.expectedDeliveryDate}
                                    onChange={(e) =>
                                      setNewOrder((prev) => ({
                                        ...prev,
                                        expectedDeliveryDate: e.target.value,
                                      }))
                                    }
                                    className="w-36 h-8 text-xs"
                                  />
                                  <Input
                                    type="text"
                                    value={newOrder.notes}
                                    onChange={(e) => setNewOrder((prev) => ({ ...prev, notes: e.target.value }))}
                                    className="flex-1 h-8 text-xs"
                                    placeholder="Notatki (opcjonalnie)"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-3 text-xs text-green-600 hover:text-green-700"
                                    onClick={() => saveNewOrder(row.profileId)}
                                    disabled={createOrderMutation.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-3 text-xs text-red-600 hover:text-red-700"
                                    onClick={cancelAddingOrder}
                                    disabled={createOrderMutation.isPending}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
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
        </CardContent>
      </Card>

      {/* Dialog potwierdzenia usunięcia zamówienia */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Usuń zamówienie"
        description={`Czy na pewno chcesz usunąć zamówienie na ${orderToDelete?.beams || 0} bel?`}
        confirmText="Usuń"
        onConfirm={confirmDelete}
        isLoading={deleteOrderMutation.isPending}
        variant="destructive"
      />
    </>
  );
});
