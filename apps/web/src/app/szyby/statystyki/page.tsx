'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { glassOrdersApi } from '@/features/glass/api/glassOrdersApi';
import { glassDeliveriesApi } from '@/features/glass/api/glassDeliveriesApi';
import type { GlassOrder, GlassDelivery } from '@/features/glass/types';
import {
  BarChart3,
  Package,
  Truck,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
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
    const orderedGlasses = glassOrders.reduce((sum, order) => sum + (order._count?.items || 0), 0);

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

      const stats = dateMap.get(dateKey)!;
      stats.orderedCount += order._count?.items || 0;
      stats.orders.push(order);

      // Jeśli zamówienie jest dostarczone lub częściowo dostarczone
      if (order.status === 'delivered') {
        stats.deliveredCount += order._count?.items || 0;
      } else if (order.status === 'partially_delivered') {
        // Częściowo - zakładamy 50% jako przybliżenie
        stats.deliveredCount += Math.floor((order._count?.items || 0) / 2);
      }
    });

    // Sortuj od najnowszej daty
    return Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [glassOrders]);

  const isLoading = isLoadingOrders || isLoadingDeliveries;

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
                  <div className="space-y-4">
                    {ordersByDate.map((dateStats) => (
                      <div key={dateStats.date} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-lg">
                            {formatDate(dateStats.date)}
                          </h4>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-blue-600">
                              Zamówiono: {dateStats.orderedCount}
                            </span>
                            <span className="text-green-600">
                              Dostarczono: {dateStats.deliveredCount}
                            </span>
                          </div>
                        </div>

                        {/* Pasek postępu */}
                        <div className="w-full h-2 bg-slate-200 rounded-full mb-3 overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{
                              width: `${dateStats.orderedCount > 0
                                ? (dateStats.deliveredCount / dateStats.orderedCount * 100)
                                : 0}%`
                            }}
                          />
                        </div>

                        {/* Lista zamówień dla tej daty */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {dateStats.orders.map((order) => (
                            <div
                              key={order.id}
                              className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                {getStatusIcon(order)}
                                <span className="font-mono">{order.glassOrderNumber}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">
                                  {order._count?.items || 0} szt.
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                  {getStatusLabel(order.status)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
