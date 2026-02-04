/**
 * Centralny helper do obsługi dat w strefie czasowej Europe/Warsaw.
 *
 * WAŻNE: Wszystkie daty w projekcie AKROBUD używają strefy czasowej Europe/Warsaw.
 * Używaj funkcji z tego pliku zamiast toISOString().split('T')[0]!
 *
 * @example
 * // ❌ ŹLE - może zwrócić wczorajszą datę o północy
 * const dateStr = date.toISOString().split('T')[0];
 *
 * // ✅ DOBRZE - zawsze poprawna data w strefie Warsaw
 * import { formatDateWarsaw } from '@/lib/date-utils';
 * const dateStr = formatDateWarsaw(date);
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
 * Pobiera początek tygodnia (poniedziałek) w strefie Warsaw.
 */
export function getStartOfWeekWarsaw(date?: Date | string): Date {
  const d = date ? dayjs(date) : dayjs();
  return d.tz(TIMEZONE).startOf('isoWeek').toDate();
}

/**
 * Pobiera koniec tygodnia (niedziela) w strefie Warsaw.
 */
export function getEndOfWeekWarsaw(date?: Date | string): Date {
  const d = date ? dayjs(date) : dayjs();
  return d.tz(TIMEZONE).endOf('isoWeek').toDate();
}

/**
 * Dodaje dni do daty w strefie Warsaw.
 */
export function addDaysWarsaw(date: Date | string, days: number): Date {
  return dayjs(date).tz(TIMEZONE).add(days, 'day').toDate();
}

/**
 * Odejmuje dni od daty w strefie Warsaw.
 */
export function subDaysWarsaw(date: Date | string, days: number): Date {
  return dayjs(date).tz(TIMEZONE).subtract(days, 'day').toDate();
}

/**
 * Sprawdza czy data jest w przeszłości (względem dziś w strefie Warsaw).
 */
export function isPastWarsaw(date: Date | string): boolean {
  const today = dayjs().tz(TIMEZONE).startOf('day');
  const target = dayjs(date).tz(TIMEZONE).startOf('day');
  return target.isBefore(today);
}

/**
 * Sprawdza czy data jest dzisiaj w strefie Warsaw.
 */
export function isTodayWarsaw(date: Date | string): boolean {
  return formatDateWarsaw(date) === getTodayWarsaw();
}

/**
 * Sprawdza czy data jest w przyszłości (względem dziś w strefie Warsaw).
 */
export function isFutureWarsaw(date: Date | string): boolean {
  const today = dayjs().tz(TIMEZONE).startOf('day');
  const target = dayjs(date).tz(TIMEZONE).startOf('day');
  return target.isAfter(today);
}

/**
 * Eksportuj dayjs skonfigurowany dla Warsaw do użycia w bardziej złożonych operacjach.
 */
export function dayjsWarsaw(date?: Date | string) {
  return date ? dayjs(date).tz(TIMEZONE) : dayjs().tz(TIMEZONE);
}

// Re-eksportuj dayjs dla zaawansowanych przypadków
export { dayjs };
