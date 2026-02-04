'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { List, Plus, Zap } from 'lucide-react';
import { deliveriesApi } from '@/lib/api';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { useDownloadDeliveryProtocol, useBatchReadiness } from '@/features/deliveries/hooks';
import { getTodayWarsaw, formatDateWarsaw } from '@/lib/date-utils';

// OrderDetailModal - lazy loaded
const OrderDetailModal = dynamic(
  () => import('@/features/orders/components/OrderDetailModal').then((mod) => mod.OrderDetailModal),
  { ssr: false }
);
import { DeliveryFilters } from './DeliveryFilters';
import DeliveriesTable from './DeliveriesTable';
import type { Delivery } from '@/types/delivery';

type DateFilterValue = '7' | '14' | '30' | 'archive';

interface DeliveriesListViewProps {
  initialDateRange?: DateFilterValue;
  onShowNewDeliveryDialog?: () => void;
  onShowQuickDeliveryDialog?: () => void;
}

// Helper to calculate date ranges
// For 7/14/30 days: show deliveries from customStartDate (or TODAY) forward
// For archive: only past deliveries older than 90 days
const getDateRange = (
  filter: DateFilterValue,
  customStartDate?: string
): { from: string; to: string } => {
  const formatDate = (d: Date) => formatDateWarsaw(d);

  // Use custom start date if provided, otherwise use today
  const startDate = customStartDate || getTodayWarsaw();

  switch (filter) {
    case '7': {
      const from = new Date(startDate);
      const to = new Date(from);
      to.setDate(from.getDate() + 7);
      return { from: formatDate(from), to: formatDate(to) };
    }
    case '14': {
      const from = new Date(startDate);
      const to = new Date(from);
      to.setDate(from.getDate() + 14);
      return { from: formatDate(from), to: formatDate(to) };
    }
    case '30': {
      const from = new Date(startDate);
      const to = new Date(from);
      to.setDate(from.getDate() + 30);
      return { from: formatDate(from), to: formatDate(to) };
    }
    case 'archive': {
      const today = new Date();
      const to = new Date(today);
      to.setDate(today.getDate() - 1); // Yesterday
      return { from: '2020-01-01', to: formatDate(to) };
    }
    default:
      return { from: startDate, to: startDate };
  }
};

export function DeliveriesListView({
  initialDateRange = '14',
  onShowNewDeliveryDialog,
  onShowQuickDeliveryDialog,
}: DeliveriesListViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateRange);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showCompleteDialog, setShowCompleteDialog] = useState<number | null>(null);
  const [productionDate, setProductionDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [protocolLoadingId, setProtocolLoadingId] = useState<number | null>(null);

  // Calculate date range
  const dateRange = useMemo(
    () => getDateRange(dateFilter, customStartDate),
    [dateFilter, customStartDate]
  );

  // Fetch deliveries
  const { data: deliveries, isLoading, isError, error } = useQuery({
    queryKey: ['deliveries-list', dateRange],
    queryFn: () => deliveriesApi.getAll({
      from: dateRange.from,
      to: dateRange.to,
    }),
  });

  // QW-1: Batch readiness dla listy dostaw
  const deliveryIds = useMemo(
    () => (Array.isArray(deliveries) ? deliveries.map((d) => d.id) : []),
    [deliveries]
  );
  const { data: readinessMap } = useBatchReadiness(deliveryIds, {
    enabled: deliveryIds.length > 0,
  });

  // Protocol download mutation
  const downloadProtocolMutation = useDownloadDeliveryProtocol();

  // Complete orders mutation
  const completeOrdersMutation = useMutation({
    mutationFn: ({ deliveryId, productionDate }: { deliveryId: number; productionDate: string }) =>
      deliveriesApi.completeOrders(deliveryId, productionDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-list'] });
      setShowCompleteDialog(null);
      setProductionDate('');
      showSuccessToast('Zlecenia zakończone', 'Pomyślnie oznaczono zlecenia jako wyprodukowane');
    },
    onError: (error) => {
      showErrorToast('Błąd kończenia zleceń', getErrorMessage(error));
    },
  });

  // Handlers
  const toggleRow = useCallback((id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleComplete = useCallback((deliveryId: number) => {
    setShowCompleteDialog(deliveryId);
  }, []);

  const handleOptimize = useCallback((deliveryId: number) => {
    router.push(`/dostawy/${deliveryId}/optymalizacja`);
  }, [router]);

  const handleVerify = useCallback((_deliveryId: number, deliveryDate: string) => {
    // Przekieruj do strony weryfikacji z datą w query params
    const dateOnly = deliveryDate.split('T')[0];
    router.push(`/dostawy/weryfikacja?date=${dateOnly}`);
  }, [router]);

  const handleProtocol = useCallback((deliveryId: number) => {
    setProtocolLoadingId(deliveryId);
    downloadProtocolMutation.mutate(deliveryId, {
      onSuccess: () => {
        showSuccessToast('Protokół pobrany', 'PDF protokołu odbioru został pobrany');
        setProtocolLoadingId(null);
      },
      onError: (error) => {
        showErrorToast('Błąd pobierania protokołu', getErrorMessage(error));
        setProtocolLoadingId(null);
      },
    });
  }, [downloadProtocolMutation]);

  const handleViewOrder = useCallback((orderId: number) => {
    setSelectedOrderId(orderId);
  }, []);

  const handleCheckLabels = useCallback((labelCheckId: number | null) => {
    if (labelCheckId) {
      router.push(`/kontrola-etykiet/${labelCheckId}`);
    } else {
      showErrorToast('Brak weryfikacji', 'Ta dostawa nie ma jeszcze sprawdzenia etykiet');
    }
  }, [router]);

  const handleConfirmComplete = useCallback(() => {
    if (showCompleteDialog && productionDate) {
      completeOrdersMutation.mutate({
        deliveryId: showCompleteDialog,
        productionDate,
      });
    }
  }, [showCompleteDialog, productionDate, completeOrdersMutation]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
      return { count: 0, windows: 0, sashes: 0, glasses: 0, valuePln: 0 };
    }

    let windows = 0, sashes = 0, glasses = 0, valuePln = 0;

    deliveries.forEach((delivery: Delivery) => {
      delivery.deliveryOrders?.forEach(dOrder => {
        windows += dOrder.order.totalWindows || 0;
        sashes += dOrder.order.totalSashes || 0;
        glasses += dOrder.order.totalGlasses || 0;
      });
      valuePln += delivery.totalValue || 0;
    });

    return {
      count: deliveries.length,
      windows,
      sashes,
      glasses,
      valuePln,
    };
  }, [deliveries]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-lg">Lista dostaw</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Przyciski dodawania dostaw */}
              {onShowNewDeliveryDialog && (
                <Button size="sm" onClick={onShowNewDeliveryDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nowa dostawa
                </Button>
              )}
              {onShowQuickDeliveryDialog && (
                <Button size="sm" variant="secondary" onClick={onShowQuickDeliveryDialog}>
                  <Zap className="h-4 w-4 mr-2" />
                  Szybka dostawa
                </Button>
              )}
              <DeliveryFilters
                value={dateFilter}
                onChange={setDateFilter}
                customStartDate={customStartDate}
                onCustomStartDateChange={setCustomStartDate}
              />
            </div>
          </div>

          {/* Summary stats */}
          {!isLoading && Array.isArray(deliveries) && deliveries.length > 0 && (
            <div className="flex flex-wrap gap-4 pt-4 border-t mt-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Dostaw:</span>
                <span className="font-semibold">{summaryStats.count}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Okna:</span>
                <span className="font-semibold">{summaryStats.windows}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Skrzydła:</span>
                <span className="font-semibold">{summaryStats.sashes}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Szyby:</span>
                <span className="font-semibold">{summaryStats.glasses}</span>
              </div>
              {summaryStats.valuePln > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Wartość:</span>
                  <span className="font-semibold">
                    {summaryStats.valuePln.toLocaleString('pl-PL')} PLN
                  </span>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} columns={7} />
          ) : isError ? (
            <div className="py-12 text-center">
              <p className="text-red-600 mb-2">Błąd wczytywania dostaw</p>
              <p className="text-sm text-slate-500">{getErrorMessage(error)}</p>
            </div>
          ) : Array.isArray(deliveries) && deliveries.length > 0 ? (
            <DeliveriesTable
              deliveries={deliveries}
              expandedRows={expandedRows}
              onToggleRow={toggleRow}
              onComplete={handleComplete}
              onOptimize={handleOptimize}
              onProtocol={handleProtocol}
              onVerify={handleVerify}
              onCheckLabels={handleCheckLabels}
              onViewOrder={handleViewOrder}
              protocolLoadingId={protocolLoadingId}
              readinessMap={readinessMap}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-slate-400 mb-4">
                Brak dostaw w wybranym okresie
              </p>
              <p className="text-sm text-slate-400">
                {dateFilter === 'archive'
                  ? 'Nie znaleziono archiwalnych dostaw'
                  : `Nie ma dostaw w najbliższych ${dateFilter} dniach`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Orders Dialog */}
      <Dialog open={!!showCompleteDialog} onOpenChange={(open) => !open && setShowCompleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oznacz zlecenia jako zakończone</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500 mb-4">
              Wszystkie zlecenia z tej dostawy zostaną oznaczone jako wyprodukowane z podaną datą.
            </p>
            <div>
              <label className="text-sm font-medium block mb-1">Data wyprodukowania</label>
              <Input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(null)}>
              Anuluj
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={!productionDate || completeOrdersMutation.isPending}
            >
              {completeOrdersMutation.isPending ? 'Zapisuję...' : 'Zakończ zlecenia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />
    </>
  );
}

export default DeliveriesListView;
