'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileScrollHint } from '@/components/ui/mobile-scroll-hint';
import { colorsApi, ordersApi, warehouseApi, warehouseOrdersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, AlertTriangle, Pencil, Check, X, ChevronDown, ChevronRight, Plus, Trash2, ArrowLeft, Warehouse, FileText, ClipboardCheck, History } from 'lucide-react';
import { OrderDetailModal } from '@/components/orders/order-detail-modal';
import Link from 'next/link';
import type { Color, OrderTableData, WarehouseStock, WarehouseOrder, CreateWarehouseOrderData, WarehouseTableRow } from '@/types';
import { useAverageMonthly } from '@/features/warehouse/remanent/hooks/useRemanent';
import { useDebounce } from '@/hooks/useDebounce';
import { WarehouseHistory } from '@/features/warehouse/components/WarehouseHistory';

export default function MagazynAkrobudPageContent() {
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'zlecenia' | 'magazyn' | 'historia'>('zlecenia');
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; number: string } | null>(null);

  // Pobierz wszystkie kolory
  const { data: colors, isLoading: colorsLoading } = useQuery({
    queryKey: ['colors'],
    queryFn: () => colorsApi.getAll(),
  });

  // Pobierz tabel zleceD dla wybranego koloru
  const { data: ordersTable, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-table', selectedColorId],
    queryFn: () => ordersApi.getTable(selectedColorId!),
    enabled: !!selectedColorId,
  });

  // Pobierz stan magazynowy dla wybranego koloru
  const { data: warehouseData, isLoading: warehouseLoading } = useQuery({
    queryKey: ['warehouse', selectedColorId],
    queryFn: () => warehouseApi.getByColor(selectedColorId!),
    enabled: !!selectedColorId,
  });

  // Ustaw pierwszy kolor jako domy[lny
  if (colors?.length && !selectedColorId) {
    setSelectedColorId(colors[0].id);
  }

  const selectedColor = colors?.find((c: Color) => c.id === selectedColorId);

  // Grupuj kolory
  const typicalColors = colors?.filter((c: Color) => c.type === 'typical') || [];
  const atypicalColors = colors?.filter((c: Color) => c.type === 'atypical') || [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Magazyn Akrobud">
        <div className="flex gap-2">
          <Link href="/magazyn/akrobud/remanent">
            <Button variant="outline" size="sm">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Wykonaj remanent
            </Button>
          </Link>
          <Link href="/magazyn">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do menu
            </Button>
          </Link>
        </div>
      </Header>

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Magazyn', href: '/magazyn', icon: <Warehouse className="h-4 w-4" /> },
            { label: 'Akrobud' },
          ]}
        />
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar z kolorami */}
        <div className="w-full md:w-64 border-r border-b md:border-b-0 bg-white overflow-y-auto max-h-48 md:max-h-full">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-3">
              Kolory
            </h3>

            {/* Typowe */}
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Typowe</p>
              <div className="space-y-1">
                {typicalColors.map((color: Color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColorId(color.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                      selectedColorId === color.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color.hexColor || '#ccc' }}
                    />
                    <span className="font-mono text-xs">{color.code}</span>
                    <span className="flex-1 truncate">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nietypowe */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Nietypowe</p>
              <div className="space-y-1">
                {atypicalColors.map((color: Color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColorId(color.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                      selectedColorId === color.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color.hexColor || '#ccc' }}
                    />
                    <span className="font-mono text-xs">{color.code}</span>
                    <span className="flex-1 truncate">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Główna zawartość */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {selectedColor && (
            <>
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
                <div
                  className="w-8 h-8 md:w-10 md:h-10 rounded border-2 flex-shrink-0"
                  style={{ backgroundColor: selectedColor.hexColor || '#ccc' }}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold truncate">
                    {selectedColor.code} - {selectedColor.name}
                  </h2>
                  <Badge variant={selectedColor.type === 'typical' ? 'secondary' : 'outline'} className="mt-1">
                    {selectedColor.type === 'typical' ? 'Typowy' : 'Nietypowy'}
                  </Badge>
                </div>
                <Link href="/magazyn/akrobud/remanent">
                  <Button variant="default" size="sm">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Wykonaj remanent
                  </Button>
                </Link>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="zlecenia" className="flex-1 md:flex-none text-xs md:text-sm">Tabela zleceń</TabsTrigger>
                  <TabsTrigger value="magazyn" className="flex-1 md:flex-none text-xs md:text-sm">Stan magazynowy</TabsTrigger>
                  <TabsTrigger value="historia" className="flex-1 md:flex-none text-xs md:text-sm">
                    <History className="h-4 w-4 mr-1" />
                    Historia
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="zlecenia" className="mt-3 md:mt-4">
                  <OrdersTable
                    data={ordersTable}
                    isLoading={ordersLoading}
                    onOrderClick={(orderId, orderNumber) =>
                      setSelectedOrder({ id: orderId, number: orderNumber })
                    }
                  />
                </TabsContent>

                <TabsContent value="magazyn" className="mt-3 md:mt-4">
                  <WarehouseTable data={warehouseData?.data || []} isLoading={warehouseLoading} colorId={selectedColorId!} />
                </TabsContent>

                <TabsContent value="historia" className="mt-3 md:mt-4">
                  {selectedColorId && (
                    <WarehouseHistory
                      colorId={selectedColorId}
                      colorName={selectedColor?.name}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Modal szczeg�B�w zlecenia */}
      <OrderDetailModal
        orderId={selectedOrder?.id || null}
        orderNumber={selectedOrder?.number}
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      />
    </div>
  );
}

// Tabela zleceń
function OrdersTable({
  data,
  isLoading,
  onOrderClick,
}: {
  data: OrderTableData | undefined;
  isLoading: boolean;
  onOrderClick?: (orderId: number, orderNumber: string) => void;
}) {
  if (isLoading) {
    return <TableSkeleton rows={8} columns={6} />;
  }

  if (!data?.orders?.length) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Brak zleceń"
        description="Nie znaleziono żadnych aktywnych zleceń dla tego koloru. Zlecenia pojawią się tutaj po dodaniu zamówień wymagających tego profilu."
        className="min-h-[300px]"
      />
    );
  }

  const profiles = data.profiles || [];
  const orders = data.orders || [];
  const totals = data.totals || {};

  return (
    <>
      <MobileScrollHint />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-w-full max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm min-w-[800px] table-fixed">
            <thead className="bg-slate-50 border-b sticky top-0 z-20">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700 sticky left-0 bg-slate-50 z-30 w-32">
                  Zlecenie
                </th>
                {profiles.map((profile: OrderTableData['profiles'][0]) => (
                  <th
                    key={profile.id}
                    colSpan={2}
                    className="px-4 py-3 text-center font-medium text-slate-700 border-l min-w-[140px]"
                  >
                    {profile.number}
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-100 border-b text-xs">
                <th className="px-4 py-2 text-left text-slate-500 sticky left-0 bg-slate-100 z-30 w-32"></th>
                {profiles.map((profile: OrderTableData['profiles'][0]) => (
                  <>
                    <th key={`${profile.id}-bele`} className="px-2 py-2 text-center text-slate-700 font-semibold border-l-4 border-l-blue-400 bg-blue-100 min-w-[70px]">
                      bele
                    </th>
                    <th key={`${profile.id}-m`} className="px-2 py-2 text-center text-slate-500 border-l min-w-[70px]">
                      m
                    </th>
                  </>
                ))}
              </tr>
            </thead>
          <tbody>
            {/* Suma */}
            <tr className="bg-blue-50 font-semibold sticky top-[74px] z-10">
              <td className="px-4 py-3 sticky left-0 bg-blue-50 z-20 w-32">SUMA</td>
              {profiles.map((profile: OrderTableData['profiles'][0]) => {
                const total = totals[profile.number] || { beams: 0, meters: 0 };
                return (
                  <>
                    <td
                      key={`total-${profile.id}-bele`}
                      className="px-2 py-3 text-center border-l-4 border-l-blue-400 bg-blue-200 font-bold min-w-[70px]"
                    >
                      {total.beams}
                    </td>
                    <td key={`total-${profile.id}-m`} className="px-2 py-3 text-center border-l bg-blue-50 min-w-[70px]">
                      {total.meters.toFixed(1)}
                    </td>
                  </>
                );
              })}
            </tr>
            {orders.map((order: OrderTableData['orders'][0], index: number) => {
              const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-100';
              return (
              <tr key={order.orderId} className={`border-b hover:bg-slate-100 ${rowBg}`}>
                <td className={`px-4 py-3 font-mono font-medium sticky left-0 z-10 w-32 ${rowBg}`}>
                  <button
                    onClick={() => onOrderClick?.(order.orderId, order.orderNumber)}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {order.orderNumber}
                  </button>
                </td>
                {profiles.map((profile: OrderTableData['profiles'][0]) => {
                  const req = order.requirements[profile.number] || { beams: 0, meters: 0 };
                  return (
                    <>
                      <td
                        key={`${order.orderId}-${profile.id}-bele`}
                        className="px-2 py-3 text-center border-l-4 border-l-blue-400 bg-blue-50 font-medium min-w-[70px]"
                      >
                        {req.beams || '-'}
                      </td>
                      <td key={`${order.orderId}-${profile.id}-m`} className="px-2 py-3 text-center border-l min-w-[70px]">
                        {req.meters || '-'}
                      </td>
                    </>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Tabela magazynowa
function WarehouseTable({ data, isLoading, colorId }: { data: any[]; isLoading: boolean; colorId: number }) {
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

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      warehouseOrdersApi.update(orderId, { status: status as any }),
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

  if (isLoading) {
    return <TableSkeleton rows={6} columns={8} />;
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={<Package className="h-12 w-12" />}
        title="Brak danych magazynowych"
        description="Nie znaleziono informacji o stanach magazynowych dla tego koloru. Dane pojawią się automatycznie po dodaniu profili i zleceń."
        className="min-h-[300px]"
      />
    );
  }

  // Helper to get average for a profile - memoized to avoid recalculation
  const getAverageForProfile = useCallback(
    (profileId: number) => {
      const profileAverage = averageData?.averages.find((a) => a.profileId === profileId);
      return profileAverage?.averageBeamsPerMonth || 0;
    },
    [averageData]
  );

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
                <th className="px-4 py-3 text-left font-semibold text-slate-900 sticky left-0 bg-slate-50 z-30">Profil</th>
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
            {data.map((row: any, index: number) => {
              const isExpanded = expandedRows.has(row.profileId);
              const isHistoryExpanded = expandedHistory.has(row.profileId);
              const pendingOrders = row.pendingOrders || [];
              const receivedOrders = row.receivedOrders || [];
              const isAddingOrder = addingOrderFor === row.profileId;

              return (
                <>
                  {/* GB�wny wiersz profilu */}
                  <tr
                    key={row.profileId}
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
                        aria-label={isExpanded ? `Zwiń szczegóły profilu ${row.profileNumber}` : `Rozwiń szczegóły profilu ${row.profileNumber}`}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-base font-bold text-slate-900">{row.profileNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'text-xl font-semibold',
                        row.isLow && 'text-yellow-600',
                        !row.isLow && 'text-slate-700'
                      )}>
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
                      {row.isNegative && (
                        <AlertTriangle className="inline-block ml-1 h-4 w-4 text-red-500" />
                      )}
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

                  {/* Rozwinita sekcja z zam�wieniami */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="bg-slate-50/50 px-8 py-4">
                        <div className="space-y-4">
                          {/* Sekcja: Oczekujce zam�wienia */}
                          <div>
                            <h4 className="text-xs font-semibold text-slate-600 mb-3">
                              Oczekujce zam�wienia ({pendingOrders.length})
                            </h4>

                            {pendingOrders.length === 0 && !isAddingOrder && (
                              <p className="text-xs text-slate-400 italic">Brak oczekujcych zam�wieD</p>
                            )}

                            {/* Lista pending zam�wieD */}
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
                                  {order.notes && (
                                    <div className="flex-1 text-slate-500">
                                      {order.notes}
                                    </div>
                                  )}
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
                                      onClick={() => deleteOrderMutation.mutate(order.id)}
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

                          {/* Sekcja: Historia otrzymanych zam�wieD (rozwijana) */}
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
                                      {order.notes && (
                                        <div className="flex-1 text-slate-500">
                                          {order.notes}
                                        </div>
                                      )}
                                      <div className="text-green-600 font-medium"> Otrzymano</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Formularz dodawania nowego zam�wienia */}
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
                                onChange={(e) =>
                                  setNewOrder((prev) => ({ ...prev, notes: e.target.value }))
                                }
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
                </>
              );
            })}
          </tbody>
        </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
