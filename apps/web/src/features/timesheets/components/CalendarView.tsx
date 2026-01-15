'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCalendarSummary } from '../hooks/useTimesheets';
import type { DayStatus } from '../types';
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  getCalendarDays,
  getPrevMonth,
  getNextMonth,
  formatDateISO,
  isToday,
  isWeekend,
} from '../helpers/dateHelpers';

interface CalendarViewProps {
  onDaySelect: (date: string) => void;
  selectedDate?: string;
}

// Kolory statusów dnia
const STATUS_COLORS: Record<DayStatus, string> = {
  empty: 'bg-gray-100 hover:bg-gray-200',
  partial: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-400',
  complete: 'bg-green-100 hover:bg-green-200 border-green-400',
};

const STATUS_DOT_COLORS: Record<DayStatus, string> = {
  empty: 'bg-gray-400',
  partial: 'bg-yellow-500',
  complete: 'bg-green-500',
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  onDaySelect,
  selectedDate,
}) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // Pobieranie danych kalendarza
  const { data: calendarData, isLoading } = useCalendarSummary(year, month);

  // Mapa statusów dni
  const dayStatusMap = useMemo(() => {
    const map = new Map<string, DayStatus>();
    if (calendarData?.days) {
      calendarData.days.forEach((day) => {
        map.set(day.date.split('T')[0], day.status);
      });
    }
    return map;
  }, [calendarData]);

  // Dni kalendarza
  const calendarDays = useMemo(
    () => getCalendarDays(year, month),
    [year, month]
  );

  // Nawigacja
  const handlePrevMonth = useCallback(() => {
    const { year: newYear, month: newMonth } = getPrevMonth(year, month);
    setYear(newYear);
    setMonth(newMonth);
  }, [year, month]);

  const handleNextMonth = useCallback(() => {
    const { year: newYear, month: newMonth } = getNextMonth(year, month);
    setYear(newYear);
    setMonth(newMonth);
  }, [year, month]);

  const handleToday = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    onDaySelect(formatDateISO(now));
  }, [onDaySelect]);

  const handleDayClick = useCallback(
    (date: Date, isCurrentMonth: boolean) => {
      if (!isCurrentMonth) return;
      onDaySelect(formatDateISO(date));
    },
    [onDaySelect]
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            {MONTH_NAMES[month - 1]} {year}
          </CardTitle>
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
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="text-xs"
            >
              Dziś
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
        </div>
      </CardHeader>

      <CardContent>
        {/* Nagłówki dni tygodnia */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_SHORT.slice(1).map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
          <div className="text-center text-xs font-medium text-muted-foreground py-1">
            {WEEKDAY_SHORT[0]}
          </div>
        </div>

        {/* Dni kalendarza */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const dateStr = formatDateISO(date);
            const status = dayStatusMap.get(dateStr) ?? 'empty';
            const isTodayDate = isToday(date);
            const isWeekendDay = isWeekend(date);
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={index}
                onClick={() => handleDayClick(date, isCurrentMonth)}
                disabled={!isCurrentMonth}
                className={cn(
                  'relative aspect-square rounded-md text-sm font-medium transition-colors',
                  'flex flex-col items-center justify-center',
                  !isCurrentMonth && 'text-gray-300 cursor-not-allowed',
                  isCurrentMonth && STATUS_COLORS[status],
                  isCurrentMonth && isWeekendDay && 'text-red-600',
                  isSelected && 'ring-2 ring-blue-500 ring-offset-1',
                  isTodayDate && 'font-bold'
                )}
              >
                <span>{date.getDate()}</span>
                {/* Kropka statusu */}
                {isCurrentMonth && status !== 'empty' && (
                  <span
                    className={cn(
                      'absolute bottom-1 w-1.5 h-1.5 rounded-full',
                      STATUS_DOT_COLORS[status]
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS.complete)} />
            <span>Kompletny</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS.partial)} />
            <span>Częściowy</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS.empty)} />
            <span>Pusty</span>
          </div>
        </div>

        {/* Info o liczbie pracowników */}
        {calendarData && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            Aktywni pracownicy: {calendarData.totalActiveWorkers}
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarView;
