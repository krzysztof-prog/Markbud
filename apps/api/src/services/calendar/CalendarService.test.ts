/**
 * CalendarService Unit Tests
 *
 * Testy dla serwisu kalendarza obejmujące:
 * - Obliczanie świąt polskich (stałych i ruchomych)
 * - Logika dni roboczych
 * - Obliczenia dat roboczych
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService } from './CalendarService.js';
import { EasterCalculator } from './utils/EasterCalculator.js';

describe('CalendarService', () => {
  let calendarService: CalendarService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      workingDay: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    calendarService = new CalendarService(mockPrisma);
  });

  describe('getHolidays', () => {
    it('returns Polish fixed holidays for year', () => {
      const holidays = calendarService.getHolidays(2024);

      expect(holidays.length).toBeGreaterThan(0);
      // Sprawdź święta stałe
      expect(holidays.some((h) => h.name === 'Nowy Rok')).toBe(true);
      expect(holidays.some((h) => h.name === 'Boże Narodzenie')).toBe(true);
      expect(holidays.some((h) => h.name === 'Święto Konstytucji 3 Maja')).toBe(true);
    });

    it('calculates Easter and movable holidays', () => {
      const holidays = calendarService.getHolidays(2024);

      // Sprawdź święta ruchome
      expect(holidays.some((h) => h.name === 'Niedziela Wielkanocna')).toBe(true);
      expect(holidays.some((h) => h.name === 'Poniedziałek Wielkanocny')).toBe(true);
      expect(holidays.some((h) => h.name === 'Zielone Świątki')).toBe(true);
      expect(holidays.some((h) => h.name === 'Boże Ciało')).toBe(true);
    });

    it('returns correct number of holidays', () => {
      const holidays = calendarService.getHolidays(2024);

      // 9 stałych + 4 ruchome (Niedziela Wielkanocna, Poniedziałek Wielkanocny, Zielone Świątki, Boże Ciało)
      expect(holidays.length).toBe(13);
    });

    it('calculates Easter correctly for different years', () => {
      const holidays2024 = calendarService.getHolidays(2024);
      const holidays2025 = calendarService.getHolidays(2025);

      const easter2024 = holidays2024.find((h) => h.name === 'Niedziela Wielkanocna');
      const easter2025 = holidays2025.find((h) => h.name === 'Niedziela Wielkanocna');

      expect(easter2024).toBeDefined();
      expect(easter2025).toBeDefined();
      // Daty Wielkanocy powinny być różne w różnych latach
      expect(easter2024?.date.getTime()).not.toBe(easter2025?.date.getTime());
    });
  });

  describe('isHoliday', () => {
    it('returns true for fixed holiday', () => {
      // Nowy Rok 2024
      const newYear = new Date(2024, 0, 1);
      expect(calendarService.isHoliday(newYear)).toBe(true);
    });

    it('returns true for movable holiday', () => {
      // Wielkanoc 2024 (31 marca)
      const easter = new Date(2024, 2, 31);
      expect(calendarService.isHoliday(easter)).toBe(true);
    });

    it('returns false for regular day', () => {
      // Zwykły dzień roboczy
      const regularDay = new Date(2024, 1, 15);
      expect(calendarService.isHoliday(regularDay)).toBe(false);
    });
  });

  describe('isWorkingDay', () => {
    it('returns false for Saturday', () => {
      const saturday = new Date(2024, 1, 10); // 10 lutego 2024 to sobota
      expect(calendarService.isWorkingDay(saturday)).toBe(false);
    });

    it('returns false for Sunday', () => {
      const sunday = new Date(2024, 1, 11); // 11 lutego 2024 to niedziela
      expect(calendarService.isWorkingDay(sunday)).toBe(false);
    });

    it('returns false for holiday', () => {
      const newYear = new Date(2024, 0, 1); // Nowy Rok
      expect(calendarService.isWorkingDay(newYear)).toBe(false);
    });

    it('returns true for regular working day', () => {
      const monday = new Date(2024, 1, 12); // 12 lutego 2024 to poniedziałek
      expect(calendarService.isWorkingDay(monday)).toBe(true);
    });
  });

  describe('countWorkingDays', () => {
    it('counts working days between two dates', () => {
      const startDate = new Date(2024, 1, 12); // Poniedziałek
      const endDate = new Date(2024, 1, 16); // Piątek

      const count = calendarService.countWorkingDays(startDate, endDate);

      // Poniedziałek do piątku = 5 dni roboczych
      expect(count).toBe(5);
    });

    it('excludes weekends from count', () => {
      const startDate = new Date(2024, 1, 12); // Poniedziałek
      const endDate = new Date(2024, 1, 18); // Niedziela

      const count = calendarService.countWorkingDays(startDate, endDate);

      // Poniedziałek do niedzieli = 5 dni roboczych (bez weekendu)
      expect(count).toBe(5);
    });

    it('excludes holidays from count', () => {
      const startDate = new Date(2024, 0, 1); // Nowy Rok (święto)
      const endDate = new Date(2024, 0, 5); // Piątek

      const count = calendarService.countWorkingDays(startDate, endDate);

      // 1 stycznia to święto, więc tylko 4 dni robocze
      expect(count).toBe(4);
    });
  });

  describe('addWorkingDays', () => {
    it('adds working days skipping weekends', () => {
      const startDate = new Date(2024, 1, 9); // Piątek
      const result = calendarService.addWorkingDays(startDate, 1);

      // +1 dzień roboczy od piątku = poniedziałek
      expect(result.getDay()).toBe(1); // Poniedziałek
    });

    it('adds working days skipping holidays', () => {
      const startDate = new Date(2023, 11, 22); // Piątek przed świętami
      const result = calendarService.addWorkingDays(startDate, 1);

      // +1 dzień roboczy = powinno pominąć weekend i Boże Narodzenie
      expect(result.getDate()).toBe(27); // 27 grudnia (środa)
    });
  });

  describe('getNextWorkingDay', () => {
    it('returns Monday when starting from Friday', () => {
      const friday = new Date(2024, 1, 9); // Piątek
      const result = calendarService.getNextWorkingDay(friday);

      expect(result.getDay()).toBe(1); // Poniedziałek
      expect(result.getDate()).toBe(12);
    });

    it('returns Tuesday when Monday is holiday', () => {
      // Znajdź niedzielę przed Poniedziałkiem Wielkanocnym
      const sunday = new Date(2024, 2, 31); // Niedziela Wielkanocna 2024
      const result = calendarService.getNextWorkingDay(sunday);

      // Poniedziałek Wielkanocny to święto, więc następny dzień roboczy to wtorek
      expect(result.getDate()).toBe(2); // 2 kwietnia (wtorek)
    });
  });

  describe('getPreviousWorkingDay', () => {
    it('returns Friday when starting from Monday', () => {
      const monday = new Date(2024, 1, 12); // Poniedziałek
      const result = calendarService.getPreviousWorkingDay(monday);

      expect(result.getDay()).toBe(5); // Piątek
      expect(result.getDate()).toBe(9);
    });
  });

  describe('getWorkingDaysInMonth', () => {
    it('returns all working days in month', () => {
      const workingDays = calendarService.getWorkingDaysInMonth(2, 2024);

      // Luty 2024 - bez świąt, 29 dni, 4 weekendy
      // Powinno być ~21 dni roboczych
      expect(workingDays.length).toBeGreaterThan(18);
      expect(workingDays.length).toBeLessThan(23);

      // Wszystkie powinny być w lutym
      workingDays.forEach((d) => {
        expect(d.getMonth()).toBe(1); // Luty
      });
    });
  });

  describe('getHolidaysInMonth', () => {
    it('returns holidays in specific month', () => {
      const holidays = calendarService.getHolidaysInMonth(12, 2024);

      // Grudzień ma Boże Narodzenie (25) i drugi dzień (26)
      expect(holidays.length).toBe(2);
      expect(holidays.some((h) => h.name === 'Boże Narodzenie')).toBe(true);
      expect(holidays.some((h) => h.name === 'Drugi dzień Bożego Narodzenia')).toBe(true);
    });

    it('returns empty array for month without holidays', () => {
      const holidays = calendarService.getHolidaysInMonth(2, 2024);

      // Luty nie ma świąt stałych, a ruchome zależą od roku
      // W 2024 Wielkanoc jest w marcu/kwietniu
      expect(holidays.length).toBe(0);
    });
  });

  describe('dependency injection', () => {
    it('allows custom Easter calculator', () => {
      const customCalculator = new EasterCalculator();
      const service = new CalendarService(mockPrisma, customCalculator);

      const holidays = service.getHolidays(2024);
      expect(holidays.some((h) => h.name === 'Niedziela Wielkanocna')).toBe(true);
    });
  });
});
