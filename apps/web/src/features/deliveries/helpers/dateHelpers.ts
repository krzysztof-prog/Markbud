/**
 * Date helpers for deliveries calendar
 */

import { formatDateWarsaw } from '@/lib/date-utils';

/**
 * Pobierz początek tygodnia (poniedziałek) dla danej daty
 */
export function getStartOfWeek(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  result.setDate(result.getDate() + daysToMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Pobierz koniec tygodnia (niedziela) dla danej daty
 */
export function getEndOfWeek(date: Date): Date {
  const startOfWeek = getStartOfWeek(date);
  const result = new Date(startOfWeek);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Wygeneruj listę miesięcy do pobrania dla kalendarza
 */
export function getMonthsToFetch(startDate: Date, numberOfMonths: number = 3): { month: number; year: number }[] {
  const months: { month: number; year: number }[] = [];
  const uniqueMonths = new Set<string>();

  const tempDate = new Date(startDate);

  for (let i = 0; i < numberOfMonths; i++) {
    const month = tempDate.getMonth() + 1;
    const year = tempDate.getFullYear();
    const key = `${year}-${month}`;

    if (!uniqueMonths.has(key)) {
      uniqueMonths.add(key);
      months.push({ month, year });
    }

    tempDate.setMonth(tempDate.getMonth() + 1);
  }

  return months;
}

/**
 * Pobierz numer tygodnia dla danej daty
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Formatuj datę do YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  return formatDateWarsaw(date);
}
