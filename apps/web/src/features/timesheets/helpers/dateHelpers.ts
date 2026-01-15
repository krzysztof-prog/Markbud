/**
 * Helpers dla dat w module godzinówek
 */

// Nazwy miesięcy po polsku
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
] as const;

// Skrócone nazwy dni tygodnia
export const WEEKDAY_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'] as const;

// Pełne nazwy dni tygodnia
export const WEEKDAY_NAMES = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
] as const;

/**
 * Formatuje datę do YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsuje datę z YYYY-MM-DD
 */
export function parseDateISO(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formatuje datę do czytelnego formatu (np. "15 stycznia 2026")
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateISO(date) : date;
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()].toLowerCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formatuje datę do krótkiego formatu (np. "15.01.2026")
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateISO(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Sprawdza czy data jest dzisiaj
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseDateISO(date) : date;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/**
 * Sprawdza czy to weekend (sobota lub niedziela)
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseDateISO(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Pobiera pierwszy dzień miesiąca
 */
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Pobiera ostatni dzień miesiąca
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

/**
 * Pobiera liczbę dni w miesiącu
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generuje tablicę dni dla kalendarza miesiąca
 * Włącznie z dniami wypełniającymi z poprzedniego/następnego miesiąca
 */
export function getCalendarDays(
  year: number,
  month: number
): Array<{ date: Date; isCurrentMonth: boolean }> {
  const firstDay = getFirstDayOfMonth(year, month);
  const _lastDay = getLastDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // Dzień tygodnia pierwszego dnia (0 = niedziela, 1 = poniedziałek, ...)
  // Przekształcamy aby poniedziałek był 0
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Dni z poprzedniego miesiąca
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(prevYear, prevMonth - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // Dni bieżącego miesiąca
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month - 1, i),
      isCurrentMonth: true,
    });
  }

  // Dni z następnego miesiąca (dopełnienie do pełnych tygodni)
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(nextYear, nextMonth - 1, i),
        isCurrentMonth: false,
      });
    }
  }

  return days;
}

/**
 * Pobiera poprzedni miesiąc
 */
export function getPrevMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Pobiera następny miesiąc
 */
export function getNextMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Formatuje godziny jako string (np. "8.0" -> "8h", "8.5" -> "8.5h")
 */
export function formatHours(hours: number): string {
  if (hours === 0) return '-';
  if (Number.isInteger(hours)) {
    return `${hours}h`;
  }
  return `${hours}h`;
}

/**
 * Waliduje krok godzin (musi być wielokrotnością 0.5)
 */
export function isValidHoursStep(hours: number): boolean {
  return hours * 2 === Math.floor(hours * 2);
}

/**
 * Zaokrągla godziny do najbliższej wielokrotności 0.5
 */
export function roundToHalfHour(hours: number): number {
  return Math.round(hours * 2) / 2;
}

/**
 * Sprawdza czy data to pierwszy dzień roboczy tygodnia (poniedziałek)
 */
export function isFirstDayOfWeek(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseDateISO(date) : date;
  return d.getDay() === 1; // 1 = poniedziałek
}

/**
 * Pobiera koniec tygodnia roboczego (piątek) dla danej daty
 */
export function getEndOfWeek(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateISO(date) : new Date(date);
  const dayOfWeek = d.getDay(); // 0 = niedziela, 1 = poniedziałek, ...

  // Oblicz ile dni do piątku (5)
  let daysToFriday: number;
  if (dayOfWeek === 0) {
    // Niedziela - piątek jest za 5 dni ale w następnym tygodniu
    daysToFriday = 5;
  } else if (dayOfWeek === 6) {
    // Sobota - piątek jest za 6 dni (przyszły tydzień)
    daysToFriday = 6;
  } else {
    // Poniedziałek(1) do piątku(5)
    daysToFriday = 5 - dayOfWeek;
  }

  const friday = new Date(d);
  friday.setDate(d.getDate() + daysToFriday);
  return formatDateISO(friday);
}

/**
 * Pobiera listę dni roboczych między dwoma datami (pomija weekendy)
 */
export function getWeekdaysBetween(fromDate: string, toDate: string): string[] {
  const from = parseDateISO(fromDate);
  const to = parseDateISO(toDate);
  const days: string[] = [];

  const current = new Date(from);
  while (current <= to) {
    if (!isWeekend(current)) {
      days.push(formatDateISO(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}
