'use client';

/**
 * New Operator Dashboard - Dashboard operatora z prawdziwymi danymi
 *
 * Ulepszenia vs stary dashboard:
 * - Prawdziwe dane z API (nie mock)
 * - Przelacznik "Tylko moje zlecenia" (dla KIEROWNIK+)
 * - Sekcja krytycznych alertow na gorze
 * - Karta % kompletnosci
 * - Interaktywne karty z linkami
 *
 * Filtrowanie:
 * - USER widzi tylko swoje zlecenia (documentAuthorUserId)
 * - KIEROWNIK+ moze przelaczac miedzy swoimi a wszystkimi
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  GlassWater,
  Wrench,
  ArrowRight,
  Clock,
  Inbox,
  Calendar,
  TrendingUp,
  Package,
} from 'lucide-react';
import {
  useOperatorDashboard,
  useOperatorDashboardFilter,
  calculateCompletenessPercent,
  countProblems,
} from '../hooks/useOperatorDashboard';
import type { OperatorAlert, RecentActivity } from '../api/operatorDashboardApi';

// =====================================================
// Helper Components
// =====================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <Skeleton className="h-24 w-full rounded-lg" />
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      {/* Content skeleton */}
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

function AlertIcon({ type }: { type: OperatorAlert['type'] }) {
  switch (type) {
    case 'pending_conflict':
      return <AlertCircle className="h-5 w-5" />;
    case 'missing_glass':
      return <GlassWater className="h-5 w-5" />;
    case 'missing_hardware':
      return <Wrench className="h-5 w-5" />;
    case 'missing_files':
      return <FileText className="h-5 w-5" />;
    default:
      return <AlertTriangle className="h-5 w-5" />;
  }
}

function ActivityIcon({ type }: { type: RecentActivity['type'] }) {
  switch (type) {
    case 'order_created':
      return <Package className="h-4 w-4 text-blue-500" />;
    case 'glass_status_changed':
      return <GlassWater className="h-4 w-4 text-cyan-500" />;
    case 'hardware_status_changed':
      return <Wrench className="h-4 w-4 text-orange-500" />;
    case 'delivery_assigned':
      return <Calendar className="h-4 w-4 text-green-500" />;
    default:
      return <Clock className="h-4 w-4 text-slate-400" />;
  }
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =====================================================
// Main Component
// =====================================================

export function NewOperatorDashboard() {
  const { filterByUser, setFilterByUser, canToggle } = useOperatorDashboardFilter();
  const { data, isLoading, error } = useOperatorDashboard({ filterByUser });

  // WSZYSTKIE HOOKI MUSZĄ BYĆ PRZED WARUNKOWYMI RETURN - Rules of Hooks!
  // Memoizowane obliczenia - unikamy przeliczania przy kazdym renderze
  const completenessPercent = useMemo(() => calculateCompletenessPercent(data), [data]);
  const problemsCount = useMemo(() => countProblems(data), [data]);

  // Rozdziel alerty na krytyczne i pozostale (memoizowane)
  const { criticalAlerts, otherAlerts } = useMemo(() => {
    if (!data) return { criticalAlerts: [], otherAlerts: [] };
    return {
      criticalAlerts: data.alerts.filter((a) => a.priority === 'critical'),
      otherAlerts: data.alerts.filter((a) => a.priority !== 'critical'),
    };
  }, [data]);

  // Oblicz procenty i brakujace (memoizowane)
  const computedStats = useMemo(() => {
    if (!data) {
      return {
        filesPercent: 0,
        glassPercent: 0,
        hardwarePercent: 0,
        missingFiles: 0,
        missingGlass: 0,
        missingHardware: 0,
      };
    }
    const { stats } = data;
    const filesPercent =
      stats.totalOrders > 0 ? Math.round((stats.withFiles / stats.totalOrders) * 100) : 0;
    const glassPercent =
      stats.totalOrders > 0 ? Math.round((stats.withGlass / stats.totalOrders) * 100) : 0;
    const hardwarePercent =
      stats.totalOrders > 0 ? Math.round((stats.withHardware / stats.totalOrders) * 100) : 0;

    return {
      filesPercent,
      glassPercent,
      hardwarePercent,
      missingFiles: stats.totalOrders - stats.withFiles,
      missingGlass: stats.totalOrders - stats.withGlass,
      missingHardware: stats.totalOrders - stats.withHardware,
    };
  }, [data]);

  const { filesPercent, glassPercent, hardwarePercent, missingFiles, missingGlass, missingHardware } = computedStats;

  // Warunkowe return DOPIERO PO wszystkich hookach
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-6 w-6" />
              <div>
                <p className="font-semibold">Błąd ładowania dashboard</p>
                <p className="text-sm">{error?.message || 'Nie udało się pobrać danych'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, stats, recentActivity, pendingConflictsCount } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Sekcja powitania z przelacznikiem */}
      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.5rem' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Witaj, {user.name}!
            </h2>
            <p style={{ color: '#94a3b8' }}>
              {filterByUser ? 'Twoje' : 'Wszystkie'} aktywne zlecenia: {stats.totalOrders}.{' '}
              {stats.readyForProduction} gotowych do produkcji.
            </p>
          </div>
          {canToggle && (
            <div style={{ backgroundColor: '#334155', padding: '0.5rem 1rem', borderRadius: '0.5rem' }} className="flex items-center gap-3">
              <span style={{ color: '#ffffff', fontSize: '0.875rem' }}>Tylko moje zlecenia</span>
              <Switch
                checked={filterByUser}
                onCheckedChange={setFilterByUser}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sekcja krytycznych alertow (na gorze) */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex-shrink-0 text-red-600">
                <AlertIcon type={alert.type} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900">{alert.message}</p>
                <p className="text-sm text-red-700">Wymagana natychmiastowa akcja</p>
              </div>
              <Link href={alert.actionUrl}>
                <Button variant="destructive" size="sm">
                  Rozwiąż
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 4 karty statystyk */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Aktywne zlecenia */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Inbox className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktywne zlecenia</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gotowe do produkcji */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">Gotowe do produkcji</p>
                <p className="text-2xl font-bold text-green-900">{stats.readyForProduction}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Problemy do rozwiazania */}
        <Card className={problemsCount > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  problemsCount > 0 ? 'bg-orange-100' : 'bg-slate-100'
                }`}
              >
                <AlertTriangle
                  className={`h-6 w-6 ${problemsCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}
                />
              </div>
              <div>
                <p className={`text-sm ${problemsCount > 0 ? 'text-orange-700' : 'text-muted-foreground'}`}>
                  Problemy
                </p>
                <p className={`text-2xl font-bold ${problemsCount > 0 ? 'text-orange-900' : ''}`}>
                  {problemsCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* % kompletnosci */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kompletność</p>
                <p className="text-2xl font-bold">{completenessPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dwie kolumny: Kompletnosc + Alerty/Aktywnosc */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Kompletnosc zlecen */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Kompletność zleceń</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pliki */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Pliki Schüco</span>
                </div>
                <span className="text-sm">
                  {stats.withFiles} / {stats.totalOrders} ({filesPercent}%)
                </span>
              </div>
              <Progress value={filesPercent} className="h-2" />
              {missingFiles > 0 && (
                <p className="text-xs text-muted-foreground">
                  {missingFiles} zleceń bez plików
                </p>
              )}
            </div>

            {/* Szyby */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GlassWater
                    className={`h-5 w-5 ${missingGlass > 0 ? 'text-orange-500' : 'text-blue-500'}`}
                  />
                  <span className="font-medium">Szyby</span>
                </div>
                <span className={`text-sm ${missingGlass > 0 ? 'text-orange-600' : ''}`}>
                  {stats.withGlass} / {stats.totalOrders} ({glassPercent}%)
                </span>
              </div>
              <Progress value={glassPercent} className="h-2" />
              {missingGlass > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-orange-600">{missingGlass} zleceń bez szyb</p>
                  <Link href="/zamowienia-szyb">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Zamów
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Okucia */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench
                    className={`h-5 w-5 ${missingHardware > 0 ? 'text-orange-500' : 'text-blue-500'}`}
                  />
                  <span className="font-medium">Okucia</span>
                </div>
                <span className={`text-sm ${missingHardware > 0 ? 'text-orange-600' : ''}`}>
                  {stats.withHardware} / {stats.totalOrders} ({hardwarePercent}%)
                </span>
              </div>
              <Progress value={hardwarePercent} className="h-2" />
              {missingHardware > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-orange-600">{missingHardware} zleceń bez okuć</p>
                  <Link href="/magazyn/okuc/zapotrzebowanie">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Sprawdź
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Gotowe do produkcji */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">
                    {stats.readyForProduction} gotowych do produkcji
                  </p>
                  <p className="text-sm text-green-700">Wszystkie materiały skompletowane</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prawa kolumna: Alerty + Ostatnie dzialania */}
        <div className="space-y-6">
          {/* Problemy do rozwiazania */}
          {otherAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Problemy do rozwiązania</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      alert.priority === 'high'
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 ${
                        alert.priority === 'high' ? 'text-orange-600' : 'text-slate-500'
                      }`}
                    >
                      <AlertIcon type={alert.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.message}</p>
                    </div>
                    <Link href={alert.actionUrl}>
                      <Button size="sm" variant="ghost" className="h-8 px-2">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Ostatnie dzialania */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Ostatnie działania</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Brak ostatnich działań
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
                    >
                      <div className="mt-0.5">
                        <ActivityIcon type={activity.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Szybkie akcje */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/dostawy">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Kalendarz dostaw</p>
                  <p className="text-sm text-muted-foreground">Sprawdź nadchodzące dostawy</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/zamowienia-szyb">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                  <GlassWater className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <p className="font-semibold">Zamówienia szyb</p>
                  <p className="text-sm text-muted-foreground">Zamów brakujące szyby</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/moja-praca">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    pendingConflictsCount > 0 ? 'bg-red-100' : 'bg-green-100'
                  }`}
                >
                  <Inbox
                    className={`h-6 w-6 ${
                      pendingConflictsCount > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  />
                </div>
                <div>
                  <p className="font-semibold">Moja Praca</p>
                  <p className="text-sm text-muted-foreground">
                    {pendingConflictsCount > 0
                      ? `${pendingConflictsCount} konfliktów do rozwiązania`
                      : 'Brak konfliktów'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default NewOperatorDashboard;
