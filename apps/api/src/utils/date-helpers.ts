/**
 * Date helper utilities using date-fns
 */

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
