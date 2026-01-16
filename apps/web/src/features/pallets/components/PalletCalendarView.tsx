'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePalletCalendar } from '../hooks/usePalletStock';
import type { CalendarDayStatus } from '../types/index';

// Nazwy miesięcy
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

// Skróty dni tygodnia (Pn-Nd)
const WEEKDAY_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

// Helpers do dat
const formatDateISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Generowanie dni kalendarza
const getCalendarDays = (
  year: number,
  month: number
): Array<{ date: Date; isCurrentMonth: boolean }> => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Pierwszy dzień tygodnia (0 = niedziela)
  let startDay = firstDay.getDay();
  // Przesuń na poniedziałek jako pierwszy dzień
  startDay = startDay === 0 ? 6 : startDay - 1;

  // Dni z poprzedniego miesiąca
  for (let i = startDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, -i);
    days.push({ date, isCurrentMonth: false });
  }

  // Dni z bieżącego miesiąca
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month - 1, i);
    days.push({ date, isCurrentMonth: true });
  }

  // Dni z następnego miesiąca (do pełnych 6 tygodni)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month, i);
    days.push({ date, isCurrentMonth: false });
  }

  return days;
};

// Kolory statusów dnia
const STATUS_COLORS: Record<CalendarDayStatus, string> = {
  empty: 'bg-gray-100 hover:bg-gray-200',
  open: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-400',
  closed: 'bg-green-100 hover:bg-green-200 border-green-400',
};

const STATUS_DOT_COLORS: Record<CalendarDayStatus, string> = {
  empty: 'bg-gray-400',
  open: 'bg-yellow-500',
  closed: 'bg-green-500',
};

interface PalletCalendarViewProps {
  onDaySelect: (date: string) => void;
  selectedDate?: string;
}

export const PalletCalendarView: React.FC<PalletCalendarViewProps> = ({
  onDaySelect,
  selectedDate,
}) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // Pobieranie danych kalendarza
  const { data: calendarData, isLoading } = usePalletCalendar(year, month);

  // Mapa statusów dni
  const dayStatusMap = useMemo(() => {
    const map = new Map<string, { status: CalendarDayStatus; hasAlerts: boolean }>();
    if (calendarData?.days) {
      calendarData.days.forEach((day) => {
        map.set(day.date, { status: day.status, hasAlerts: day.hasAlerts });
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
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }, [year, month]);

  const handleNextMonth = useCallback(() => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
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

  // Liczba dni zamkniętych
  const closedDaysCount = useMemo(() => {
    if (!calendarData?.days) return 0;
    return calendarData.days.filter((d) => d.status === 'closed').length;
  }, [calendarData]);

  // Liczba dni z alertami
  const alertDaysCount = useMemo(() => {
    if (!calendarData?.days) return 0;
    return calendarData.days.filter((d) => d.hasAlerts).length;
  }, [calendarData]);

  return (
    <Card className="w-full max-w-md relative">
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
        {/* Nagłówki dni tygodnia (Pn-Nd) */}
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
            const dayInfo = dayStatusMap.get(dateStr);
            const status = dayInfo?.status ?? 'empty';
            const hasAlerts = dayInfo?.hasAlerts ?? false;
            const isTodayDate = isToday(date);
            const isWeekendDay = isWeekend(date);
            const isSelected = selectedDate === dateStr;
            const isClosed = status === 'closed';

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
                {/* Ikona zamkniętego dnia */}
                {isCurrentMonth && isClosed && (
                  <Lock className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-green-600" />
                )}
                {/* Kropka alertu */}
                {isCurrentMonth && hasAlerts && (
                  <span
                    className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-500"
                  />
                )}
                {/* Kropka statusu (jeśli nie ma alertu) */}
                {isCurrentMonth && status !== 'empty' && !hasAlerts && (
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
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-green-600" />
            <span>Zamknięty</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS.open)} />
            <span>Otwarty</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Alert</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS.empty)} />
            <span>Pusty</span>
          </div>
        </div>

        {/* Podsumowanie */}
        {calendarData && (
          <div className="mt-2 text-center text-xs text-muted-foreground space-y-0.5">
            <div>Dni zamknięte: {closedDaysCount} / {calendarData.days.length}</div>
            {alertDaysCount > 0 && (
              <div className="text-red-600">Dni z alertami: {alertDaysCount}</div>
            )}
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PalletCalendarView;
