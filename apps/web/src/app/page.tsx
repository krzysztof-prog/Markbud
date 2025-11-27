'use client';

import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboardApi, importsApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { DashboardSkeleton } from '@/components/loaders/DashboardSkeleton';
import {
  Package,
  Truck,
  AlertTriangle,
  FileUp,
  ArrowRight,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
  });

  const { data: alerts = [], error: alertsError } = useQuery({
    queryKey: ['alerts'],
    queryFn: dashboardApi.getAlerts,
  });

  // Show error toasts
  if (error) {
    showErrorToast('Błąd ładowania danych', getErrorMessage(error));
  }
  if (alertsError) {
    showErrorToast('Błąd ładowania alertów', getErrorMessage(alertsError));
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" alertsCount={0} />
        <DashboardSkeleton />
      </div>
    );
  }

  const stats = dashboard?.stats || {
    activeOrders: 0,
    upcomingDeliveriesCount: 0,
    pendingImportsCount: 0,
    shortagesCount: 0,
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" alertsCount={alerts?.length || 0} />

      <div className="flex-1 p-6 space-y-6">
        {/* Statystyki */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktywne zlecenia</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nadchodzące dostawy</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingDeliveriesCount}</div>
              <p className="text-xs text-muted-foreground">w ciągu 7 dni</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Oczekujące importy</CardTitle>
              <FileUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingImportsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Braki materiałów</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.shortagesCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Oczekujące importy */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Oczekujące importy</CardTitle>
              <Link href="/importy">
                <Button variant="ghost" size="sm">
                  Zobacz wszystkie
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {dashboard?.pendingImports?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.pendingImports.slice(0, 5).map((imp: any) => (
                    <div
                      key={imp.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileUp className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{imp.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(imp.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Link href={`/importy/${imp.id}`}>
                        <Button size="sm">Podgląd</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Brak oczekujących importów
                </p>
              )}
            </CardContent>
          </Card>

          {/* Alerty */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Alerty</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts?.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
                    >
                      <AlertTriangle
                        className={`h-5 w-5 mt-0.5 ${
                          alert.priority === 'critical'
                            ? 'text-red-500'
                            : alert.priority === 'high'
                            ? 'text-orange-500'
                            : 'text-yellow-500'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{alert.message}</p>
                          <Badge
                            variant={
                              alert.priority === 'critical'
                                ? 'destructive'
                                : alert.priority === 'high'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {alert.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Brak alertów
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Nadchodzące dostawy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Nadchodzące dostawy</CardTitle>
            <Link href="/dostawy">
              <Button variant="ghost" size="sm">
                Kalendarz dostaw
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboard?.upcomingDeliveries?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {dashboard.upcomingDeliveries.map((delivery: any) => (
                  <div
                    key={delivery.id}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{formatDate(delivery.date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {delivery.ordersCount} zleceń
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {delivery.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak nadchodzących dostaw
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
