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
  FileText,
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

// Statystyki per zamówienie do szklarni (GlassOrder)
interface OrderStats {
  glassOrderNumber: string;
  orderDate: string;
  orderedCount: number;       // suma quantity z GlassOrderItem
  deliveredCount: number;     // suma quantity z matched GlassDeliveryItem
  status: 'pending' | 'partial' | 'complete' | 'excess';
  order: GlassOrder;
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

  // Policz dostarczono na podstawie matchStatus z GlassDeliveryItem
  // matchStatus = 'matched' oznacza że szyba została dopasowana do zamówienia
  const matchedDeliveryCount = useMemo(() => {
    if (!glassDeliveries) return 0;
    return glassDeliveries.reduce((sum, delivery) => {
      // Suma quantity z items gdzie matchStatus = 'matched'
      const matchedQuantity = delivery.items?.reduce((itemSum, item) => {
        return item.matchStatus === 'matched' ? itemSum + item.quantity : itemSum;
      }, 0) || 0;
      return sum + matchedQuantity;
    }, 0);
  }, [glassDeliveries]);

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

    // Dostarczono = suma quantity z matched items (nie wszystkich dostaw!)
    const deliveredGlasses = matchedDeliveryCount;

    return {
      totalOrders,
      orderedGlasses,
      deliveredGlasses,
      pendingOrders,
      partialOrders,
      completedOrders,
    };
  }, [glassOrders, matchedDeliveryCount]);

  // Statystyki per zamówienie do szklarni - liczymy dostarczono z matched items
  const orderStats = useMemo<OrderStats[]>(() => {
    if (!glassOrders) return [];

    // Mapa: orderNumber -> suma matched quantity z dostaw
    const deliveredByOrderNumber = new Map<string, number>();
    if (glassDeliveries) {
      for (const delivery of glassDeliveries) {
        for (const item of delivery.items || []) {
          if (item.matchStatus === 'matched') {
            const current = deliveredByOrderNumber.get(item.orderNumber) || 0;
            deliveredByOrderNumber.set(item.orderNumber, current + item.quantity);
          }
        }
      }
    }

    return glassOrders.map(order => {
      // Suma quantity z GlassOrderItem
      const orderedCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Suma matched quantity z dostaw dla numerów zleceń w tym zamówieniu
      let deliveredCount = 0;
      if (order.items) {
        const orderNumbers = new Set(order.items.map(item => item.orderNumber));
        for (const orderNum of orderNumbers) {
          deliveredCount += deliveredByOrderNumber.get(orderNum) || 0;
        }
      }

      // Określ status na podstawie porównania
      let status: 'pending' | 'partial' | 'complete' | 'excess';
      if (deliveredCount === 0) {
        status = 'pending';
      } else if (deliveredCount < orderedCount) {
        status = 'partial';
      } else if (deliveredCount === orderedCount) {
        status = 'complete';
      } else {
        status = 'excess'; // Dostarczono więcej niż zamówiono
      }

      return {
        glassOrderNumber: order.glassOrderNumber,
        orderDate: order.orderDate,
        orderedCount,
        deliveredCount,
        status,
        order,
      };
    }).sort((a, b) => b.orderDate.localeCompare(a.orderDate)); // Najnowsze pierwsze
  }, [glassOrders, glassDeliveries]);

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

  // Funkcja do określenia statusu wizualnego na podstawie obliczonego statusu
  const getOrderStatusIcon = (status: OrderStats['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'excess':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getOrderStatusLabel = (status: OrderStats['status']) => {
    switch (status) {
      case 'complete': return 'Kompletne';
      case 'partial': return 'Częściowe';
      case 'pending': return 'Oczekuje';
      case 'excess': return 'Nadmiar';
      default: return status;
    }
  };

  const getOrderStatusColor = (status: OrderStats['status']) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-700';
      case 'partial': return 'bg-yellow-100 text-yellow-700';
      case 'pending': return 'bg-blue-100 text-blue-700';
      case 'excess': return 'bg-orange-100 text-orange-700';
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

            {/* Tabela zamówień do szklarni - pogrupowane */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Zamówienia do szklarni - status realizacji
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderStats.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orderStats.map((orderStat) => {
                      const isExpanded = expandedOrders.has(orderStat.glassOrderNumber);
                      const progressPercent = orderStat.orderedCount > 0
                        ? Math.min((orderStat.deliveredCount / orderStat.orderedCount) * 100, 100)
                        : 0;
                      return (
                        <div key={orderStat.glassOrderNumber} className="border rounded-lg overflow-hidden">
                          {/* Nagłówek - klikalny */}
                          <button
                            onClick={() => toggleOrderExpanded(orderStat.glassOrderNumber)}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-500" />
                              )}
                              <div>
                                <span className="font-medium font-mono text-sm">
                                  {orderStat.glassOrderNumber}
                                </span>
                                <span className="text-xs text-slate-500 ml-2">
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
