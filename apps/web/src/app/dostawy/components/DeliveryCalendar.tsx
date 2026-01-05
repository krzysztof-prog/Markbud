'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  BarChart3,
  Calendar,
  X,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/toast-helpers';
import { DayCell } from './DayCell';
import { WeekSummary } from './WeekSummary';
import type { Delivery } from '@/types/delivery';
import type {
  CalendarViewMode,
  DateRange,
  UseDeliveryStatsReturn,
} from '../hooks';

const DAY_NAMES = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Niedz'];

interface DeliveryCalendarProps {
  // Data
  continuousDays: Date[];
  viewMode: CalendarViewMode;
  dateRange: DateRange;
  weekOffset: number;

  // Loading/Error states
  isLoading: boolean;
  error: Error | null;

  // Statistics functions from useDeliveryStats
  stats: UseDeliveryStatsReturn;

  // Callbacks
  onGoToPrevious: () => void;
  onGoToNext: () => void;
  onGoToToday: () => void;
  onChangeViewMode: (mode: CalendarViewMode) => void;
  onDayClick: (date: Date) => void;
  onDayRightClick: (e: React.MouseEvent, date: Date) => void;
  onDeliveryClick: (delivery: Delivery) => void;
  onShowNewDeliveryDialog: () => void;
  onShowWindowStatsDialog: () => void;
  onShowBulkUpdateDatesDialog: () => void;
  onRefresh: () => void;
}

export function DeliveryCalendar({
  continuousDays,
  viewMode,
  dateRange,
  weekOffset,
  isLoading,
  error,
  stats,
  onGoToPrevious,
  onGoToNext,
  onGoToToday,
  onChangeViewMode,
  onDayClick,
  onDayRightClick,
  onDeliveryClick,
  onShowNewDeliveryDialog,
  onShowWindowStatsDialog,
  onShowBulkUpdateDatesDialog,
  onRefresh,
}: DeliveryCalendarProps) {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <Card>
        <CardHeader className="space-y-4">
          {/* Navigation header */}
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onGoToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">
                {dateRange.startOfWeek.toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                })}{' '}
                -{' '}
                {dateRange.endDate.toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                })}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={onGoToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="ghost" size="sm" onClick={onGoToToday}>
                  Dzisiaj
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onShowWindowStatsDialog}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Statystyki okien
              </Button>
              <Button variant="outline" onClick={onShowBulkUpdateDatesDialog}>
                <Calendar className="h-4 w-4 mr-2" />
                Zmien daty
              </Button>
              <Button onClick={onShowNewDeliveryDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nowa dostawa
              </Button>
            </div>
          </div>

          {/* View mode buttons */}
          <div className="flex items-center gap-2 border-t pt-4">
            <span className="text-sm text-slate-500 mr-2">Widok:</span>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChangeViewMode('week')}
            >
              Tydzien
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChangeViewMode('month')}
            >
              Miesiac
            </Button>
            <Button
              variant={viewMode === '8weeks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChangeViewMode('8weeks')}
            >
              8 tygodni
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} columns={7} />
          ) : error ? (
            <CalendarErrorState error={error} onRetry={onRefresh} />
          ) : (
            <CalendarGrid
              continuousDays={continuousDays}
              viewMode={viewMode}
              stats={stats}
              onDayClick={onDayClick}
              onDayRightClick={onDayRightClick}
              onDeliveryClick={onDeliveryClick}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Error state component
function CalendarErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-red-600 mb-2">
        <X className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        Blad wczytywania danych
      </h3>
      <p className="text-sm text-slate-500 max-w-md">{getErrorMessage(error)}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        Sprobuj ponownie
      </Button>
    </div>
  );
}

// Calendar grid component
interface CalendarGridProps {
  continuousDays: Date[];
  viewMode: CalendarViewMode;
  stats: UseDeliveryStatsReturn;
  onDayClick: (date: Date) => void;
  onDayRightClick: (e: React.MouseEvent, date: Date) => void;
  onDeliveryClick: (delivery: Delivery) => void;
}

function CalendarGrid({
  continuousDays,
  viewMode,
  stats,
  onDayClick,
  onDayRightClick,
  onDeliveryClick,
}: CalendarGridProps) {
  if (viewMode === 'week') {
    return (
      <WeekViewGrid
        continuousDays={continuousDays}
        stats={stats}
        onDayClick={onDayClick}
        onDayRightClick={onDayRightClick}
        onDeliveryClick={onDeliveryClick}
      />
    );
  }

  return (
    <MonthViewGrid
      continuousDays={continuousDays}
      stats={stats}
      onDayClick={onDayClick}
      onDayRightClick={onDayRightClick}
      onDeliveryClick={onDeliveryClick}
    />
  );
}

// Week view grid - 4 weeks with summaries after each
interface ViewGridProps {
  continuousDays: Date[];
  stats: UseDeliveryStatsReturn;
  onDayClick: (date: Date) => void;
  onDayRightClick: (e: React.MouseEvent, date: Date) => void;
  onDeliveryClick: (delivery: Delivery) => void;
}

function WeekViewGrid({
  continuousDays,
  stats,
  onDayClick,
  onDayRightClick,
  onDeliveryClick,
}: ViewGridProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, weekIndex) => {
        const weekStart = weekIndex * 7;
        const weekEnd = weekStart + 7;
        const weekDays = continuousDays.slice(weekStart, weekEnd);

        if (weekDays.length === 0) return null;

        const weekStats = stats.getWeekStats(weekDays);
        const weekStartDate = weekDays[0];
        const weekEndDate = weekDays[weekDays.length - 1];

        return (
          <div key={weekIndex}>
            {/* Grid for week */}
            <div
              className="grid gap-1 mb-2"
              style={{ gridTemplateColumns: 'repeat(5, 1fr) repeat(2, 0.5fr)' }}
            >
              {/* Day headers */}
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-slate-500 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Week days */}
              {weekDays.map((date) => {
                const dayDeliveries = stats.getDeliveriesForDay(date);
                const dayStats = stats.getDayStats(date);
                const holidayInfo = stats.getHolidayInfo(date);
                const nonWorkingDay = stats.isNonWorkingDay(date);
                const holidayNonWorking = stats.isHolidayNonWorking(date, holidayInfo);
                const isToday = stats.isToday(date);
                const isWeekend = stats.isWeekend(date);

                return (
                  <DayCell
                    key={date.toISOString()}
                    date={date}
                    dayDeliveries={dayDeliveries}
                    dayStats={dayStats}
                    holidayInfo={holidayInfo}
                    isNonWorkingDay={nonWorkingDay}
                    isHolidayNonWorking={holidayNonWorking}
                    isToday={isToday}
                    isWeekend={isWeekend}
                    onDayClick={onDayClick}
                    onDayRightClick={onDayRightClick}
                    onDeliveryClick={onDeliveryClick}
                  />
                );
              })}
            </div>

            {/* Week summary */}
            <WeekSummary
              weekIndex={weekIndex}
              weekStartDate={weekStartDate}
              weekEndDate={weekEndDate}
              weekStats={weekStats}
              variant="green"
            />
          </div>
        );
      })}
    </div>
  );
}

// Month/8weeks view grid
function MonthViewGrid({
  continuousDays,
  stats,
  onDayClick,
  onDayRightClick,
  onDeliveryClick,
}: ViewGridProps) {
  // Split days into weeks for summary
  const weeks: Date[][] = [];
  for (let i = 0; i < continuousDays.length; i += 7) {
    weeks.push(continuousDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-4">
      {/* Calendar grid */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: 'repeat(5, 1fr) repeat(2, 0.5fr)' }}
      >
        {/* Day headers */}
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-slate-500 py-2"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {continuousDays.map((date) => {
          const dayDeliveries = stats.getDeliveriesForDay(date);
          const dayStats = stats.getDayStats(date);
          const holidayInfo = stats.getHolidayInfo(date);
          const nonWorkingDay = stats.isNonWorkingDay(date);
          const holidayNonWorking = stats.isHolidayNonWorking(date, holidayInfo);
          const isToday = stats.isToday(date);
          const isWeekend = stats.isWeekend(date);

          return (
            <DayCell
              key={date.toISOString()}
              date={date}
              dayDeliveries={dayDeliveries}
              dayStats={dayStats}
              holidayInfo={holidayInfo}
              isNonWorkingDay={nonWorkingDay}
              isHolidayNonWorking={holidayNonWorking}
              isToday={isToday}
              isWeekend={isWeekend}
              onDayClick={onDayClick}
              onDayRightClick={onDayRightClick}
              onDeliveryClick={onDeliveryClick}
            />
          );
        })}
      </div>

      {/* Week summaries */}
      <div className="space-y-3 mt-6">
        <div className="text-base font-bold text-slate-800 mb-3">
          Podsumowanie tygodniowe
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeks.map((week, idx) => {
            const weekStats = stats.getWeekStats(week);
            const weekStart = week[0];
            const weekEnd = week[week.length - 1];

            return (
              <WeekSummary
                key={idx}
                weekIndex={idx}
                weekStartDate={weekStart}
                weekEndDate={weekEnd}
                weekStats={weekStats}
                variant="blue"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DeliveryCalendar;
