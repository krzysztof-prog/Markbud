/**
 * Date helpers for Attendance module
 */

// Nazwy miesięcy po polsku
export const POLISH_MONTHS = [
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

// Nazwy dni tygodnia po polsku (skrócone)
export const POLISH_DAYS_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

/**
 * Zwraca nazwę dnia tygodnia dla danej daty
 */
export function getDayOfWeekName(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  return POLISH_DAYS_SHORT[date.getDay()];
}

/**
 * Formatuje datę jako YYYY-MM-DD
 */
export function formatDate(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Sprawdza czy dany dzień jest weekendem
 */
export function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Zwraca poprzedni miesiąc
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Zwraca następny miesiąc
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}
