'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { usePalletMonth } from '../hooks/usePalletStock';
import { PALLET_TYPE_LABELS, PALLET_TYPES } from '../types/index';

// Nazwy miesięcy po polsku
const MONTH_NAMES = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

interface PalletMonthViewProps {
  initialYear?: number;
  initialMonth?: number;
}

/**
 * Widok miesięczny dla modułu paletówek
 * Wyświetla podsumowanie per typ: Stan 1-szy | Suma użyte | Suma zrobione | Stan końcowy | Bilans
 */
export const PalletMonthView: React.FC<PalletMonthViewProps> = ({
  initialYear,
  initialMonth,
}) => {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);

  // Query
  const { data: monthData, isLoading, error } = usePalletMonth(year, month);

  // Przekształć dane miesiąca do formatu tabeli
  const summaryRows = useMemo(() => {
    if (!monthData) return [];

    return PALLET_TYPES.map((type) => ({
      type,
      firstDayStock: monthData.startStocks[type] ?? 0,
      totalUsed: monthData.totalUsed[type] ?? 0,
      totalProduced: monthData.totalProduced[type] ?? 0,
      lastDayStock: monthData.endStocks[type] ?? 0,
      netBalance: (monthData.totalProduced[type] ?? 0) - (monthData.totalUsed[type] ?? 0),
    }));
  }, [monthData]);

  // Nawigacja między miesiącami
  const handlePrevMonth = useCallback(() => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month]);

  const handleNextMonth = useCallback(() => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }, [month]);

  const handleCurrentMonth = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  // Czy to bieżący miesiąc
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  }, [year, month]);

  // Liczba dni z alertami jest dostępna z monthData
  const daysWithAlerts = monthData?.daysWithAlerts ?? 0;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-500">
          Błąd ładowania danych: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Nawigacja i miesiąc */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                aria-label="Poprzedni miesiąc"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                aria-label="Następny miesiąc"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <CardTitle
              className={cn(
                'text-base md:text-lg',
                isCurrentMonth && 'text-blue-600'
              )}
            >
              {MONTH_NAMES[month - 1]} {year}
            </CardTitle>
          </div>

          {/* Przycisk bieżącego miesiąca i badge */}
          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <Button variant="outline" size="sm" onClick={handleCurrentMonth}>
                Bieżący miesiąc
              </Button>
            )}

            {daysWithAlerts > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {daysWithAlerts} dni z alertami
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Tabela podsumowania */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Typ</TableHead>
                    <TableHead className="text-center">Stan 1-szy</TableHead>
                    <TableHead className="text-center">Suma użyte</TableHead>
                    <TableHead className="text-center">Suma zrobione</TableHead>
                    <TableHead className="text-center">Stan końcowy</TableHead>
                    <TableHead className="text-center">Bilans netto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map((summary) => (
                    <TableRow key={summary.type}>
                      <TableCell className="font-medium">
                        {PALLET_TYPE_LABELS[summary.type]}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {summary.firstDayStock}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-red-600">
                        -{summary.totalUsed}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-green-600">
                        +{summary.totalProduced}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium">
                        {summary.lastDayStock}
                      </TableCell>
                      <TableCell className="text-center">
                        <NetBalanceBadge balance={summary.netBalance} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Info o dniach z alertami */}
            {daysWithAlerts > 0 && (
              <div className="mt-6 bg-red-50 p-3 rounded-md border border-red-100">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    W tym miesiącu wystąpiło <strong>{daysWithAlerts}</strong>{' '}
                    {daysWithAlerts === 1
                      ? 'dzień'
                      : daysWithAlerts < 5
                        ? 'dni'
                        : 'dni'}{' '}
                    z alertami o niskim stanie palet.
                  </span>
                </div>
              </div>
            )}

            {/* Info gdy brak danych */}
            {summaryRows.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Brak danych dla tego miesiąca
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Komponent wyświetlający bilans netto z odpowiednim kolorem i ikoną
 */
const NetBalanceBadge: React.FC<{ balance: number }> = ({ balance }) => {
  if (balance > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 font-medium">
        <TrendingUp className="h-3 w-3" />
        +{balance}
      </span>
    );
  }
  if (balance < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
        <TrendingDown className="h-3 w-3" />
        {balance}
      </span>
    );
  }
  return <span className="text-muted-foreground">0</span>;
};

export default PalletMonthView;
