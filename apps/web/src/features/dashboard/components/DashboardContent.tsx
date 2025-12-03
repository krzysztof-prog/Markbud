/**
 * Dashboard Content - główny komponent dashboard
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { DashboardSkeleton } from '@/components/loaders/DashboardSkeleton';
import {
  Package,
  Truck,
  AlertTriangle,
  FileUp,
  ArrowRight,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { useDashboard, useAlerts, useWeeklyStats } from '../hooks/useDashboard';
import type { Import, Delivery, Alert } from '@/types';

export function DashboardContent() {
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: weeklyStats, isLoading: weeklyStatsLoading } = useWeeklyStats();

  if (dashboardLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" alertsCount={0} />
        <DashboardSkeleton />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" alertsCount={0} />
        <div className="flex-1 flex items-center justify-center">
          <p>Nie udało się załadować danych dashboard</p>
        </div>
      </div>
    );
  }

  const stats = dashboard.stats;

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
              {dashboard.pendingImports.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.pendingImports.slice(0, 5).map((imp: Import) => (
                    <div
                      key={imp.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileUp className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{imp.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(imp.uploadedAt || imp.createdAt)}
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
              {alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert: Alert) => (
                    <div
                      key={alert.id}
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
                        {alert.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.details}
                          </p>
                        )}
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

        {/* Podsumowanie tygodniowe - 8 tygodni */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Podsumowanie dostaw - następne 8 tygodni
            </CardTitle>
            <Link href="/dostawy">
              <Button variant="ghost" size="sm">
                Kalendarz dostaw
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {weeklyStatsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : weeklyStats && weeklyStats.weeks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {weeklyStats.weeks.map((week) => {
                  const weekStart = week.startDate ? new Date(week.startDate) : null;
                  const weekEnd = week.endDate ? new Date(week.endDate) : null;
                  const hasData = week.windows > 0 || week.sashes > 0 || week.glasses > 0;

                  return (
                    <div
                      key={week.weekNumber}
                      className={`border rounded-lg p-3 transition-colors ${
                        hasData
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="text-xs text-slate-600 mb-2">
                        <div className="font-semibold">
                          Tydzień {week.weekNumber}
                        </div>
                        {weekStart && weekEnd && (
                          <div className="text-xs">
                            {weekStart.toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            -{' '}
                            {weekEnd.toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        )}
                      </div>
                      {hasData ? (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <div className="text-slate-600">Okna</div>
                            <div className="text-lg font-bold text-blue-700">
                              {week.windows}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-600">Skrzydła</div>
                            <div className="text-lg font-bold text-blue-700">
                              {week.sashes}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-600">Szyby</div>
                            <div className="text-lg font-bold text-blue-700">
                              {week.glasses}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 text-center py-4">
                          Brak dostaw
                        </div>
                      )}
                      {week.deliveriesCount > 0 && (
                        <div className="text-xs text-slate-500 mt-2 text-center">
                          {week.deliveriesCount}{' '}
                          {week.deliveriesCount === 1
                            ? 'dostawa'
                            : week.deliveriesCount < 5
                            ? 'dostawy'
                            : 'dostaw'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak danych o dostawach
              </p>
            )}
          </CardContent>
        </Card>

        {/* Nadchodzące dostawy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Nadchodzące dostawy (7 dni)</CardTitle>
            <Link href="/dostawy">
              <Button variant="ghost" size="sm">
                Kalendarz dostaw
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboard.upcomingDeliveries.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {dashboard.upcomingDeliveries.map((delivery: Delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{formatDate(delivery.deliveryDate)}</p>
                      <p className="text-sm text-muted-foreground">
                        {delivery.orders?.length || 0} zleceń
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      W tyg. {delivery.weekNumber}
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
