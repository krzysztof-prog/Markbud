'use client';

import { useState, useMemo, useCallback } from 'react';

export type CalendarViewMode = 'week' | 'month' | '8weeks';
export type PageViewMode = 'calendar' | 'list';

export interface DateRange {
  startOfWeek: Date;
  endDate: Date;
  totalDays: number;
}

export interface MonthToFetch {
  month: number;
  year: number;
}

export interface UseDeliveryFiltersReturn {
  // Page view state
  pageViewMode: PageViewMode;
  setPageViewMode: (mode: PageViewMode) => void;

  // Calendar view state
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;

  // Week navigation
  weekOffset: number;
  setWeekOffset: (offset: number) => void;

  // Computed date range
  dateRange: DateRange;

  // Generated days array
  continuousDays: Date[];

  // Months to fetch for API queries
  monthsToFetch: MonthToFetch[];

  // Navigation helpers
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;

  // View mode change with reset
  changeViewMode: (mode: CalendarViewMode) => void;
}

/**
 * Hook managing delivery calendar filtering, navigation and date calculations.
 *
 * Responsibilities:
 * - Page view mode toggle (calendar vs list)
 * - Calendar view mode (week, month, 8weeks)
 * - Week offset navigation
 * - Date range calculations
 * - Generating days array for calendar grid
 * - Computing months to fetch for API queries
 */
export function useDeliveryFilters(): UseDeliveryFiltersReturn {
  const [pageViewMode, setPageViewMode] = useState<PageViewMode>('list');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  // Calculate date range based on view mode and week offset
  const dateRange = useMemo<DateRange>(() => {
    const today = new Date();
    const start = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start of week

    let daysToShow = 7; // Default to week

    if (viewMode === 'week') {
      start.setDate(today.getDate() + daysToMonday + weekOffset * 7);
      daysToShow = 28; // 4 consecutive weeks
    } else if (viewMode === 'month') {
      // First day of month (or offset by weekOffset months)
      start.setDate(1);
      start.setMonth(today.getMonth() + weekOffset);
      start.setHours(0, 0, 0, 0);

      // Move to Monday before or equal to first day of month
      const firstDayOfWeek = start.getDay();
      const daysToMondayFromFirst = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
      start.setDate(start.getDate() + daysToMondayFromFirst);

      // End of month
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + weekOffset + 1, 0);
      const lastDayOfWeek = lastDayOfMonth.getDay();
      const daysToSundayFromLast = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;

      daysToShow =
        Math.ceil((lastDayOfMonth.getDate() + daysToSundayFromLast - start.getDate() + 1) / 7) * 7;
    } else if (viewMode === '8weeks') {
      start.setDate(today.getDate() + daysToMonday + weekOffset * 56); // 8 weeks = 56 days
      daysToShow = 56;
    }

    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + daysToShow - 1);
    end.setHours(23, 59, 59, 999);

    return { startOfWeek: start, endDate: end, totalDays: daysToShow };
  }, [weekOffset, viewMode]);

  // Generate array of days for the date range
  const continuousDays = useMemo<Date[]>(() => {
    const days: Date[] = [];
    const current = new Date(dateRange.startOfWeek);

    for (let i = 0; i < dateRange.totalDays; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [dateRange.startOfWeek, dateRange.totalDays]);

  // Calculate months to fetch for API queries - with memoization
  const monthsToFetch = useMemo<MonthToFetch[]>(() => {
    const months: MonthToFetch[] = [];
    const currentMonth = dateRange.startOfWeek.getMonth() + 1;
    const currentYear = dateRange.startOfWeek.getFullYear();

    // Add first month
    months.push({ month: currentMonth, year: currentYear });

    // Add subsequent months up to end of range
    const tempDate = new Date(dateRange.startOfWeek);
    while (tempDate < dateRange.endDate) {
      tempDate.setMonth(tempDate.getMonth() + 1);
      const m = tempDate.getMonth() + 1;
      const y = tempDate.getFullYear();
      if (!months.some((item) => item.month === m && item.year === y)) {
        months.push({ month: m, year: y });
      }
    }

    return months;
  }, [dateRange.startOfWeek, dateRange.endDate]);

  // Navigation helpers
  const goToToday = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const goToPrevious = useCallback(() => {
    setWeekOffset((prev) => prev - 1);
  }, []);

  const goToNext = useCallback(() => {
    setWeekOffset((prev) => prev + 1);
  }, []);

  // Change view mode with offset reset
  const changeViewMode = useCallback((mode: CalendarViewMode) => {
    setViewMode(mode);
    setWeekOffset(0);
  }, []);

  return {
    // Page view state
    pageViewMode,
    setPageViewMode,

    // Calendar view state
    viewMode,
    setViewMode,

    // Week navigation
    weekOffset,
    setWeekOffset,

    // Computed values
    dateRange,
    continuousDays,
    monthsToFetch,

    // Navigation helpers
    goToToday,
    goToPrevious,
    goToNext,
    changeViewMode,
  };
}
