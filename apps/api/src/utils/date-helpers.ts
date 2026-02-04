/**
 * Date helper utilities using date-fns and dayjs
 *
 * WAŻNE: Wszystkie daty w projekcie AKROBUD używają strefy czasowej Europe/Warsaw.
 * Używaj funkcji z prefiksem 'warsaw' dla operacji wymagających poprawnej strefy czasowej.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';

// Konfiguracja dayjs z pluginami timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

// Domyślna strefa czasowa dla projektu
export const TIMEZONE = 'Europe/Warsaw';

import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subDays,
  subMonths,
  differenceInDays,
  differenceInMonths,
  isValid,
  isSameDay,
  isBefore,
  isAfter,
  getDay,
} from 'date-fns';
import { pl } from 'date-fns/locale';

// Re-export commonly used functions for convenience
export {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subDays,
  subMonths,
  differenceInDays,
  differenceInMonths,
  isValid,
  isSameDay,
  isBefore,
  isAfter,
  getDay,
};

/**
 * Parse a date string (ISO or other formats) to Date object
 */
export function parseDate(dateString: string): Date {
  // Try ISO format first
  const parsed = parseISO(dateString);
  if (isValid(parsed)) {
    return parsed;
  }

  // Fallback to Date constructor
  const fallback = new Date(dateString);
  if (isValid(fallback)) {
    return fallback;
  }

  throw new Error(`Invalid date string: ${dateString}`);
}

/**
 * Safe parse that returns undefined instead of throwing
 */
export function parseDateSafe(dateString: string | undefined | null): Date | undefined {
  if (!dateString) return undefined;

  try {
    return parseDate(dateString);
  } catch {
    return undefined;
  }
}

/**
 * Format date in Polish locale with day.month.year format
 * Example: "08.12.2025"
 */
export function formatPolishDate(date: Date): string {
  return format(date, 'dd.MM.yyyy', { locale: pl });
}

/**
 * Format date with time in Polish format
 * Example: "08.12.2025 14:30"
 */
export function formatPolishDateTime(date: Date): string {
  return format(date, 'dd.MM.yyyy HH:mm', { locale: pl });
}

/**
 * Format date for ISO string (database storage)
 * Example: "2025-12-08"
 */
export function formatISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format month name in Polish
 * Example: "Grudzień 2025"
 */
export function formatPolishMonth(date: Date): string {
  return format(date, 'LLLL yyyy', { locale: pl });
}

/**
 * Get day of week name in Polish
 * Example: "Poniedziałek"
 */
export function getPolishDayName(date: Date): string {
  return format(date, 'EEEE', { locale: pl });
}

/**
 * Get short day of week name in Polish
 * Example: "Pon"
 */
export function getPolishDayNameShort(date: Date): string {
  return format(date, 'EEE', { locale: pl });
}

/**
 * Get start of day (00:00:00.000)
 */
export function getDayStart(date: Date): Date {
  return startOfDay(date);
}

/**
 * Get end of day (23:59:59.999)
 */
export function getDayEnd(date: Date): Date {
  return endOfDay(date);
}

/**
 * Get date range for a specific day
 */
export function getDayRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
}

/**
 * Get date range for a specific month
 */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Get date range for current week (Monday to Sunday)
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }), // Sunday
  };
}

/**
 * Check if date is weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = getDay(date);
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Convert weekday index to Polish name
 * 0 = Sunday, 1 = Monday, etc.
 */
export const POLISH_DAY_NAMES = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
] as const;

/**
 * Polish month names
 */
export const POLISH_MONTH_NAMES = [
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
] as const;

/**
 * Generate delivery number format: DD.MM.YYYY_X
 */
export function formatDeliveryDate(date: Date): string {
  return formatPolishDate(date);
}

/**
 * Roman numeral conversion (1-10 for delivery suffixes)
 */
export function toRomanNumeral(num: number): string {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romanNumerals[num - 1] || String(num);
}

/**
 * Get ISO week number from date
 * @param date - Date to get week number from
 * @returns ISO week number (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNum;
}

/**
 * Get date range from now to N days in the future
 * @param daysFromNow - Number of days from today
 * @returns Object with start (now) and end date
 */
export function getDateRangeFromNow(daysFromNow: number): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  return { start: now, end };
}

/**
 * Get start and end dates for N weeks from a starting date
 * @param startDate - Starting date (usually start of current week)
 * @param weekIndex - Week index (0 = current week, 1 = next week, etc.)
 * @returns Object with start and end dates for the week
 */
export function getWeekRangeByIndex(startDate: Date, weekIndex: number): { start: Date; end: Date } {
  const start = new Date(startDate);
  start.setDate(startDate.getDate() + (weekIndex * 7));

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Check if a date is within a range (inclusive)
 * @param date - Date to check
 * @param start - Start of range
 * @param end - End of range
 * @returns True if date is within range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/**
 * Get start of month with optional month/year parameters
 * @param month - Month (1-12, default: current month)
 * @param year - Year (default: current year)
 * @returns Date object set to first day of month at 00:00:00
 */
export function getMonthStart(month?: number, year?: number): Date {
  const now = new Date();
  const targetMonth = month !== undefined ? month - 1 : now.getMonth();
  const targetYear = year !== undefined ? year : now.getFullYear();

  return new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
}

/**
 * Get end of month with optional month/year parameters
 * @param month - Month (1-12, default: current month)
 * @param year - Year (default: current year)
 * @returns Date object set to last day of month at 23:59:59.999
 */
export function getMonthEnd(month?: number, year?: number): Date {
  const now = new Date();
  const targetMonth = month !== undefined ? month - 1 : now.getMonth();
  const targetYear = year !== undefined ? year : now.getFullYear();

  // Get first day of next month, then subtract 1ms
  const nextMonth = new Date(targetYear, targetMonth + 1, 1, 0, 0, 0, 0);
  return new Date(nextMonth.getTime() - 1);
}

// ============================================================================
// FUNKCJE Z OBSŁUGĄ STREFY CZASOWEJ EUROPE/WARSAW
// Używaj tych funkcji zamiast toISOString().split('T')[0]!
// ============================================================================

/**
 * Formatuje datę do formatu YYYY-MM-DD w strefie czasowej Warsaw.
 * UŻYWAJ ZAMIAST: date.toISOString().split('T')[0]
 *
 * @example
 * // O północy 2025-12-24 00:30 w Warszawie:
 * // toISOString() zwróci "2025-12-23T23:30:00Z" (UTC) -> split daje "2025-12-23" (BŁĄD!)
 * // formatDateWarsaw() zwróci "2025-12-24" (POPRAWNIE!)
 */
export function formatDateWarsaw(date: Date | string | null | undefined): string {
  if (!date) return '';
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD');
}

/**
 * Formatuje datę do formatu DD.MM.YYYY w strefie czasowej Warsaw.
 */
export function formatDateWarsawPolish(date: Date | string | null | undefined): string {
  if (!date) return '';
  return dayjs(date).tz(TIMEZONE).format('DD.MM.YYYY');
}

/**
 * Formatuje datę i czas do formatu YYYY-MM-DD HH:mm w strefie czasowej Warsaw.
 */
export function formatDateTimeWarsaw(date: Date | string | null | undefined): string {
  if (!date) return '';
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD HH:mm');
}

/**
 * Formatuje datę i czas do formatu DD.MM.YYYY HH:mm w strefie czasowej Warsaw.
 */
export function formatDateTimeWarsawPolish(date: Date | string | null | undefined): string {
  if (!date) return '';
  return dayjs(date).tz(TIMEZONE).format('DD.MM.YYYY HH:mm');
}

/**
 * Pobiera dzisiejszą datę w formacie YYYY-MM-DD w strefie Warsaw.
 * UŻYWAJ ZAMIAST: new Date().toISOString().split('T')[0]
 */
export function getTodayWarsaw(): string {
  return dayjs().tz(TIMEZONE).format('YYYY-MM-DD');
}

/**
 * Pobiera początek dnia (00:00:00) w strefie Warsaw jako Date.
 */
export function getStartOfDayWarsaw(date?: Date | string): Date {
  const d = date ? dayjs(date) : dayjs();
  return d.tz(TIMEZONE).startOf('day').toDate();
}

/**
 * Pobiera koniec dnia (23:59:59.999) w strefie Warsaw jako Date.
 */
export function getEndOfDayWarsaw(date?: Date | string): Date {
  const d = date ? dayjs(date) : dayjs();
  return d.tz(TIMEZONE).endOf('day').toDate();
}

/**
 * Normalizuje datę do początku dnia w strefie Warsaw.
 * Używaj zamiast date.setHours(0,0,0,0) lub setUTCHours(0,0,0,0).
 */
export function normalizeDateWarsaw(date: Date | string): Date {
  return dayjs(date).tz(TIMEZONE).startOf('day').toDate();
}

/**
 * Porównuje dwie daty (tylko dzień, bez czasu) w strefie Warsaw.
 * @returns true jeśli obie daty są tego samego dnia
 */
export function isSameDayWarsaw(date1: Date | string, date2: Date | string): boolean {
  return formatDateWarsaw(date1) === formatDateWarsaw(date2);
}

/**
 * Parsuje string daty YYYY-MM-DD do Date w strefie Warsaw.
 * UŻYWAJ ZAMIAST: new Date(year, month - 1, day)
 */
export function parseDateWarsaw(dateString: string): Date {
  return dayjs.tz(dateString, TIMEZONE).toDate();
}

/**
 * Pobiera numer tygodnia ISO w strefie Warsaw.
 */
export function getWeekNumberWarsaw(date?: Date | string): number {
  const d = date ? dayjs(date) : dayjs();
  return d.tz(TIMEZONE).isoWeek();
}

/**
 * Eksportuj dayjs skonfigurowany dla Warsaw do użycia w bardziej złożonych operacjach.
 */
export function dayjsWarsaw(date?: Date | string) {
  return date ? dayjs(date).tz(TIMEZONE) : dayjs().tz(TIMEZONE);
}

// Re-eksportuj dayjs dla zaawansowanych przypadków
export { dayjs };
