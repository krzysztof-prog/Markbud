import { describe, it, expect } from 'vitest';
import {
  extractOrderNumbers,
  isWarehouseItem,
  parseDeliveryWeek,
  aggregateSchucoStatus,
} from './schucoOrderMatcher.js';

describe('extractOrderNumbers', () => {
  it('should extract single 5-digit number from standard format', () => {
    expect(extractOrderNumbers('23/2026/54255')).toEqual(['54255']);
  });

  it('should extract multiple 5-digit numbers separated by slash', () => {
    expect(extractOrderNumbers('123/2026/54255/54365')).toEqual(['54255', '54365']);
  });

  it('should extract multiple 5-digit numbers separated by space', () => {
    expect(extractOrderNumbers('456/2027/54251 54632 54855')).toEqual(['54251', '54632', '54855']);
  });

  it('should extract only 5-digit numbers, ignoring 4-digit', () => {
    expect(extractOrderNumbers('456/2027/54251 5463 54855')).toEqual(['54251', '54855']);
  });

  it('should extract mixed format with slashes and spaces', () => {
    expect(extractOrderNumbers('789/2026/54321 54322')).toEqual(['54321', '54322']);
  });

  it('should return empty array for warehouse items (no 5-digit numbers)', () => {
    expect(extractOrderNumbers('PALETA-2026-001')).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(extractOrderNumbers('')).toEqual([]);
  });

  it('should handle year as part of format (not extract year)', () => {
    // 2026 is only 4 digits, should not be extracted
    expect(extractOrderNumbers('123/2026')).toEqual([]);
  });

  it('should remove duplicates', () => {
    expect(extractOrderNumbers('123/2026/54255/54255')).toEqual(['54255']);
  });

  it('should extract from complex mixed format', () => {
    expect(extractOrderNumbers('MAG/2026/54321-54322/54323 extra')).toEqual([
      '54321',
      '54322',
      '54323',
    ]);
  });
});

describe('isWarehouseItem', () => {
  it('should return true when no 5-digit numbers found', () => {
    expect(isWarehouseItem('PALETA-2026-001')).toBe(true);
  });

  it('should return true for empty string', () => {
    expect(isWarehouseItem('')).toBe(true);
  });

  it('should return false when 5-digit numbers found', () => {
    expect(isWarehouseItem('23/2026/54255')).toBe(false);
  });

  it('should return false for complex format with order numbers', () => {
    expect(isWarehouseItem('123/2026/54255/54365')).toBe(false);
  });
});

describe('parseDeliveryWeek', () => {
  it('should parse standard format KW 03/2026', () => {
    const result = parseDeliveryWeek('KW 03/2026');
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2026);
  });

  it('should parse format without space KW03/2026', () => {
    const result = parseDeliveryWeek('KW03/2026');
    expect(result).not.toBeNull();
  });

  it('should parse format without KW prefix 03/2026', () => {
    const result = parseDeliveryWeek('03/2026');
    expect(result).not.toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseDeliveryWeek('')).toBeNull();
  });

  it('should return null for null', () => {
    expect(parseDeliveryWeek(null)).toBeNull();
  });

  it('should return null for invalid week number', () => {
    expect(parseDeliveryWeek('KW 55/2026')).toBeNull();
  });

  it('should return null for invalid year', () => {
    expect(parseDeliveryWeek('KW 03/1999')).toBeNull();
  });

  it('should parse week 1 correctly', () => {
    const result = parseDeliveryWeek('KW 01/2026');
    expect(result).not.toBeNull();
    // Week 1 of 2026 starts on Monday, December 29, 2025 (ISO week)
    // So month could be December (11) or January (0)
    expect(result?.getMonth()).toBeGreaterThanOrEqual(0); // Valid month
  });

  it('should parse week 52 correctly', () => {
    const result = parseDeliveryWeek('KW 52/2026');
    expect(result).not.toBeNull();
    // Tydzień 52 powinien być pod koniec roku
    expect(result?.getMonth()).toBeGreaterThanOrEqual(10); // Listopad lub Grudzień
  });
});

describe('aggregateSchucoStatus', () => {
  it('should return worst status (otwarte) when mixed', () => {
    const result = aggregateSchucoStatus(['Dostarczone', 'Otwarte', 'Wysłane']);
    expect(result.toLowerCase()).toBe('otwarte');
  });

  it('should return wysłane when no otwarte', () => {
    const result = aggregateSchucoStatus(['Dostarczone', 'Wysłane']);
    expect(result.toLowerCase()).toBe('wysłane');
  });

  it('should return dostarczone when all delivered', () => {
    const result = aggregateSchucoStatus(['Dostarczone', 'Dostarczone']);
    expect(result.toLowerCase()).toBe('dostarczone');
  });

  it('should return empty string for empty array', () => {
    expect(aggregateSchucoStatus([])).toBe('');
  });

  it('should handle single status', () => {
    expect(aggregateSchucoStatus(['Wysłane'])).toBe('Wysłane');
  });

  it('should handle unknown status (return first)', () => {
    const result = aggregateSchucoStatus(['Nieznany Status']);
    expect(result).toBe('Nieznany Status');
  });

  it('should be case insensitive', () => {
    const result = aggregateSchucoStatus(['DOSTARCZONE', 'otwarte', 'Wysłane']);
    expect(result.toLowerCase()).toBe('otwarte');
  });

  it('should handle English statuses', () => {
    const result = aggregateSchucoStatus(['delivered', 'open', 'shipped']);
    expect(result.toLowerCase()).toBe('open');
  });

  it('should handle mixed Polish and English', () => {
    const result = aggregateSchucoStatus(['Dostarczone', 'open', 'shipped']);
    expect(result.toLowerCase()).toBe('open');
  });

  it('should prioritize "w realizacji" as worst', () => {
    const result = aggregateSchucoStatus(['Dostarczone', 'w realizacji']);
    expect(result.toLowerCase()).toBe('w realizacji');
  });

  it('should handle multiple unknown statuses (return first if all unknown)', () => {
    const result = aggregateSchucoStatus(['Unknown1', 'Unknown2', 'Unknown3']);
    // When all statuses have priority 0 (unknown), it should return the first one
    expect(result).toBeTruthy();
    expect(['Unknown1', 'Unknown2', 'Unknown3']).toContain(result);
  });

  it('should handle very long status list', () => {
    const statuses = Array(100).fill('Dostarczone');
    statuses[50] = 'Otwarte';
    const result = aggregateSchucoStatus(statuses);
    expect(result.toLowerCase()).toBe('otwarte');
  });
});

describe('extractOrderNumbers - Additional Edge Cases', () => {
  it('should handle numbers at the very start', () => {
    expect(extractOrderNumbers('54255/2026/extra')).toEqual(['54255']);
  });

  it('should handle numbers at the very end', () => {
    expect(extractOrderNumbers('extra/2026/54255')).toEqual(['54255']);
  });

  it('should not extract 6-digit numbers', () => {
    expect(extractOrderNumbers('123456/2026/54255')).toEqual(['54255']);
  });

  it('should handle special characters between numbers', () => {
    expect(extractOrderNumbers('54255-54365_54321')).toEqual(['54255', '54365', '54321']);
  });

  it('should handle numbers in parentheses', () => {
    expect(extractOrderNumbers('(54255)')).toEqual(['54255']);
  });

  it('should handle very long string with multiple numbers', () => {
    const input = '123/2026/' + Array.from({ length: 20 }, (_, i) => (54200 + i).toString()).join('/');
    const result = extractOrderNumbers(input);
    expect(result.length).toBe(20);
    expect(result).toContain('54200');
    expect(result).toContain('54219');
  });

  it('should handle Unicode and special characters', () => {
    expect(extractOrderNumbers('Zamówienie-54255/données')).toEqual(['54255']);
  });

  it('should handle newlines and tabs', () => {
    expect(extractOrderNumbers('123/2026\n54255\t54365')).toEqual(['54255', '54365']);
  });
});

describe('parseDeliveryWeek - Additional Edge Cases', () => {
  it('should handle lowercase kw', () => {
    const result = parseDeliveryWeek('kw 03/2026');
    expect(result).not.toBeNull();
  });

  it('should handle extra spaces', () => {
    const result = parseDeliveryWeek('KW  03 / 2026');
    expect(result).not.toBeNull();
  });

  it('should handle single-digit week without leading zero', () => {
    const result = parseDeliveryWeek('KW 3/2026');
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2026);
  });

  it('should handle week 53 (valid leap year scenario)', () => {
    const result = parseDeliveryWeek('KW 53/2026');
    expect(result).not.toBeNull();
  });

  it('should reject week 0', () => {
    expect(parseDeliveryWeek('KW 0/2026')).toBeNull();
  });

  it('should reject week 54', () => {
    expect(parseDeliveryWeek('KW 54/2026')).toBeNull();
  });

  it('should reject year 2019 (too old)', () => {
    expect(parseDeliveryWeek('KW 03/2019')).toBeNull();
  });

  it('should reject year 2101 (too far in future)', () => {
    expect(parseDeliveryWeek('KW 03/2101')).toBeNull();
  });

  it('should accept year 2020 (boundary)', () => {
    const result = parseDeliveryWeek('KW 01/2020');
    expect(result).not.toBeNull();
  });

  it('should accept year 2100 (boundary)', () => {
    const result = parseDeliveryWeek('KW 01/2100');
    expect(result).not.toBeNull();
  });

  it('should handle malformed strings gracefully', () => {
    expect(parseDeliveryWeek('KW/2026')).toBeNull();
    expect(parseDeliveryWeek('KW 03/')).toBeNull();
    expect(parseDeliveryWeek('/2026')).toBeNull();
    expect(parseDeliveryWeek('KW abc/2026')).toBeNull();
    expect(parseDeliveryWeek('random text')).toBeNull();
  });

  it('should calculate correct Monday for week 1 of 2026', () => {
    const result = parseDeliveryWeek('KW 01/2026');
    expect(result).not.toBeNull();
    // Week 1 of 2026 should start on Monday
    expect(result?.getDay()).toBe(1); // Monday = 1
  });

  it('should calculate different dates for different weeks', () => {
    const week1 = parseDeliveryWeek('KW 01/2026');
    const week2 = parseDeliveryWeek('KW 02/2026');
    expect(week2?.getTime()).toBeGreaterThan(week1?.getTime() || 0);
    const diff = (week2?.getTime() || 0) - (week1?.getTime() || 0);
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000); // Exactly 7 days
  });
});

describe('isWarehouseItem - Additional Edge Cases', () => {
  it('should return true for undefined (falsy value)', () => {
    // @ts-expect-error Testing edge case
    expect(isWarehouseItem(undefined)).toBe(true);
  });

  it('should return true for strings with only 4-digit numbers', () => {
    expect(isWarehouseItem('1234/2026/5678')).toBe(true);
  });

  it('should return true for strings with only 6-digit numbers', () => {
    expect(isWarehouseItem('123456/789012')).toBe(true);
  });

  it('should return false for mixed format with at least one 5-digit', () => {
    expect(isWarehouseItem('PALETA-54255')).toBe(false);
  });
});
