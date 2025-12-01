'use client';

import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { settingsApi, ordersApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Download, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/loaders/DashboardSkeleton';
import { toast } from '@/hooks/useToast';
import { useState } from 'react';

export default function ZestawieniaPage() {
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getAll(),
  });

  if (ordersError) {
    toast({
      title: 'Błąd wczytywania danych',
      description: 'Nie udało się załadować zestawień',
      variant: 'destructive',
    });
  }

  // Obliczenia statystyk
  const stats = {
    totalOrders: orders?.length || 0,
    completedOrders: orders?.filter((o: any) => o.status === 'completed' || o.archivedAt).length || 0,
    activeOrders: orders?.filter((o: any) => o.status !== 'completed' && !o.archivedAt).length || 0,
    totalValuePln: orders?.reduce((sum: number, o: any) => sum + (parseFloat(o.valuePln) || 0), 0) || 0,
    totalValueEur: orders?.reduce((sum: number, o: any) => sum + (parseFloat(o.valueEur) || 0), 0) || 0,
    totalWindows: orders?.reduce((sum: number, o: any) => sum + (o.totalWindows || o._count?.windows || 0), 0) || 0,
  };

  const handleExportCsv = async () => {
    try {
      if (!orders) return;

      const headers = ['Nr zlecenia', 'Data', 'Klient', 'Projekt', 'System', 'Okna', 'Wartość PLN', 'Wartość EUR', 'Status'];
      const rows = orders.map((order: any) => [
        order.orderNumber,
        formatDate(order.createdAt),
        order.client || '-',
        order.project || '-',
        order.system || '-',
        order.totalWindows || order._count?.windows || 0,
        parseFloat(order.valuePln || 0).toFixed(2),
        parseFloat(order.valueEur || 0).toFixed(2),
        order.status,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `zestawienie-zlecen-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: 'Eksport pomyślny',
        description: 'Plik CSV został pobrany',
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się wyeksportować pliku';
      setExportError(message);
      toast({
        title: 'Błąd eksportu',
        description: message,
        variant: 'destructive',
      });
    }
  };

  if (ordersLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Zestawienia" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <Breadcrumb
          items={[
            { label: 'Zestawienia', icon: <TrendingUp className="h-4 w-4" /> },
          ]}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Wszystkie zlecenia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.completedOrders} ukończonych, {stats.activeOrders} aktywnych
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Wartość PLN</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(stats.totalValuePln, 'PLN')}</div>
              <p className="text-xs text-slate-500 mt-1">Ączna wartość zleceń</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Wartość EUR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(stats.totalValueEur, 'EUR')}</div>
              <p className="text-xs text-slate-500 mt-1">Ączna wartość zleceń</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Okna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalWindows}</div>
              <p className="text-xs text-slate-500 mt-1">Ączna ilość okien/drzwi</p>
            </CardContent>
          </Card>
        </div>

        {/* Akcje */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eksport i analiza</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExportCsv} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Eksportuj do CSV
              </Button>
              <Link href="/zestawienia/zlecenia">
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Szczegółowe zestawienie zleceń
                </Button>
              </Link>
            </div>
            {exportError && (
              <p className="text-sm text-red-600">Błąd: {exportError}</p>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>Informacja:</strong> Tutaj znajdziesz podsumowanie wszystkich zleceń, statystyki i możliwość eksportu danych do pliku CSV.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
