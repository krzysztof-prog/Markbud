'use client';

/**
 * Operator Dashboard - Checklist-based dashboard dla operatorów (USER)
 *
 * Pokazuje:
 * - Checklist kompletności zleceń (pliki, szyby, okucia)
 * - Akcje wymagające reakcji (⚠️)
 * - Ostatnie działania (audit log)
 *
 * Filtrowanie: Tylko zlecenia przypisane do użytkownika (documentAuthorUserId)
 */

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  GlassWater,
  Wrench,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

/**
 * Mock data - TODO: Zastąpić prawdziwym API
 */
interface CompletenessStats {
  totalOrders: number;
  withFiles: number;
  withGlass: number;
  withHardware: number;
  readyForProduction: number;
}

const mockStats: CompletenessStats = {
  totalOrders: 40,
  withFiles: 32,
  withGlass: 35,
  withHardware: 37,
  readyForProduction: 12,
};

const mockRecentActivity = [
  {
    id: 1,
    message: 'Dodano dostawę D-2024-123',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 2,
    message: 'Zamówiono szyby dla ZL-456',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: 3,
    message: 'Uzupełniono okucia dla ZL-789',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

export function OperatorDashboard() {
  const { user } = useAuth();

  const stats = mockStats;

  // Oblicz procenty
  const filesPercent = Math.round((stats.withFiles / stats.totalOrders) * 100);
  const glassPercent = Math.round((stats.withGlass / stats.totalOrders) * 100);
  const hardwarePercent = Math.round((stats.withHardware / stats.totalOrders) * 100);

  // Zlecenia wymagające akcji
  const missingFiles = stats.totalOrders - stats.withFiles;
  const missingGlass = stats.totalOrders - stats.withGlass;
  const missingHardware = stats.totalOrders - stats.withHardware;

  return (
    <div className="flex flex-col h-full">
      <Header title="Moje Zlecenia" alertsCount={0} />

      <div className="flex-1 p-6 space-y-6">
        {/* Powitanie */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            Witaj, {user?.name || 'Operator'}!
          </h2>
          <p className="text-blue-100">
            Masz {stats.totalOrders} aktywnych zleceń. {stats.readyForProduction} gotowych do produkcji.
          </p>
        </div>

        {/* Checklist kompletności */}
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
                  <div>
                    <p className="font-medium">Zlecenia z plikami</p>
                    <p className="text-sm text-muted-foreground">
                      Projekty, rysunki techniczne
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {stats.withFiles} / {stats.totalOrders}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {filesPercent}%
                  </p>
                </div>
              </div>
              <Progress value={filesPercent} className="h-2" />
              {missingFiles > 0 && (
                <p className="text-sm text-muted-foreground">
                  Brakuje plików w {missingFiles} zleceniach
                </p>
              )}
            </div>

            {/* Szyby */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GlassWater className={`h-5 w-5 ${missingGlass > 0 ? 'text-orange-500' : 'text-blue-500'}`} />
                  <div>
                    <p className="font-medium">Zlecenia z szybami</p>
                    <p className="text-sm text-muted-foreground">
                      Zamówione lub dostarczone
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${missingGlass > 0 ? 'text-orange-600' : ''}`}>
                    {stats.withGlass} / {stats.totalOrders}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {glassPercent}%
                  </p>
                </div>
              </div>
              <Progress value={glassPercent} className="h-2" />
              {missingGlass > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <p className="text-sm text-orange-800 font-medium">
                    {missingGlass} {missingGlass === 1 ? 'zlecenie wymaga' : 'zleceń wymaga'} zamówienia szyb
                  </p>
                  <Link href="/zamowienia-szyb" className="ml-auto">
                    <Button size="sm" variant="outline">
                      Zamów szyby
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Okucia */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className={`h-5 w-5 ${missingHardware > 0 ? 'text-orange-500' : 'text-blue-500'}`} />
                  <div>
                    <p className="font-medium">Zlecenia z okuciami</p>
                    <p className="text-sm text-muted-foreground">
                      Stan magazynu wystarczający
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${missingHardware > 0 ? 'text-orange-600' : ''}`}>
                    {stats.withHardware} / {stats.totalOrders}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hardwarePercent}%
                  </p>
                </div>
              </div>
              <Progress value={hardwarePercent} className="h-2" />
              {missingHardware > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <p className="text-sm text-orange-800 font-medium">
                    {missingHardware} {missingHardware === 1 ? 'zlecenie wymaga' : 'zleceń wymaga'} uzupełnienia okuć
                  </p>
                  <Link href="/magazyn/okuc/zapotrzebowanie" className="ml-auto">
                    <Button size="sm" variant="outline">
                      Sprawdź zapotrzebowanie
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
                    {stats.readyForProduction} {stats.readyForProduction === 1 ? 'zlecenie gotowe' : 'zleceń gotowych'} do produkcji
                  </p>
                  <p className="text-sm text-green-700">
                    Wszystkie materiały skompletowane
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Akcje szybkie */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dostawy">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Kalendarz dostaw</p>
                    <p className="text-sm text-muted-foreground">
                      Sprawdź nadchodzące dostawy
                    </p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/zamowienia-szyb">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                    <GlassWater className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Zamówienia szyb</p>
                    <p className="text-sm text-muted-foreground">
                      Zamów brakujące szyby
                    </p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/magazyn/okuc">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Wrench className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Magazyn okuć</p>
                    <p className="text-sm text-muted-foreground">
                      Sprawdź stan magazynu
                    </p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Ostatnie działania */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Ostatnie działania</CardTitle>
            <Link href="/archiwum">
              <Button variant="ghost" size="sm">
                Zobacz wszystkie
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockRecentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                >
                  <Clock className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OperatorDashboard;
