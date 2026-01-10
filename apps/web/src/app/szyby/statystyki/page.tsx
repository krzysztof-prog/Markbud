'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { glassOrdersApi } from '@/features/glass/api/glassOrdersApi';
import { glassDeliveriesApi } from '@/features/glass/api/glassDeliveriesApi';
import type { GlassOrder } from '@/features/glass/types';
import {
  BarChart3,
  Package,
  Truck,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight
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

// Grupowanie zamówień po dacie dostawy
interface DateStats {
  date: string;
  orderedCount: number;
  deliveredCount: number;
  orders: GlassOrder[];
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

  // Statystyki ogólne
  const stats = useMemo(() => {
    if (!glassOrders) {
      return {
        totalOrders: 0,
        orderedGlasses: 0,
        deliveredGlasses: 0,
        pendingOrders: 0,
        partialOrders: 0,
        completedOrders: 0,
      };
    }

    const totalOrders = glassOrders.length;
    // Suma quantity ze wszystkich pozycji zamówień
    const orderedGlasses = glassOrders.reduce((sum, order) => {
      if (order.items && order.items.length > 0) {
        return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }
      return sum;
    }, 0);
    const pendingOrders = glassOrders.filter(o => o.status === 'ordered').length;
    const partialOrders = glassOrders.filter(o => o.status === 'partially_delivered').length;
    const completedOrders = glassOrders.filter(o => o.status === 'delivered').length;

    // Policz dostarczone szyby z dostaw
    const deliveredGlasses = glassDeliveries?.reduce((sum, delivery) => sum + (delivery._count?.items || 0), 0) || 0;

    return {
      totalOrders,
      orderedGlasses,
      deliveredGlasses,
      pendingOrders,
      partialOrders,
      completedOrders,
    };
  }, [glassOrders, glassDeliveries]);

  // Grupowanie zamówień wg daty oczekiwanej dostawy
  const ordersByDate = useMemo<DateStats[]>(() => {
    if (!glassOrders) return [];

    const dateMap = new Map<string, DateStats>();

    glassOrders.forEach(order => {
      // Użyj oczekiwanej daty dostawy lub daty zamówienia
      const dateKey = order.expectedDeliveryDate
        ? order.expectedDeliveryDate.split('T')[0]
        : order.orderDate.split('T')[0];

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          orderedCount: 0,
          deliveredCount: 0,
          orders: [],
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- dateKey was just set in the map above, guaranteed to exist
      const stats = dateMap.get(dateKey)!;
      // Suma quantity z items (nie liczba pozycji)
      const orderQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      stats.orderedCount += orderQuantity;
      stats.orders.push(order);

      // Jeśli zamówienie jest dostarczone lub częściowo dostarczone
      if (order.status === 'delivered') {
        stats.deliveredCount += orderQuantity;
      } else if (order.status === 'partially_delivered') {
        // Częściowo - zakładamy 50% jako przybliżenie
        stats.deliveredCount += Math.floor(orderQuantity / 2);
      }
    });

    // Sortuj od najnowszej daty
    return Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [glassOrders]);

  const isLoading = isLoadingOrders || isLoadingDeliveries;

  // Stan rozwijania sekcji dat (domyślnie wszystkie zwinięte)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const toggleDateExpanded = useCallback((date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  }, []);

  // Funkcja do określenia statusu wizualnego
  const getStatusIcon = (order: GlassOrder) => {
    switch (order.status) {
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partially_delivered':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ordered':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Dostarczone';
      case 'partially_delivered': return 'Częściowo';
      case 'ordered': return 'Zamówione';
      case 'cancelled': return 'Anulowane';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'partially_delivered': return 'bg-yellow-100 text-yellow-700';
      case 'ordered': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
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

            {/* Tabela zamówień wg daty */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Zamówienia szyb wg daty dostawy
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ordersByDate.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ordersByDate.map((dateStats) => {
                      const isExpanded = expandedDates.has(dateStats.date);
                      return (
                        <div key={dateStats.date} className="border rounded-lg overflow-hidden">
                          {/* Nagłówek - klikalny */}
                          <button
                            onClick={() => toggleDateExpanded(dateStats.date)}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-500" />
                              )}
                              <span className="font-medium">
                                {formatDate(dateStats.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-blue-600">
                                Zamówiono: {dateStats.orderedCount}
                              </span>
                              <span className="text-green-600">
                                Dostarczono: {dateStats.deliveredCount}
                              </span>
                            </div>
                          </button>

                          {/* Pasek postępu - zawsze widoczny */}
                          <div className="w-full h-1.5 bg-slate-200">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{
                                width: `${dateStats.orderedCount > 0
                                  ? (dateStats.deliveredCount / dateStats.orderedCount * 100)
                                  : 0}%`
                              }}
                            />
                          </div>

                          {/* Lista zamówień - tylko gdy rozwinięte */}
                          {isExpanded && (
                            <div className="p-3 space-y-1.5">
                              {dateStats.orders.map((order) => {
                                const orderQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                                return (
                                  <div
                                    key={order.id}
                                    className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(order)}
                                      <span className="font-mono text-xs">{order.glassOrderNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-500 text-xs">
                                        {orderQuantity} szt.
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                        {getStatusLabel(order.status)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Brak zamówień szyb do wyświetlenia</p>
                  </div>
                )}
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
