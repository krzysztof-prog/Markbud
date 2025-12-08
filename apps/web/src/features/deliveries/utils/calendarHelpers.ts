/**
 * Calendar helpers for delivery calendar
 */

import type { Delivery } from '@/types/delivery';
import type { Holiday, WorkingDay } from '@/types/settings';

/**
 * Calculate date range based on view mode
 */
export function calculateDateRange(
  weekOffset: number,
  viewMode: 'week' | 'month' | '8weeks'
) {
  const today = new Date();
  const start = new Date(today);
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  let daysToShow = 7;

  if (viewMode === 'week') {
    start.setDate(today.getDate() + daysToMonday + weekOffset * 7);
    daysToShow = 28; // 4 consecutive weeks
  } else if (viewMode === 'month') {
    start.setDate(1);
    start.setMonth(today.getMonth() + weekOffset);
    start.setHours(0, 0, 0, 0);

    const firstDayOfWeek = start.getDay();
    const daysToMondayFromFirst = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    start.setDate(start.getDate() + daysToMondayFromFirst);

    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + weekOffset + 1, 0);
    const lastDayOfWeek = lastDayOfMonth.getDay();
    const daysToSundayFromLast = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;

    daysToShow =
      Math.ceil((lastDayOfMonth.getDate() + daysToSundayFromLast - start.getDate() + 1) / 7) * 7;
  } else if (viewMode === '8weeks') {
    start.setDate(today.getDate() + daysToMonday + weekOffset * 56);
    daysToShow = 56;
  }

  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + daysToShow - 1);
  end.setHours(23, 59, 59, 999);

  return { startOfWeek: start, endDate: end, totalDays: daysToShow };
}

/**
 * Calculate months to fetch for the date range
 */
export function calculateMonthsToFetch(startOfWeek: Date, endDate: Date) {
  const months: { month: number; year: number }[] = [];
  const currentMonth = startOfWeek.getMonth() + 1;
  const currentYear = startOfWeek.getFullYear();

  months.push({ month: currentMonth, year: currentYear });

  const tempDate = new Date(startOfWeek);
  while (tempDate < endDate) {
    tempDate.setMonth(tempDate.getMonth() + 1);
    const m = tempDate.getMonth() + 1;
    const y = tempDate.getFullYear();
    if (!months.some((item) => item.month === m && item.year === y)) {
      months.push({ month: m, year: y });
    }
  }

  return months;
}

/**
 * Generate array of days for the date range
 */
export function generateDays(startOfWeek: Date, totalDays: number): Date[] {
  const days: Date[] = [];
  const current = new Date(startOfWeek);

  for (let i = 0; i < totalDays; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Get deliveries for a specific day
 */
export function getDeliveriesForDay(deliveries: Delivery[], date: Date): Delivery[] {
  return deliveries.filter((d: Delivery) => {
    const deliveryDate = new Date(d.deliveryDate);
    return (
      deliveryDate.getDate() === date.getDate() &&
      deliveryDate.getMonth() === date.getMonth() &&
      deliveryDate.getFullYear() === date.getFullYear()
    );
  });
}

/**
 * Get holiday info for a specific day
 */
export function getHolidayInfo(holidays: Holiday[], date: Date) {
  const polishHolidays = holidays.filter((h: Holiday) => {
    const hDate = new Date(h.date);
    return (
      h.country === 'PL' &&
      hDate.getDate() === date.getDate() &&
      hDate.getMonth() === date.getMonth() &&
      hDate.getFullYear() === date.getFullYear()
    );
  });

  const germanHolidays = holidays.filter((h: Holiday) => {
    const hDate = new Date(h.date);
    return (
      h.country === 'DE' &&
      hDate.getDate() === date.getDate() &&
      hDate.getMonth() === date.getMonth() &&
      hDate.getFullYear() === date.getFullYear()
    );
  });

  return { polishHolidays, germanHolidays };
}

/**
 * Check if holiday is non-working
 */
export function isHolidayNonWorking(holidayInfo: {
  polishHolidays: Holiday[];
  germanHolidays: Holiday[];
}) {
  const polishNonWorking = holidayInfo.polishHolidays.some((h) => !h.isWorking);
  const germanNonWorking = holidayInfo.germanHolidays.some((h) => !h.isWorking);
  return polishNonWorking || germanNonWorking;
}

/**
 * Check if day is non-working
 */
export function isNonWorkingDay(workingDays: WorkingDay[], date: Date): boolean {
  const workingDay = workingDays.find((wd: WorkingDay) => {
    const wdDate = new Date(wd.date);
    return (
      wdDate.getDate() === date.getDate() &&
      wdDate.getMonth() === date.getMonth() &&
      wdDate.getFullYear() === date.getFullYear()
    );
  });
  return workingDay !== undefined && !workingDay.isWorking;
}

/**
 * Calculate stats for a specific day
 */
export function getDayStats(deliveries: Delivery[], date: Date) {
  const dayDeliveries = getDeliveriesForDay(deliveries, date);
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
}

/**
 * Calculate stats for a week (array of days)
 */
export function getWeekStats(deliveries: Delivery[], dates: Date[]) {
  let windows = 0;
  let sashes = 0;
  let glasses = 0;

  dates.forEach((date) => {
    const dayStats = getDayStats(deliveries, date);
    windows += dayStats.windows;
    sashes += dayStats.sashes;
    glasses += dayStats.glasses;
  });

  return { windows, sashes, glasses };
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateToString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Polish month names
 */
export const MONTH_NAMES = [
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

/**
 * Polish day names (short)
 */
export const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];
