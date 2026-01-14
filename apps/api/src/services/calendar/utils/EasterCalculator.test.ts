/**
 * EasterCalculator Unit Tests
 *
 * Testy dla kalkulatora daty Wielkanocy i świąt ruchomych
 */

import { describe, it, expect } from 'vitest';
import { EasterCalculator, easterCalculator } from './EasterCalculator.js';

describe('EasterCalculator', () => {
  let calculator: EasterCalculator;

  beforeEach(() => {
    calculator = new EasterCalculator();
  });

  describe('calculateEaster', () => {
    it('calculates Easter 2024 correctly', () => {
      const easter = calculator.calculateEaster(2024);

      // Wielkanoc 2024 to 31 marca
      expect(easter.getFullYear()).toBe(2024);
      expect(easter.getMonth()).toBe(2); // Marzec (0-indexed)
      expect(easter.getDate()).toBe(31);
    });

    it('calculates Easter 2025 correctly', () => {
      const easter = calculator.calculateEaster(2025);

      // Wielkanoc 2025 to 20 kwietnia
      expect(easter.getFullYear()).toBe(2025);
      expect(easter.getMonth()).toBe(3); // Kwiecień (0-indexed)
      expect(easter.getDate()).toBe(20);
    });

    it('calculates Easter 2026 correctly', () => {
      const easter = calculator.calculateEaster(2026);

      // Wielkanoc 2026 to 5 kwietnia
      expect(easter.getFullYear()).toBe(2026);
      expect(easter.getMonth()).toBe(3); // Kwiecień (0-indexed)
      expect(easter.getDate()).toBe(5);
    });

    it('calculates Easter for years in March correctly', () => {
      // Wielkanoc 2024 jest w marcu (31 marca)
      const easter = calculator.calculateEaster(2024);
      expect(easter.getMonth()).toBe(2); // Marzec
    });

    it('calculates Easter for years in April correctly', () => {
      // Wielkanoc 2023 była w kwietniu (9 kwietnia)
      const easter = calculator.calculateEaster(2023);
      expect(easter.getMonth()).toBe(3); // Kwiecień
      expect(easter.getDate()).toBe(9);
    });

    it('calculates Easter for past years correctly', () => {
      // Wielkanoc 2000 - 23 kwietnia
      const easter2000 = calculator.calculateEaster(2000);
      expect(easter2000.getMonth()).toBe(3); // Kwiecień
      expect(easter2000.getDate()).toBe(23);
    });

    it('calculates Easter for future years consistently', () => {
      // Sprawdź że dla tego samego roku zawsze daje ten sam wynik
      const easter1 = calculator.calculateEaster(2030);
      const easter2 = calculator.calculateEaster(2030);

      expect(easter1.getTime()).toBe(easter2.getTime());
    });
  });

  describe('getMovableHolidays', () => {
    it('returns all 4 movable holidays', () => {
      const holidays = calculator.getMovableHolidays(2024);

      expect(holidays.length).toBe(4);
    });

    it('includes Easter Sunday', () => {
      const holidays = calculator.getMovableHolidays(2024);
      const easter = holidays.find((h) => h.name === 'Niedziela Wielkanocna');

      expect(easter).toBeDefined();
      expect(easter?.daysFromEaster).toBe(0);
      expect(easter?.date.getMonth()).toBe(2); // Marzec 2024
      expect(easter?.date.getDate()).toBe(31);
    });

    it('includes Easter Monday (+1 day)', () => {
      const holidays = calculator.getMovableHolidays(2024);
      const easterMonday = holidays.find((h) => h.name === 'Poniedziałek Wielkanocny');

      expect(easterMonday).toBeDefined();
      expect(easterMonday?.daysFromEaster).toBe(1);
      // 31 marca + 1 = 1 kwietnia
      expect(easterMonday?.date.getMonth()).toBe(3); // Kwiecień
      expect(easterMonday?.date.getDate()).toBe(1);
    });

    it('includes Pentecost (+49 days)', () => {
      const holidays = calculator.getMovableHolidays(2024);
      const pentecost = holidays.find((h) => h.name === 'Zielone Świątki');

      expect(pentecost).toBeDefined();
      expect(pentecost?.daysFromEaster).toBe(49);
      // 31 marca + 49 = 19 maja
      expect(pentecost?.date.getMonth()).toBe(4); // Maj
      expect(pentecost?.date.getDate()).toBe(19);
    });

    it('includes Corpus Christi (+60 days)', () => {
      const holidays = calculator.getMovableHolidays(2024);
      const corpusChristi = holidays.find((h) => h.name === 'Boże Ciało');

      expect(corpusChristi).toBeDefined();
      expect(corpusChristi?.daysFromEaster).toBe(60);
      // 31 marca + 60 = 30 maja
      expect(corpusChristi?.date.getMonth()).toBe(4); // Maj
      expect(corpusChristi?.date.getDate()).toBe(30);
    });

    it('all holidays have isWorking=false', () => {
      const holidays = calculator.getMovableHolidays(2024);

      holidays.forEach((h) => {
        expect(h.isWorking).toBe(false);
      });
    });

    it('all holidays have country=PL', () => {
      const holidays = calculator.getMovableHolidays(2024);

      holidays.forEach((h) => {
        expect(h.country).toBe('PL');
      });
    });
  });

  describe('singleton instance', () => {
    it('exports singleton easterCalculator', () => {
      expect(easterCalculator).toBeInstanceOf(EasterCalculator);
    });

    it('singleton works correctly', () => {
      const easter = easterCalculator.calculateEaster(2024);

      expect(easter.getMonth()).toBe(2);
      expect(easter.getDate()).toBe(31);
    });
  });
});

// Import beforeEach from vitest at the top
import { beforeEach } from 'vitest';
