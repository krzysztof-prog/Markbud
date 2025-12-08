/**
 * Date Helpers Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseDate,
  parseDateSafe,
  formatPolishDate,
  formatPolishDateTime,
  formatISODate,
  formatPolishMonth,
  getPolishDayName,
  getPolishDayNameShort,
  getDayStart,
  getDayEnd,
  getDayRange,
  getMonthRange,
  getWeekRange,
  isWeekend,
  toRomanNumeral,
  POLISH_DAY_NAMES,
  POLISH_MONTH_NAMES,
} from './date-helpers.js';

describe('date-helpers', () => {
  describe('parseDate', () => {
    it('should parse ISO date string', () => {
      const result = parseDate('2025-12-08');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11); // December = 11
      expect(result.getDate()).toBe(8);
    });

    it('should parse ISO datetime string', () => {
      const result = parseDate('2025-12-08T14:30:00');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it('should throw error for invalid date string', () => {
      expect(() => parseDate('invalid-date')).toThrow('Invalid date string');
    });

    it('should throw error for empty string', () => {
      expect(() => parseDate('')).toThrow('Invalid date string');
    });
  });

  describe('parseDateSafe', () => {
    it('should return Date for valid string', () => {
      const result = parseDateSafe('2025-12-08');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
    });

    it('should return undefined for null', () => {
      expect(parseDateSafe(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseDateSafe(undefined)).toBeUndefined();
    });

    it('should return undefined for invalid date', () => {
      expect(parseDateSafe('invalid')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseDateSafe('')).toBeUndefined();
    });
  });

  describe('formatPolishDate', () => {
    it('should format date as DD.MM.YYYY', () => {
      const date = new Date(2025, 11, 8); // December 8, 2025
      expect(formatPolishDate(date)).toBe('08.12.2025');
    });

    it('should pad single digits with zeros', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(formatPolishDate(date)).toBe('05.01.2025');
    });
  });

  describe('formatPolishDateTime', () => {
    it('should format date and time as DD.MM.YYYY HH:mm', () => {
      const date = new Date(2025, 11, 8, 14, 30);
      expect(formatPolishDateTime(date)).toBe('08.12.2025 14:30');
    });

    it('should pad hours and minutes with zeros', () => {
      const date = new Date(2025, 0, 5, 9, 5);
      expect(formatPolishDateTime(date)).toBe('05.01.2025 09:05');
    });
  });

  describe('formatISODate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 11, 8);
      expect(formatISODate(date)).toBe('2025-12-08');
    });
  });

  describe('formatPolishMonth', () => {
    it('should format month name in Polish with year', () => {
      const date = new Date(2025, 11, 8); // December
      const result = formatPolishMonth(date);
      expect(result.toLowerCase()).toContain('grudzień');
      expect(result).toContain('2025');
    });

    it('should handle January correctly', () => {
      const date = new Date(2025, 0, 15);
      const result = formatPolishMonth(date);
      expect(result.toLowerCase()).toContain('styczeń');
    });
  });

  describe('getPolishDayName', () => {
    it('should return Polish day name for Monday', () => {
      const monday = new Date(2025, 11, 8); // Monday December 8, 2025
      expect(getPolishDayName(monday).toLowerCase()).toBe('poniedziałek');
    });

    it('should return Polish day name for Sunday', () => {
      const sunday = new Date(2025, 11, 7);
      expect(getPolishDayName(sunday).toLowerCase()).toBe('niedziela');
    });
  });

  describe('getPolishDayNameShort', () => {
    it('should return short Polish day name', () => {
      const monday = new Date(2025, 11, 8);
      const result = getPolishDayNameShort(monday).toLowerCase();
      expect(result).toMatch(/^pon/);
    });
  });

  describe('getDayStart', () => {
    it('should return start of day (00:00:00.000)', () => {
      const date = new Date(2025, 11, 8, 14, 30, 45, 123);
      const result = getDayStart(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('getDayEnd', () => {
    it('should return end of day (23:59:59.999)', () => {
      const date = new Date(2025, 11, 8, 14, 30);
      const result = getDayEnd(date);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('getDayRange', () => {
    it('should return start and end of day', () => {
      const date = new Date(2025, 11, 8, 14, 30);
      const { start, end } = getDayRange(date);

      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);

      // Same date
      expect(start.getDate()).toBe(8);
      expect(end.getDate()).toBe(8);
    });
  });

  describe('getMonthRange', () => {
    it('should return first and last day of month', () => {
      const date = new Date(2025, 11, 15); // December 2025
      const { start, end } = getMonthRange(date);

      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(11);
      expect(end.getDate()).toBe(31);
      expect(end.getMonth()).toBe(11);
    });

    it('should handle February correctly', () => {
      const date = new Date(2025, 1, 15); // February 2025 (non-leap year)
      const { start, end } = getMonthRange(date);

      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(28);
    });

    it('should handle leap year February', () => {
      const date = new Date(2024, 1, 15); // February 2024 (leap year)
      const { end } = getMonthRange(date);

      expect(end.getDate()).toBe(29);
    });
  });

  describe('getWeekRange', () => {
    it('should return Monday to Sunday range', () => {
      const wednesday = new Date(2025, 11, 10); // Wednesday
      const { start, end } = getWeekRange(wednesday);

      // Monday = 1, Sunday = 0
      expect(start.getDay()).toBe(1); // Monday
      expect(end.getDay()).toBe(0); // Sunday
    });

    it('should handle date on Monday', () => {
      const monday = new Date(2025, 11, 8); // Monday
      const { start } = getWeekRange(monday);

      expect(start.getDate()).toBe(8);
    });

    it('should handle date on Sunday', () => {
      const sunday = new Date(2025, 11, 7); // Sunday
      const { start, end } = getWeekRange(sunday);

      expect(start.getDate()).toBe(1); // Previous Monday
      expect(end.getDate()).toBe(7); // This Sunday
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date(2025, 11, 6);
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date(2025, 11, 7);
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for Monday', () => {
      const monday = new Date(2025, 11, 8);
      expect(isWeekend(monday)).toBe(false);
    });

    it('should return false for Friday', () => {
      const friday = new Date(2025, 11, 5);
      expect(isWeekend(friday)).toBe(false);
    });
  });

  describe('toRomanNumeral', () => {
    it('should convert 1 to I', () => {
      expect(toRomanNumeral(1)).toBe('I');
    });

    it('should convert 2 to II', () => {
      expect(toRomanNumeral(2)).toBe('II');
    });

    it('should convert 3 to III', () => {
      expect(toRomanNumeral(3)).toBe('III');
    });

    it('should convert 4 to IV', () => {
      expect(toRomanNumeral(4)).toBe('IV');
    });

    it('should convert 5 to V', () => {
      expect(toRomanNumeral(5)).toBe('V');
    });

    it('should convert 9 to IX', () => {
      expect(toRomanNumeral(9)).toBe('IX');
    });

    it('should convert 10 to X', () => {
      expect(toRomanNumeral(10)).toBe('X');
    });

    it('should fallback to string for numbers > 10', () => {
      expect(toRomanNumeral(11)).toBe('11');
    });

    it('should fallback to string for 0', () => {
      expect(toRomanNumeral(0)).toBe('0');
    });
  });

  describe('POLISH_DAY_NAMES', () => {
    it('should have 7 days', () => {
      expect(POLISH_DAY_NAMES).toHaveLength(7);
    });

    it('should start with Sunday (index 0)', () => {
      expect(POLISH_DAY_NAMES[0]).toBe('Niedziela');
    });

    it('should have Monday at index 1', () => {
      expect(POLISH_DAY_NAMES[1]).toBe('Poniedziałek');
    });

    it('should end with Saturday (index 6)', () => {
      expect(POLISH_DAY_NAMES[6]).toBe('Sobota');
    });
  });

  describe('POLISH_MONTH_NAMES', () => {
    it('should have 12 months', () => {
      expect(POLISH_MONTH_NAMES).toHaveLength(12);
    });

    it('should start with January', () => {
      expect(POLISH_MONTH_NAMES[0]).toBe('Styczeń');
    });

    it('should end with December', () => {
      expect(POLISH_MONTH_NAMES[11]).toBe('Grudzień');
    });
  });
});
