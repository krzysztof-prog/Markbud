'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { useWeeklyPlan } from '../../hooks/useWeeklyPlan';
import { DayColumn } from './DayColumn';
import { WeeklyPlanSummary } from './WeeklyPlanSummary';

interface WeeklyGlassPlanProps {
  onViewOrder: (id: number, num: string) => void;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}

export default function WeeklyGlassPlan({ onViewOrder }: WeeklyGlassPlanProps) {
  const {
    weekStart,
    weekEnd,
    weekOffset,
    data,
    isLoading,
    error,
    goToPrevious,
    goToNext,
    goToThisWeek,
  } = useWeeklyPlan();

  // Skróty klawiaturowe: ← poprzedni tydzień, → następny, T = ten tydzień
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Nie przechwytuj gdy użytkownik pisze w inpucie
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 't' || e.key === 'T') goToThisWeek();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goToPrevious, goToNext, goToThisWeek]);

  return (
    <div className="flex flex-col gap-4">
      {/* Nawigacja tygodniami */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium min-w-[180px] text-center">
            Tydzień {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
          </div>
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={goToThisWeek}>
              <CalendarDays className="h-4 w-4 mr-1" />
              Ten tydzień
            </Button>
          )}
        </div>
        {data && (
          <WeeklyPlanSummary
            weekTotalGlass={data.weekTotalGlass}
            weekTotalWindows={data.weekTotalWindows}
            weekTotalSashes={data.weekTotalSashes}
          />
        )}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Ładowanie planu tygodnia...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-red-600 text-sm">
          Błąd ładowania danych: {(error as Error).message}
        </div>
      )}

      {/* Grid dni (Pon-Pt) */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 min-h-[400px]">
          {data.days.map((day) => (
            <DayColumn key={day.date} day={day} onViewOrder={onViewOrder} />
          ))}
        </div>
      )}
    </div>
  );
}
