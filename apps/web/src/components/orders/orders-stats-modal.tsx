'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { groszeToPln, type Grosze } from '@/lib/money';
import { FileText, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OrdersStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    totalOrders: number;
    totalValuePln: number;
    totalValueEur: number;
    totalWindows: number;
    totalSashes: number;
    totalGlasses: number;
  };
  allOrders: { status?: string; valuePln?: number }[];
  eurRate: number;
}

export const OrdersStatsModal = ({
  open,
  onOpenChange,
  stats,
  allOrders,
  eurRate,
}: OrdersStatsModalProps) => {
  // Obliczanie dodatkowych statystyk
  // Wartosci w bazie sa przechowywane jako grosze (integer)
  const ordersByStatus = React.useMemo(() => {
    const grouped: Record<string, { count: number; value: number }> = {};

    allOrders.forEach((order) => {
      const status = order.status || 'Brak statusu';
      if (!grouped[status]) {
        grouped[status] = { count: 0, value: 0 };
      }
      grouped[status].count++;
      // Konwertuj grosze na PLN dla wykresu
      const valueInGrosze = typeof order.valuePln === 'number' ? order.valuePln : 0;
      grouped[status].value += groszeToPln(valueInGrosze as Grosze);
    });

    return Object.entries(grouped).map(([status, data]) => ({
      status,
      count: data.count,
      value: data.value,
    }));
  }, [allOrders]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Statystyki zleceń</DialogTitle>
          <DialogDescription>
            Przegląd kluczowych metryk i wskaźników dla wszystkich zleceń
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Główne kafelki ze statystykami */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wszystkie zlecenia</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suma okien</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalWindows}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suma wartości (PLN)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalValuePln, 'PLN')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suma wartości (EUR)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalValueEur, 'EUR')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Kurs: {eurRate} PLN
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Wykresy */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Zlecenia wg statusu */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zlecenia wg statusu</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ordersByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Liczba zleceń" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Wartość zleceń wg statusu */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wartość zleceń wg statusu (PLN)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ordersByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value, 'PLN')} />
                    <Legend />
                    <Bar dataKey="value" fill="#10b981" name="Wartość (PLN)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Dodatkowe metryki */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Średnia wartość zlecenia (PLN)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    stats.totalOrders > 0 ? stats.totalValuePln / stats.totalOrders : 0,
                    'PLN'
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Suma skrzydeł</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSashes}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Suma szkleń</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGlasses}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrdersStatsModal;
