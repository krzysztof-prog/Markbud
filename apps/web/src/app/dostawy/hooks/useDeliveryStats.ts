'use client';

import { useCallback, useMemo } from 'react';
import type { Delivery } from '@/types/delivery';
import type { Holiday, WorkingDay } from '@/types/settings';

export interface DayStats {
  windows: number;
  sashes: number;
  glasses: number;
}

export interface HolidayInfo {
  polishHolidays: Holiday[];
  germanHolidays: Holiday[];
}

export interface UseDeliveryStatsReturn {
  // Delivery filtering
  getDeliveriesForDay: (date: Date) => Delivery[];

  // Statistics calculation
  getDayStats: (date: Date) => DayStats;
  getWeekStats: (dates: Date[]) => DayStats;

  // Holiday checks
  getHolidayInfo: (date: Date) => HolidayInfo;
  isHolidayNonWorking: (date: Date, holidayInfo: HolidayInfo) => boolean;

  // Working day checks
  isNonWorkingDay: (date: Date) => boolean;

  // Day type checks
  isToday: (date: Date) => boolean;
  isWeekend: (date: Date) => boolean;
}

interface UseDeliveryStatsProps {
  deliveries: Delivery[];
  workingDays: WorkingDay[];
  holidays: Holiday[];
}

/**
 * Hook providing delivery statistics calculations and date helper functions.
 *
 * Responsibilities:
 * - Filter deliveries by date
 * - Calculate day and week statistics (windows, sashes, glasses)
 * - Check for holidays (Polish and German)
 * - Check for working/non-working days
 * - Date type checks (today, weekend)
 */
export function useDeliveryStats({
  deliveries,
  workingDays,
  holidays,
}: UseDeliveryStatsProps): UseDeliveryStatsReturn {
  // Helper to compare dates (day only)
  const isSameDay = useCallback((date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }, []);

  // Get deliveries for a specific day
  const getDeliveriesForDay = useCallback(
    (date: Date): Delivery[] => {
      return deliveries.filter((d: Delivery) => {
        const deliveryDate = new Date(d.deliveryDate);
        return isSameDay(deliveryDate, date);
      });
    },
    [deliveries, isSameDay]
  );

  // Calculate statistics for a single day
  const getDayStats = useCallback(
    (date: Date): DayStats => {
      const dayDeliveries = getDeliveriesForDay(date);
      let windows = 0;
      let sashes = 0;
      let glasses = 0;

      dayDeliveries.forEach((delivery: Delivery) => {
        delivery.deliveryOrders.forEach((dOrder) => {
          windows += dOrder.order.totalWindows || 0;
          sashes += dOrder.order.totalSashes || 0;
          glasses += dOrder.order.totalGlasses || 0;
        });
      });

      return { windows, sashes, glasses };
    },
    [getDeliveriesForDay]
  );

  // Calculate statistics for a week (array of dates)
  const getWeekStats = useCallback(
    (dates: Date[]): DayStats => {
      let windows = 0;
      let sashes = 0;
      let glasses = 0;

      dates.forEach((date) => {
        const dayStats = getDayStats(date);
        windows += dayStats.windows;
        sashes += dayStats.sashes;
        glasses += dayStats.glasses;
      });

      return { windows, sashes, glasses };
    },
    [getDayStats]
  );

  // Get holiday information for a specific day
  const getHolidayInfo = useCallback(
    (date: Date): HolidayInfo => {
      const polishHolidays = holidays.filter((h: Holiday) => {
        const hDate = new Date(h.date);
        return h.country === 'PL' && isSameDay(hDate, date);
      });

      const germanHolidays = holidays.filter((h: Holiday) => {
        const hDate = new Date(h.date);
        return h.country === 'DE' && isSameDay(hDate, date);
      });

      return { polishHolidays, germanHolidays };
    },
    [holidays, isSameDay]
  );

  // Check if holiday is a non-working day
  const isHolidayNonWorking = useCallback(
    (_date: Date, holidayInfo: HolidayInfo): boolean => {
      const polishNonWorking = holidayInfo.polishHolidays.some((h) => !h.isWorking);
      const germanNonWorking = holidayInfo.germanHolidays.some((h) => !h.isWorking);
      return polishNonWorking || germanNonWorking;
    },
    []
  );

  // Check if a day is marked as non-working
  const isNonWorkingDay = useCallback(
    (date: Date): boolean => {
      const workingDay = workingDays.find((wd: WorkingDay) => {
        const wdDate = new Date(wd.date);
        return isSameDay(wdDate, date);
      });
      return workingDay ? !workingDay.isWorking : false;
    },
    [workingDays, isSameDay]
  );

  // Today's date reference (memoized)
  const todayDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  // Check if date is today
  const isToday = useCallback(
    (date: Date): boolean => {
      return date.getTime() === todayDate.getTime();
    },
    [todayDate]
  );

  // Check if date is weekend
  const isWeekend = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }, []);

  return {
    getDeliveriesForDay,
    getDayStats,
    getWeekStats,
    getHolidayInfo,
    isHolidayNonWorking,
    isNonWorkingDay,
    isToday,
    isWeekend,
  };
}
