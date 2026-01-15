'use client';

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, Clock, Zap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDaySummary } from '../hooks/useTimesheets';
import type { DayStatus } from '../types';
import {
  formatDateLong,
  formatDateISO,
  parseDateISO,
  isToday,
  isWeekend,
  formatHours,
  WEEKDAY_NAMES,
} from '../helpers/dateHelpers';
import { WorkerEditPanel } from './WorkerEditPanel';
import { SetStandardDialog } from './SetStandardDialog';
import { SettingsPanel } from './SettingsPanel';

interface DayViewProps {
  date: string;
  onDateChange: (date: string) => void;
}

// Kolory statusów
const STATUS_BADGES: Record<DayStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  empty: { label: 'Pusty', variant: 'outline' },
  partial: { label: 'Częściowy', variant: 'secondary' },
  complete: { label: 'Kompletny', variant: 'default' },
};

export const DayView: React.FC<DayViewProps> = ({ date, onDateChange }) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [isSetStandardOpen, setIsSetStandardOpen] = useState(false);

  // Pobieranie danych dnia
  const { data: daySummary, isLoading, error } = useDaySummary(date);

  // Bezpieczny dostęp do workers - defensywne programowanie
  const workers = daySummary?.workers ?? [];
  const totals = daySummary?.totals ?? {
    entriesCount: 0,
    totalWorkers: 0,
    totalProductiveHours: 0,
    totalNonProductiveHours: 0,
  };
  const status = daySummary?.status ?? 'empty';

  // Nawigacja między dniami
  const handlePrevDay = useCallback(() => {
    const current = parseDateISO(date);
    current.setDate(current.getDate() - 1);
    onDateChange(formatDateISO(current));
  }, [date, onDateChange]);

  const handleNextDay = useCallback(() => {
    const current = parseDateISO(date);
    current.setDate(current.getDate() + 1);
    onDateChange(formatDateISO(current));
  }, [date, onDateChange]);

  const handleToday = useCallback(() => {
    onDateChange(formatDateISO(new Date()));
  }, [onDateChange]);

  // Wybór pracownika do edycji
  const handleWorkerSelect = useCallback((workerId: number) => {
    setSelectedWorkerId((prev) => (prev === workerId ? null : workerId));
  }, []);

  const handlePanelClose = useCallback(() => {
    setSelectedWorkerId(null);
  }, []);

  // Dane wybranego pracownika - bezpieczny dostęp
  const selectedWorkerData = workers.find(
    (w) => w.worker.id === selectedWorkerId
  );

  const dateObj = parseDateISO(date);
  const weekdayName = WEEKDAY_NAMES[dateObj.getDay()];
  const isTodayDate = isToday(date);
  const isWeekendDay = isWeekend(date);

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
    <div className="flex gap-4">
      {/* Główna kolumna - lista pracowników */}
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevDay}
                  aria-label="Poprzedni dzień"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextDay}
                  aria-label="Następny dzień"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <CardTitle
                  className={cn(
                    'text-lg',
                    isTodayDate && 'text-blue-600',
                    isWeekendDay && 'text-red-600'
                  )}
                >
                  {weekdayName}, {formatDateLong(date)}
                </CardTitle>
                {isTodayDate && (
                  <span className="text-xs text-blue-600">Dzisiaj</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isTodayDate && (
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Dziś
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsSetStandardOpen(true)}
                className="gap-1"
                disabled={workers.length === 0}
              >
                <Zap className="h-4 w-4" />
                Ustaw standardowy dzień
              </Button>
              <SettingsPanel
                trigger={
                  <Button variant="outline" size="sm" className="gap-1">
                    <Settings className="h-4 w-4" />
                    Ustawienia
                  </Button>
                }
              />
            </div>
          </div>

          {/* Status i podsumowanie */}
          {daySummary && (
            <div className="flex items-center gap-4 mt-2 text-sm">
              <Badge variant={STATUS_BADGES[status].variant}>
                {STATUS_BADGES[status].label}
              </Badge>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {totals.entriesCount} / {totals.totalWorkers}
                </span>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatHours(totals.totalProductiveHours)} prod. +{' '}
                  {formatHours(totals.totalNonProductiveHours)} nieprod.
                </span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : workers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="mb-4">Brak aktywnych pracowników</p>
              <SettingsPanel
                trigger={
                  <Button variant="default" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Dodaj pracowników w ustawieniach
                  </Button>
                }
              />
            </div>
          ) : (
            <TooltipProvider>
              <div className="border rounded-md overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-[200px]">
                        Pracownik
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground w-[100px]">
                        Stanowisko
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground w-[80px]">
                        Produkcja
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground w-[100px]">
                        Nieprodukcja
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground w-[70px]">
                        Suma
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((workerData) => {
                      const { worker, entry, totalHours, productiveHours, nonProductiveHours } = workerData;
                      const hasEntry = entry !== null;
                      const positionName = entry?.position?.name || worker.defaultPosition;
                      const isSelected = selectedWorkerId === worker.id;

                      return (
                        <tr
                          key={worker.id}
                          onClick={() => handleWorkerSelect(worker.id)}
                          className={cn(
                            'cursor-pointer transition-colors border-b last:border-b-0',
                            'hover:bg-muted/50',
                            isSelected && 'bg-blue-50',
                            !hasEntry && 'text-muted-foreground'
                          )}
                        >
                          <td className="px-4 py-2.5 text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full flex-shrink-0',
                                  hasEntry ? 'bg-green-500' : 'bg-gray-300'
                                )}
                              />
                              <span className={cn('font-medium', hasEntry && 'text-foreground')}>
                                {worker.firstName} {worker.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-center">
                            {hasEntry ? positionName : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-center">
                            <span className={cn(productiveHours > 0 && 'text-green-600 font-medium')}>
                              {formatHours(productiveHours)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-center">
                            <span className={cn(nonProductiveHours > 0 && 'text-orange-600 font-medium')}>
                              {formatHours(nonProductiveHours)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-center">
                            <span className={cn(
                              'font-medium',
                              totalHours > 0 && 'text-blue-600',
                              totalHours > 8 && 'text-purple-600'
                            )}>
                              {formatHours(totalHours)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Panel edycji pracownika */}
      {selectedWorkerId && selectedWorkerData && (
        <WorkerEditPanel
          date={date}
          workerData={selectedWorkerData}
          onClose={handlePanelClose}
        />
      )}

      {/* Dialog standardowego dnia */}
      <SetStandardDialog
        date={date}
        open={isSetStandardOpen}
        onOpenChange={setIsSetStandardOpen}
        workers={workers}
      />
    </div>
  );
};

export default DayView;
