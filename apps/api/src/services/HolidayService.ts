/**
 * Holiday Service - Business logic for Polish and German holidays
 *
 * Odpowiada za obliczanie dat swiat stalych i ruchomych
 * oraz zarzadzanie dniami roboczymi w kalendarzu.
 */

import { prisma } from '../index.js';

// === TYPES ===

export interface Holiday {
  date: Date;
  name: string;
  country: 'PL' | 'DE';
  isWorking: boolean;
}

export interface FixedHoliday {
  month: number;
  day: number;
  name: string;
}

export interface MovableHoliday {
  date: Date;
  name: string;
}

export interface WorkingDayInput {
  date: string;
  isWorking: boolean;
  description?: string;
}

// === CONSTANTS ===

// Polskie swieta stale
const POLISH_HOLIDAYS: FixedHoliday[] = [
  { month: 1, day: 1, name: 'Nowy Rok' },
  { month: 1, day: 6, name: 'Trzech Kroli' },
  { month: 5, day: 1, name: 'Swieto Pracy' },
  { month: 5, day: 3, name: 'Swieto Konstytucji 3 Maja' },
  { month: 8, day: 15, name: 'Wniebowziecie NMP' },
  { month: 11, day: 1, name: 'Wszystkich Swietych' },
  { month: 11, day: 11, name: 'Narodowe Swieto Niepodleglosci' },
  { month: 12, day: 25, name: 'Boze Narodzenie' },
  { month: 12, day: 26, name: 'Drugi dzien Bozego Narodzenia' },
];

// Niemieckie swieta stale (federalne)
const GERMAN_HOLIDAYS: FixedHoliday[] = [
  { month: 1, day: 1, name: 'Neujahr' },
  { month: 5, day: 1, name: 'Tag der Arbeit' },
  { month: 10, day: 3, name: 'Tag der Deutschen Einheit' },
  { month: 12, day: 25, name: 'Erster Weihnachtstag' },
  { month: 12, day: 26, name: 'Zweiter Weihnachtstag' },
];

// === EASTER CALCULATION ===

/**
 * Oblicz date Wielkanocy (algorytm Meeusa/Jones/Butcher)
 * @param year Rok dla ktorego obliczyc Wielkanoc
 * @returns Data Niedzieli Wielkanocnej
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

// === MOVABLE HOLIDAYS ===

/**
 * Oblicz polskie swieta ruchome (zalezne od Wielkanocy)
 */
function getPolishMovableHolidays(year: number): MovableHoliday[] {
  const easter = calculateEaster(year);
  const holidays: MovableHoliday[] = [];

  // Wielkanoc
  holidays.push({
    date: new Date(easter),
    name: 'Niedziela Wielkanocna',
  });

  // Poniedzialek Wielkanocny (+1 dzien)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({
    date: easterMonday,
    name: 'Poniedzialek Wielkanocny',
  });

  // Zielone Swiatki (+49 dni po Wielkanocy)
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  holidays.push({
    date: pentecost,
    name: 'Zielone Swiatki',
  });

  // Boze Cialo (+60 dni po Wielkanocy)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push({
    date: corpusChristi,
    name: 'Boze Cialo',
  });

  return holidays;
}

/**
 * Oblicz niemieckie swieta ruchome (zalezne od Wielkanocy)
 */
function getGermanMovableHolidays(year: number): MovableHoliday[] {
  const easter = calculateEaster(year);
  const holidays: MovableHoliday[] = [];

  // Karfreitag - Wielki Piatek (-2 dni przed Wielkanoca)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    date: goodFriday,
    name: 'Karfreitag',
  });

  // Ostermontag - Poniedzialek Wielkanocny (+1 dzien)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({
    date: easterMonday,
    name: 'Ostermontag',
  });

  // Christi Himmelfahrt - Wniebowstapienie (+39 dni po Wielkanocy)
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);
  holidays.push({
    date: ascension,
    name: 'Christi Himmelfahrt',
  });

  // Pfingstmontag - Poniedzialek Zielonych Swiatek (+50 dni po Wielkanocy)
  const pentecostMonday = new Date(easter);
  pentecostMonday.setDate(easter.getDate() + 50);
  holidays.push({
    date: pentecostMonday,
    name: 'Pfingstmontag',
  });

  return holidays;
}

// === HOLIDAY SERVICE CLASS ===

export class HolidayService {
  /**
   * Pobierz wszystkie swieta dla danego roku i kraju
   * @param year Rok
   * @param country Opcjonalny kod kraju ('PL' lub 'DE'), jesli brak - zwraca oba
   */
  getHolidays(year: number, country?: 'PL' | 'DE'): Holiday[] {
    const holidays: Holiday[] = [];

    // Dodaj polskie swieta
    if (!country || country === 'PL') {
      // Stale swieta polskie
      for (const holiday of POLISH_HOLIDAYS) {
        holidays.push({
          date: new Date(year, holiday.month - 1, holiday.day),
          name: holiday.name,
          country: 'PL',
          isWorking: false, // Wszystkie polskie swieta sa dniami wolnymi
        });
      }

      // Ruchome swieta polskie
      const movableHolidays = getPolishMovableHolidays(year);
      for (const holiday of movableHolidays) {
        holidays.push({
          date: holiday.date,
          name: holiday.name,
          country: 'PL',
          isWorking: false,
        });
      }
    }

    // Dodaj niemieckie swieta
    if (!country || country === 'DE') {
      // Stale swieta niemieckie
      for (const holiday of GERMAN_HOLIDAYS) {
        holidays.push({
          date: new Date(year, holiday.month - 1, holiday.day),
          name: holiday.name,
          country: 'DE',
          isWorking: false, // Wszystkie niemieckie swieta federalne sa dniami wolnymi
        });
      }

      // Ruchome swieta niemieckie
      const movableHolidays = getGermanMovableHolidays(year);
      for (const holiday of movableHolidays) {
        holidays.push({
          date: holiday.date,
          name: holiday.name,
          country: 'DE',
          isWorking: false,
        });
      }
    }

    return holidays;
  }

  /**
   * Pobierz date Wielkanocy dla danego roku
   */
  getEasterDate(year: number): Date {
    return calculateEaster(year);
  }

  /**
   * Sprawdz czy dana data jest swietem
   */
  isHoliday(date: Date, country?: 'PL' | 'DE'): boolean {
    const year = date.getFullYear();
    const holidays = this.getHolidays(year, country);

    return holidays.some(
      (h) =>
        h.date.getFullYear() === date.getFullYear() &&
        h.date.getMonth() === date.getMonth() &&
        h.date.getDate() === date.getDate()
    );
  }

  /**
   * Pobierz dni robocze/wolne z bazy dla zakresu dat
   */
  async getWorkingDays(startDate: Date, endDate: Date) {
    return prisma.workingDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  /**
   * Pobierz dni robocze/wolne dla miesiaca
   */
  async getWorkingDaysForMonth(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Ostatni dzien miesiaca

    return this.getWorkingDays(startDate, endDate);
  }

  /**
   * Ustaw dzien jako wolny lub pracujacy
   */
  async setWorkingDay(input: WorkingDayInput) {
    const { date, isWorking, description } = input;

    return prisma.workingDay.upsert({
      where: { date: new Date(date) },
      update: {
        isWorking,
        description,
      },
      create: {
        date: new Date(date),
        isWorking,
        description,
        isHoliday: false,
      },
    });
  }

  /**
   * Usun oznaczenie dnia (przywroc domyslny stan)
   */
  async deleteWorkingDay(date: string) {
    return prisma.workingDay.delete({
      where: { date: new Date(date) },
    });
  }
}

// Singleton instance
export const holidayService = new HolidayService();
