/**
 * EasterCalculator - Obliczanie daty Wielkanocy i powiązanych świąt
 *
 * Implementuje algorytm Meeusa do obliczania daty Wielkanocy.
 * Generuje daty świąt ruchomych zależnych od Wielkanocy:
 * - Niedziela Wielkanocna
 * - Poniedziałek Wielkanocny
 * - Zielone Świątki (Zesłanie Ducha Świętego)
 * - Boże Ciało
 */

export interface MovableHoliday {
  date: Date;
  name: string;
  country: string;
  isWorking: boolean;
  daysFromEaster: number;
}

/**
 * Kalkulator daty Wielkanocy i świąt ruchomych
 */
export class EasterCalculator {
  /**
   * Oblicza datę Niedzieli Wielkanocnej dla danego roku
   * Używa algorytmu Meeusa (Anonymous Gregorian algorithm)
   *
   * @param year - Rok do obliczenia
   * @returns Data Niedzieli Wielkanocnej
   */
  calculateEaster(year: number): Date {
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

  /**
   * Pobiera wszystkie święta ruchome dla danego roku
   * Święta ruchome są zależne od daty Wielkanocy
   *
   * @param year - Rok do obliczenia
   * @returns Lista świąt ruchomych
   */
  getMovableHolidays(year: number): MovableHoliday[] {
    const easter = this.calculateEaster(year);
    const holidays: MovableHoliday[] = [];

    // Niedziela Wielkanocna (dzień 0)
    holidays.push({
      date: new Date(easter),
      name: 'Niedziela Wielkanocna',
      country: 'PL',
      isWorking: false,
      daysFromEaster: 0,
    });

    // Poniedziałek Wielkanocny (1 dzień po Wielkanocy)
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    holidays.push({
      date: easterMonday,
      name: 'Poniedziałek Wielkanocny',
      country: 'PL',
      isWorking: false,
      daysFromEaster: 1,
    });

    // Zielone Świątki - Zesłanie Ducha Świętego (49 dni po Wielkanocy)
    const pentecost = new Date(easter);
    pentecost.setDate(easter.getDate() + 49);
    holidays.push({
      date: pentecost,
      name: 'Zielone Świątki',
      country: 'PL',
      isWorking: false,
      daysFromEaster: 49,
    });

    // Boże Ciało (60 dni po Wielkanocy)
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 60);
    holidays.push({
      date: corpusChristi,
      name: 'Boże Ciało',
      country: 'PL',
      isWorking: false,
      daysFromEaster: 60,
    });

    return holidays;
  }
}

// Eksportuj singleton dla wygody użycia
export const easterCalculator = new EasterCalculator();
