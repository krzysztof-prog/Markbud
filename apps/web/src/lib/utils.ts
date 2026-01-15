import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number, currency: 'PLN' | 'EUR' = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formatuje datę jako "15 sty" (dzień + skrócony miesiąc)
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Formatuje datę z nazwą dnia tygodnia "poniedziałek, 15.01.2026"
 */
export function formatDateWithWeekday(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Pobiera nazwę dnia tygodnia
 */
export function getWeekdayName(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pl-PL', { weekday: 'long' });
}

/**
 * Formatuje liczbę z określoną precyzją
 * Używaj zamiast .toFixed() aby mieć spójne formatowanie
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formatuje liczbę jako procent
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}
