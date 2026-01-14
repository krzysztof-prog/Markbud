/**
 * CalendarService - Serwis kalendarza z logiką świąt i dni roboczych
 *
 * Odpowiedzialności:
 * - Obliczanie świąt polskich (stałych i ruchomych)
 * - Logika dni roboczych
 * - Liczenie dni roboczych między datami
 * - Walidacja zakresu dat
 */

import { PrismaClient } from '@prisma/client';
import { EasterCalculator, easterCalculator } from './utils/EasterCalculator.js';

/**
 * Struktura danych dla święta
 */
export interface Holiday {
  date: Date;
  name: string;
  country: string;
  isWorking: boolean;
}

/**
 * Polskie święta stałe (te same każdego roku)
 */
const POLISH_FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Nowy Rok' },
  { month: 1, day: 6, name: 'Trzech Króli' },
  { month: 5, day: 1, name: 'Święto Pracy' },
  { month: 5, day: 3, name: 'Święto Konstytucji 3 Maja' },
  { month: 8, day: 15, name: 'Wniebowzięcie NMP' },
  { month: 11, day: 1, name: 'Wszystkich Świętych' },
  { month: 11, day: 11, name: 'Narodowe Święto Niepodległości' },
  { month: 12, day: 25, name: 'Boże Narodzenie' },
  { month: 12, day: 26, name: 'Drugi dzień Bożego Narodzenia' },
] as const;

/**
 * Serwis kalendarza - centralna logika świąt i dni roboczych
 */
export class CalendarService {
  private easterCalculator: EasterCalculator;

  constructor(
    private prisma: PrismaClient,
    customEasterCalculator?: EasterCalculator
  ) {
    // Pozwól na wstrzyknięcie custom kalkulatora dla testów
    this.easterCalculator = customEasterCalculator || easterCalculator;
  }

  /**
   * Pobiera wszystkie święta dla danego roku
   * Zawiera zarówno święta stałe jak i ruchome
   *
   * @param year - Rok do pobrania świąt
   * @returns Lista wszystkich świąt
   */
  getHolidays(year: number): Holiday[] {
    const holidays: Holiday[] = [];

    // Dodaj święta stałe
    for (const holiday of POLISH_FIXED_HOLIDAYS) {
      holidays.push({
        date: new Date(year, holiday.month - 1, holiday.day),
        name: holiday.name,
        country: 'PL',
        isWorking: false,
      });
    }

    // Dodaj święta ruchome (zależne od Wielkanocy)
    const movableHolidays = this.easterCalculator.getMovableHolidays(year);
    for (const movableHoliday of movableHolidays) {
      holidays.push({
        date: movableHoliday.date,
        name: movableHoliday.name,
        country: movableHoliday.country,
        isWorking: movableHoliday.isWorking,
      });
    }

    return holidays;
  }

  /**
   * Sprawdza czy dana data jest świętem
   *
   * @param date - Data do sprawdzenia
   * @returns true jeśli data jest świętem
   */
  isHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const holidays = this.getHolidays(year);

    return holidays.some(
      (h) =>
        h.date.getFullYear() === date.getFullYear() &&
        h.date.getMonth() === date.getMonth() &&
        h.date.getDate() === date.getDate()
    );
  }

  /**
   * Sprawdza czy dana data jest dniem roboczym
   * Dzień roboczy = nie jest weekendem i nie jest świętem
   *
   * @param date - Data do sprawdzenia
   * @returns true jeśli data jest dniem roboczym
   */
  isWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay();

    // Sobota (6) i Niedziela (0) nie są dniami roboczymi
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Święta nie są dniami roboczymi
    if (this.isHoliday(date)) {
      return false;
    }

    return true;
  }

  /**
   * Pobiera dni robocze dla danego miesiąca z bazy danych
   * (jeśli są zapisane jako override)
   *
   * @param month - Miesiąc (1-12)
   * @param year - Rok
   * @returns Lista dni roboczych z bazy
   */
  async getWorkingDaysFromDatabase(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.prisma.workingDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  /**
   * Liczy dni robocze między dwiema datami
   *
   * @param startDate - Data początkowa (włącznie)
   * @param endDate - Data końcowa (włącznie)
   * @returns Liczba dni roboczych
   */
  countWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      if (this.isWorkingDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Dodaje N dni roboczych do daty
   *
   * @param date - Data początkowa
   * @param days - Liczba dni roboczych do dodania
   * @returns Nowa data
   */
  addWorkingDays(date: Date, days: number): Date {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (this.isWorkingDay(result)) {
        addedDays++;
      }
    }

    return result;
  }

  /**
   * Pobiera następny dzień roboczy od podanej daty
   *
   * @param date - Data początkowa
   * @returns Następny dzień roboczy
   */
  getNextWorkingDay(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + 1);

    while (!this.isWorkingDay(result)) {
      result.setDate(result.getDate() + 1);
    }

    return result;
  }

  /**
   * Pobiera poprzedni dzień roboczy od podanej daty
   *
   * @param date - Data początkowa
   * @returns Poprzedni dzień roboczy
   */
  getPreviousWorkingDay(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - 1);

    while (!this.isWorkingDay(result)) {
      result.setDate(result.getDate() - 1);
    }

    return result;
  }

  /**
   * Pobiera wszystkie dni robocze w danym miesiącu
   *
   * @param month - Miesiąc (1-12)
   * @param year - Rok
   * @returns Lista dat dni roboczych
   */
  getWorkingDaysInMonth(month: number, year: number): Date[] {
    const workingDays: Date[] = [];
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Ostatni dzień miesiąca

    const current = new Date(startDate);

    while (current <= endDate) {
      if (this.isWorkingDay(current)) {
        workingDays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Pobiera święta dla danego miesiąca
   *
   * @param month - Miesiąc (1-12)
   * @param year - Rok
   * @returns Lista świąt w miesiącu
   */
  getHolidaysInMonth(month: number, year: number): Holiday[] {
    const allHolidays = this.getHolidays(year);

    return allHolidays.filter((h) => h.date.getMonth() === month - 1);
  }
}

// Eksportuj singleton dla wygody (będzie zainicjalizowany z prisma)
let calendarServiceInstance: CalendarService | null = null;

/**
 * Inicjalizuje i zwraca singleton CalendarService
 * @param prisma - Klient Prisma
 */
export function getCalendarService(prisma: PrismaClient): CalendarService {
  if (!calendarServiceInstance) {
    calendarServiceInstance = new CalendarService(prisma);
  }
  return calendarServiceInstance;
}
