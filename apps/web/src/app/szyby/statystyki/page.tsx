'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { glassOrdersApi } from '@/features/glass/api/glassOrdersApi';
import { glassDeliveriesApi } from '@/features/glass/api/glassDeliveriesApi';
import type { GlassOrder } from '@/features/glass/types';
import {
  BarChart3,
  Package,
  Truck,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  Filter
} from 'lucide-react';

// Formatowanie daty
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Statystyki per zamówienie do szklarni (GlassOrder)
interface OrderStats {
  glassOrderNumber: string;
  orderDate: string;
  orderedCount: number;       // suma quantity z GlassOrderItem
  deliveredCount: number;     // suma quantity z matched GlassDeliveryItem dla tego GlassOrder
  status: 'pending' | 'partial' | 'complete' | 'excess' | 'cancelled';
  order: GlassOrder;
  isUrgent: boolean;          // pilne zamówienie (1-3 szyby)
  isCorrection: boolean;      // czy to jest korekta
  replacesOrder: string | null; // jeśli korekta - jaki numer zamówienia zastępuje
}

type FilterType = 'all' | 'standard' | 'urgent';

// Sprawdza czy zamówienie jest korektą
function isOrderCorrection(glassOrderNumber: string): boolean {
  return glassOrderNumber.toLowerCase().includes('korekta');
}

// Wyciąga bazowy numer zamówienia (bez "korekta") i normalizuje spacje
function getBaseOrderNumber(glassOrderNumber: string): string {
  // np. "02572  AKR 16 STYCZEŃ  korekta" -> "02572 AKR 16 STYCZEŃ"
  return glassOrderNumber
    .replace(/\s*korekta\s*/gi, '')  // usuń "korekta"
    .replace(/\s+/g, ' ')             // zamień wielokrotne spacje na pojedyncze
    .trim();
}

// Normalizuje numer zamówienia (usuwa wielokrotne spacje)
function normalizeOrderNumber(glassOrderNumber: string): string {
  return glassOrderNumber.replace(/\s+/g, ' ').trim();
}

// Sprawdza czy zamówienie jest pilne (1-3 szyby)
function isUrgentOrder(order: GlassOrder): boolean {
  const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  return totalQuantity >= 1 && totalQuantity <= 3;
}

export default function GlassStatisticsPage() {
  // Pobierz wszystkie zamówienia szyb
  const { data: glassOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['glass-orders'],
    queryFn: () => glassOrdersApi.getAll(),
  });

  // Pobierz wszystkie dostawy szyb
  const { data: glassDeliveries, isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['glass-deliveries'],
    queryFn: () => glassDeliveriesApi.getAll(),
  });

  // Stan filtru
  const [filter, setFilter] = useState<FilterType>('all');

  // Mapa: glassOrderId -> suma matched quantity z dostaw
  // Liczymy per glassOrderId, nie per orderNumber!
  const deliveredByGlassOrderId = useMemo(() => {
    const map = new Map<number, number>();
    if (!glassDeliveries) return map;

    for (const delivery of glassDeliveries) {
      for (const item of delivery.items || []) {
        if (item.matchStatus === 'matched' && item.glassOrderId) {
          const current = map.get(item.glassOrderId) || 0;
          map.set(item.glassOrderId, current + item.quantity);
        }
      }
    }
    return map;
  }, [glassDeliveries]);

  // Policz dostarczono na podstawie matchStatus z GlassDeliveryItem
  const matchedDeliveryCount = useMemo(() => {
    if (!glassDeliveries) return 0;
    return glassDeliveries.reduce((sum, delivery) => {
      const matchedQuantity = delivery.items?.reduce((itemSum, item) => {
        return item.matchStatus === 'matched' ? itemSum + item.quantity : itemSum;
      }, 0) || 0;
      return sum + matchedQuantity;
    }, 0);
  }, [glassDeliveries]);

  // Znajdź zamówienia które mają korektę (ich oryginały powinny być "anulowane")
  const cancelledByCorrection = useMemo(() => {
    if (!glassOrders) return new Set<string>();

    const corrections = glassOrders.filter(o => isOrderCorrection(o.glassOrderNumber));
    const cancelledSet = new Set<string>();

    for (const correction of corrections) {
      const baseNumber = getBaseOrderNumber(correction.glassOrderNumber);
      // Znajdź oryginalne zamówienie (to samo ale bez "korekta")
      // Normalizujemy obie strony porównania żeby obsłużyć wielokrotne spacje
      const original = glassOrders.find(o =>
        o.glassOrderNumber !== correction.glassOrderNumber &&
        normalizeOrderNumber(o.glassOrderNumber) === baseNumber
      );
      if (original) {
        cancelledSet.add(original.glassOrderNumber);
      }
    }

    return cancelledSet;
  }, [glassOrders]);

  // Statystyki per zamówienie do szklarni - liczymy dostarczono per glassOrderId
  const orderStats = useMemo<OrderStats[]>(() => {
    if (!glassOrders) return [];

    return glassOrders.map(order => {
      // Suma quantity z GlassOrderItem
      const orderedCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Suma matched quantity z dostaw dla tego konkretnego GlassOrder (per glassOrderId)
      const deliveredCount = deliveredByGlassOrderId.get(order.id) || 0;

      // Sprawdź czy to korekta
      const isCorrection = isOrderCorrection(order.glassOrderNumber);
      const replacesOrder = isCorrection ? getBaseOrderNumber(order.glassOrderNumber) : null;

      // Sprawdź czy zamówienie jest anulowane przez korektę
      const isCancelled = cancelledByCorrection.has(order.glassOrderNumber);

      // Określ status na podstawie porównania
      let status: OrderStats['status'];
      if (isCancelled) {
        status = 'cancelled';
      } else if (deliveredCount === 0) {
        status = 'pending';
      } else if (deliveredCount < orderedCount) {
        status = 'partial';
      } else if (deliveredCount === orderedCount) {
        status = 'complete';
      } else {
        status = 'excess';
      }

      return {
        glassOrderNumber: order.glassOrderNumber,
        orderDate: order.orderDate,
        orderedCount,
        deliveredCount,
        status,
        order,
        isUrgent: isUrgentOrder(order),
        isCorrection,
        replacesOrder,
      };
    }).sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [glassOrders, deliveredByGlassOrderId, cancelledByCorrection]);

  // Filtruj zamówienia - nie pokazuj anulowanych (zastąpionych przez korektę)
  const filteredOrderStats = useMemo(() => {
    // Zawsze ukrywamy anulowane (zastąpione przez korektę)
    let filtered = orderStats.filter(o => o.status !== 'cancelled');

    if (filter === 'standard') {
      filtered = filtered.filter(o => !o.isUrgent);
    } else if (filter === 'urgent') {
      filtered = filtered.filter(o => o.isUrgent);
    }

    return filtered;
  }, [orderStats, filter]);

  // Podziel na pilne i standardowe
  const urgentOrders = useMemo(() =>
    filteredOrderStats.filter(o => o.isUrgent),
    [filteredOrderStats]
  );

  const standardOrders = useMemo(() =>
    filteredOrderStats.filter(o => !o.isUrgent),
    [filteredOrderStats]
  );

  // Statystyki ogólne (bez anulowanych)
  const stats = useMemo(() => {
    const activeOrders = orderStats.filter(o => o.status !== 'cancelled');

    const totalOrders = activeOrders.length;
    const orderedGlasses = activeOrders.reduce((sum, o) => sum + o.orderedCount, 0);
    const deliveredGlasses = activeOrders.reduce((sum, o) => sum + o.deliveredCount, 0);
    const pendingOrders = activeOrders.filter(o => o.status === 'pending').length;
    const partialOrders = activeOrders.filter(o => o.status === 'partial').length;
    const completedOrders = activeOrders.filter(o => o.status === 'complete').length;

    return {
      totalOrders,
      orderedGlasses,
      deliveredGlasses,
      pendingOrders,
      partialOrders,
      completedOrders,
      urgentCount: urgentOrders.length,
    };
  }, [orderStats, urgentOrders]);

  const isLoading = isLoadingOrders || isLoadingDeliveries;

  // Stan rozwijania sekcji zamówień (domyślnie wszystkie zwinięte)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpanded = useCallback((glassOrderNumber: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(glassOrderNumber)) {
        newSet.delete(glassOrderNumber);
      } else {
        newSet.add(glassOrderNumber);
      }
      return newSet;
    });
  }, []);

  const getOrderStatusLabel = (status: OrderStats['status']) => {
    switch (status) {
      case 'complete': return 'Kompletne';
      case 'partial': return 'Częściowe';
      case 'pending': return 'Oczekuje';
      case 'excess': return 'Nadmiar';
      case 'cancelled': return 'Anulowane';
      default: return status;
    }
  };

  const getOrderStatusColor = (status: OrderStats['status']) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-700';
      case 'partial': return 'bg-yellow-100 text-yellow-700';
      case 'pending': return 'bg-blue-100 text-blue-700';
      case 'excess': return 'bg-orange-100 text-orange-700';
      case 'cancelled': return 'bg-slate-100 text-slate-500 line-through';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Komponent renderujący kartę zamówienia
  const renderOrderCard = (orderStat: OrderStats) => {
    const isExpanded = expandedOrders.has(orderStat.glassOrderNumber);
    const progressPercent = orderStat.orderedCount > 0
      ? Math.min((orderStat.deliveredCount / orderStat.orderedCount) * 100, 100)
      : 0;

    return (
      <div
        key={orderStat.glassOrderNumber}
        className={`border rounded-lg overflow-hidden ${orderStat.isCorrection ? 'border-purple-300' : ''}`}
      >
        {/* Nagłówek - klikalny */}
        <button
          onClick={() => toggleOrderExpanded(orderStat.glassOrderNumber)}
          className={`w-full p-3 hover:bg-slate-100 transition-colors flex items-center justify-between text-left ${
            orderStat.isCorrection ? 'bg-purple-50' : 'bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
            <div>
              <div className="flex items-center gap-1">
                <span className="font-medium font-mono text-sm">
                  {orderStat.glassOrderNumber}
                </span>
                {orderStat.isCorrection && (
                  <span className="px-1.5 py-0.5 bg-purple-200 text-purple-700 rounded text-[10px] font-medium">
                    KOREKTA
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                ({formatDate(orderStat.orderDate)})
              </span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(orderStat.status)}`}>
            {getOrderStatusLabel(orderStat.status)}
          </span>
        </button>

        {/* Pasek postępu - zawsze widoczny */}
        <div className="w-full h-1.5 bg-slate-200">
          <div
            className={`h-full transition-all ${
              orderStat.status === 'excess' ? 'bg-orange-500' :
              orderStat.status === 'complete' ? 'bg-green-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Statystyki zamówienia - zawsze widoczne */}
        <div className="px-3 py-2 flex items-center justify-between text-xs border-t border-slate-100">
          <span className="text-blue-600">
            Zamówiono: <strong>{orderStat.orderedCount}</strong>
          </span>
          <span className="text-green-600">
            Dopasowano: <strong>{orderStat.deliveredCount}</strong>
          </span>
        </div>

        {/* Lista pozycji zamówienia - tylko gdy rozwinięte */}
        {isExpanded && orderStat.order.items && (
          <div className="p-3 space-y-1.5 border-t border-slate-100">
            <div className="text-xs text-slate-500 mb-2">Pozycje w zamówieniu:</div>
            {orderStat.order.items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-600">
                    {item.orderNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    poz. {item.position}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {item.widthMm}x{item.heightMm}
                  </span>
                  <span className="text-xs font-medium">
                    {item.quantity} szt.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Szyby - Statystyki" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            {/* Karty ze statystykami */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                icon={<Package className="h-5 w-5 text-purple-500" />}
                label="Zamówień"
                value={stats.totalOrders}
              />
              <StatCard
                icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
                label="Zamówionych szyb"
                value={stats.orderedGlasses}
              />
              <StatCard
                icon={<Truck className="h-5 w-5 text-green-500" />}
                label="Dostarczonych szyb"
                value={stats.deliveredGlasses}
              />
              <StatCard
                icon={<AlertCircle className="h-5 w-5 text-blue-400" />}
                label="Oczekujących"
                value={stats.pendingOrders}
              />
              <StatCard
                icon={<Clock className="h-5 w-5 text-yellow-500" />}
                label="Częściowych"
                value={stats.partialOrders}
              />
              <StatCard
                icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                label="Zakończonych"
                value={stats.completedOrders}
              />
            </div>

            {/* Tabela zamówień do szklarni */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {filter === 'urgent' ? 'Pilne zamówienia' : 'Zamówienia do szklarni'}
                    {filter === 'standard' && ' - standardowe'}
                  </CardTitle>
                  {/* Filtry */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <div className="flex gap-1">
                      <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                        className="h-7 text-xs"
                      >
                        Wszystkie
                      </Button>
                      <Button
                        variant={filter === 'standard' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('standard')}
                        className="h-7 text-xs"
                      >
                        Standardowe
                      </Button>
                      <Button
                        variant={filter === 'urgent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('urgent')}
                        className="h-7 text-xs"
                      >
                        Pilne ({stats.urgentCount})
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Pokaż tylko standardowe gdy filtr = all, lub wszystkie gdy filtr = standard */}
                {(() => {
                  const ordersToShow = filter === 'all' ? standardOrders :
                                       filter === 'standard' ? standardOrders :
                                       urgentOrders;

                  if (ordersToShow.length > 0) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ordersToShow.map(renderOrderCard)}
                      </div>
                    );
                  }

                  return (
                    <div className="text-center py-12 text-slate-500">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Brak zamówień szyb do wyświetlenia</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">{icon}</div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
