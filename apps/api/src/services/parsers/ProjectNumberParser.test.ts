/**
 * ProjectNumberParser Unit Tests
 *
 * Testuje parsowanie numerów projektów z treści maila:
 * - Wykrywanie daty dostawy
 * - Ekstrakcja numerów projektów
 * - Walidacja i normalizacja
 */

import { describe, it, expect } from 'vitest';
import {
  parseMailContent,
  extractDeliveryDate,
  extractProjectNumbers,
  isValidProjectNumber,
  normalizeProjectNumber,
} from './ProjectNumberParser.js';

describe('ProjectNumberParser', () => {
  describe('extractDeliveryDate', () => {
    // Używamy stałego roku dla przewidywalnych testów
    const TEST_YEAR = 2026;

    describe('format "na DD.MM"', () => {
      it('should parse "na 22.01" as January 22nd', () => {
        const result = extractDeliveryDate('na 22.01', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getDate()).toBe(22);
        expect(result.date?.getMonth()).toBe(0); // January = 0
        expect(result.date?.getFullYear()).toBe(TEST_YEAR);
        expect(result.rawText).toBe('22.01');
      });

      it('should parse "na 22/01" (slash separator)', () => {
        const result = extractDeliveryDate('na 22/01', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getDate()).toBe(22);
        expect(result.date?.getMonth()).toBe(0);
      });

      it('should parse "na 5.1" (without leading zeros)', () => {
        const result = extractDeliveryDate('na 5.1', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getDate()).toBe(5);
        expect(result.date?.getMonth()).toBe(0);
        expect(result.rawText).toBe('5.1');
      });

      it('should parse "na 22.01.2026" (with year)', () => {
        const result = extractDeliveryDate('na 22.01.2026', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getDate()).toBe(22);
        expect(result.date?.getMonth()).toBe(0);
        expect(result.date?.getFullYear()).toBe(2026);
        expect(result.rawText).toBe('22.01.2026');
      });

      it('should parse "na 22.01.26" (2-digit year)', () => {
        const result = extractDeliveryDate('na 22.01.26', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getFullYear()).toBe(2026);
      });
    });

    describe('format "do DD.MM"', () => {
      it('should parse "do 22.01" as January 22nd', () => {
        const result = extractDeliveryDate('do 22.01', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getDate()).toBe(22);
        expect(result.date?.getMonth()).toBe(0);
      });

      it('should parse "do 15/03" with slash', () => {
        const result = extractDeliveryDate('do 15/03', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getDate()).toBe(15);
        expect(result.date?.getMonth()).toBe(2); // March = 2
      });
    });

    describe('format "dostawa DD.MM"', () => {
      it('should parse "dostawa 22.01"', () => {
        const result = extractDeliveryDate('dostawa 22.01', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getDate()).toBe(22);
        expect(result.date?.getMonth()).toBe(0);
      });

      it('should parse "dostawy 10.05"', () => {
        const result = extractDeliveryDate('dostawy 10.05', TEST_YEAR);

        expect(result.date).not.toBeNull();
        expect(result.date?.getDate()).toBe(10);
        expect(result.date?.getMonth()).toBe(4); // May = 4
      });
    });

    describe('no date found', () => {
      it('should return null when no date pattern found', () => {
        const result = extractDeliveryDate('Proszę o profile', TEST_YEAR);

        expect(result.date).toBeNull();
        expect(result.rawText).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = extractDeliveryDate('', TEST_YEAR);

        expect(result.date).toBeNull();
      });

      it('should return null for standalone date without keyword', () => {
        const result = extractDeliveryDate('22.01', TEST_YEAR);

        expect(result.date).toBeNull();
      });
    });

    describe('invalid dates', () => {
      it('should return null for invalid day (32)', () => {
        const result = extractDeliveryDate('na 32.01', TEST_YEAR);

        expect(result.date).toBeNull();
      });

      it('should return null for invalid month (13)', () => {
        const result = extractDeliveryDate('na 22.13', TEST_YEAR);

        expect(result.date).toBeNull();
      });

      it('should return null for impossible date (31.02)', () => {
        const result = extractDeliveryDate('na 31.02', TEST_YEAR);

        expect(result.date).toBeNull();
      });
    });

    describe('uses current year by default', () => {
      it('should use current year when not specified', () => {
        const result = extractDeliveryDate('na 22.01');
        const currentYear = new Date().getFullYear();

        expect(result.date).not.toBeNull();
        expect(result.date?.getFullYear()).toBe(currentYear);
      });
    });
  });

  describe('extractProjectNumbers', () => {
    describe('basic extraction', () => {
      it('should extract multiple projects from comma-separated list', () => {
        const result = extractProjectNumbers('D3455, C7814, D1234');

        expect(result).toHaveLength(3);
        expect(result.map((r) => r.projectNumber)).toEqual([
          'D3455',
          'C7814',
          'D1234',
        ]);
      });

      it('should extract projects from sentence', () => {
        const result = extractProjectNumbers('Proszę o D3455 i C7814');

        expect(result).toHaveLength(2);
        expect(result.map((r) => r.projectNumber)).toEqual(['D3455', 'C7814']);
      });

      it('should extract single project', () => {
        const result = extractProjectNumbers('D3455');

        expect(result).toHaveLength(1);
        expect(result[0].projectNumber).toBe('D3455');
      });
    });

    describe('duplicate handling', () => {
      it('should remove duplicates', () => {
        const result = extractProjectNumbers('D3455, D3455, D3455');

        expect(result).toHaveLength(1);
        expect(result[0].projectNumber).toBe('D3455');
      });

      it('should remove duplicates with different casing', () => {
        const result = extractProjectNumbers('D3455, d3455');

        expect(result).toHaveLength(1);
        expect(result[0].projectNumber).toBe('D3455'); // Normalized to uppercase
      });
    });

    describe('invalid formats', () => {
      it('should not match plain text (BUDEX)', () => {
        const result = extractProjectNumbers('BUDEX, Kachnowicz');

        expect(result).toHaveLength(0);
      });

      it('should not match numbers without letter prefix', () => {
        const result = extractProjectNumbers('123, 4567');

        expect(result).toHaveLength(0);
      });

      it('should not match too short numbers (2 digits)', () => {
        const result = extractProjectNumbers('D12');

        expect(result).toHaveLength(0);
      });

      it('should not match too long numbers (6 digits)', () => {
        const result = extractProjectNumbers('D123456');

        expect(result).toHaveLength(0);
      });
    });

    describe('valid length variations', () => {
      it('should match 3-digit project (D123)', () => {
        const result = extractProjectNumbers('D123');

        expect(result).toHaveLength(1);
        expect(result[0].projectNumber).toBe('D123');
      });

      it('should match 4-digit project (D1234)', () => {
        const result = extractProjectNumbers('D1234');

        expect(result).toHaveLength(1);
        expect(result[0].projectNumber).toBe('D1234');
      });

      it('should match 5-digit project (D12345)', () => {
        const result = extractProjectNumbers('D12345');

        expect(result).toHaveLength(1);
        expect(result[0].projectNumber).toBe('D12345');
      });
    });

    describe('position tracking', () => {
      it('should track position of found projects', () => {
        const text = 'Start D3455 middle C7814 end';
        const result = extractProjectNumbers(text);

        expect(result).toHaveLength(2);
        expect(result[0].position).toBe(6); // "D3455" starts at index 6
        expect(result[1].position).toBe(19); // "C7814" starts at index 19
      });
    });

    describe('case handling', () => {
      it('should only match uppercase letters (regex is case-sensitive)', () => {
        // Regex używa [A-Z] bez flagi i, więc małe litery nie są dopasowywane
        const result = extractProjectNumbers('d3455, c7814');

        expect(result).toHaveLength(0);
      });

      it('should match uppercase project numbers', () => {
        const result = extractProjectNumbers('D3455, C7814');

        expect(result).toHaveLength(2);
        expect(result[0].projectNumber).toBe('D3455');
        expect(result[1].projectNumber).toBe('C7814');
      });
    });
  });

  describe('isValidProjectNumber', () => {
    describe('valid project numbers', () => {
      it('should return true for D3455 (uppercase)', () => {
        expect(isValidProjectNumber('D3455')).toBe(true);
      });

      it('should return true for d3455 (lowercase)', () => {
        expect(isValidProjectNumber('d3455')).toBe(true);
      });

      it('should return true for C7814', () => {
        expect(isValidProjectNumber('C7814')).toBe(true);
      });

      it('should return true for A123 (3 digits)', () => {
        expect(isValidProjectNumber('A123')).toBe(true);
      });

      it('should return true for Z12345 (5 digits)', () => {
        expect(isValidProjectNumber('Z12345')).toBe(true);
      });
    });

    describe('invalid project numbers', () => {
      it('should return false for BUDEX (no digits)', () => {
        expect(isValidProjectNumber('BUDEX')).toBe(false);
      });

      it('should return false for 123 (no letter prefix)', () => {
        expect(isValidProjectNumber('123')).toBe(false);
      });

      it('should return false for D12 (too short)', () => {
        expect(isValidProjectNumber('D12')).toBe(false);
      });

      it('should return false for D123456 (too long)', () => {
        expect(isValidProjectNumber('D123456')).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isValidProjectNumber('')).toBe(false);
      });

      it('should return false for DD1234 (two letters)', () => {
        expect(isValidProjectNumber('DD1234')).toBe(false);
      });

      it('should return false for 1D234 (letter in middle)', () => {
        expect(isValidProjectNumber('1D234')).toBe(false);
      });
    });
  });

  describe('normalizeProjectNumber', () => {
    it('should convert lowercase to uppercase', () => {
      expect(normalizeProjectNumber('d3455')).toBe('D3455');
    });

    it('should trim whitespace', () => {
      expect(normalizeProjectNumber('  D3455  ')).toBe('D3455');
    });

    it('should handle mixed case', () => {
      expect(normalizeProjectNumber('d3455')).toBe('D3455');
    });

    it('should not change already uppercase', () => {
      expect(normalizeProjectNumber('D3455')).toBe('D3455');
    });
  });

  describe('parseMailContent', () => {
    describe('full mail parsing', () => {
      it('should parse mail with date and projects', () => {
        const mailContent = `Na 22.01 proszę o:
D3455, D4312, C7814
Pozdrawiam`;

        const result = parseMailContent(mailContent);

        // Data
        expect(result.suggestedDate).not.toBeNull();
        expect(result.suggestedDate?.getDate()).toBe(22);
        expect(result.suggestedDate?.getMonth()).toBe(0);
        expect(result.rawDateText).toBe('22.01');

        // Projekty
        expect(result.projects).toHaveLength(3);
        expect(result.projects).toEqual(['D3455', 'D4312', 'C7814']);

        // Raw input
        expect(result.rawInput).toBe(mailContent);
      });

      it('should handle mail with date only', () => {
        const result = parseMailContent('Na 15.03 proszę o profile');

        expect(result.suggestedDate).not.toBeNull();
        expect(result.suggestedDate?.getDate()).toBe(15);
        expect(result.suggestedDate?.getMonth()).toBe(2);
        expect(result.projects).toHaveLength(0);
      });

      it('should handle mail with projects only', () => {
        const result = parseMailContent('Proszę o D3455 i C7814');

        expect(result.suggestedDate).toBeNull();
        expect(result.rawDateText).toBeNull();
        expect(result.projects).toHaveLength(2);
        expect(result.projects).toEqual(['D3455', 'C7814']);
      });

      it('should handle mail with no date and no projects', () => {
        const result = parseMailContent('Proszę o profile aluminiowe');

        expect(result.suggestedDate).toBeNull();
        expect(result.projects).toHaveLength(0);
      });

      it('should handle empty input', () => {
        const result = parseMailContent('');

        expect(result.suggestedDate).toBeNull();
        expect(result.projects).toHaveLength(0);
        expect(result.rawInput).toBe('');
      });
    });

    describe('complex mail formats', () => {
      it('should parse mail with multiple lines and mixed content', () => {
        const mailContent = `Dzień dobry,

Proszę o dostawę na 25.01:
- D3455 (pilne)
- C7814
- D1234

Dodatkowo potrzebuję D5678 na później.

Pozdrawiam,
Jan Kowalski`;

        const result = parseMailContent(mailContent);

        expect(result.suggestedDate).not.toBeNull();
        expect(result.suggestedDate?.getDate()).toBe(25);
        expect(result.projects).toHaveLength(4);
        expect(result.projects).toContain('D3455');
        expect(result.projects).toContain('C7814');
        expect(result.projects).toContain('D1234');
        expect(result.projects).toContain('D5678');
      });

      it('should handle polish characters in surrounding text', () => {
        const result = parseMailContent('Proszę o D3455 na środę');

        expect(result.projects).toHaveLength(1);
        expect(result.projects[0]).toBe('D3455');
      });

      it('should deduplicate projects mentioned multiple times', () => {
        const mailContent = `D3455 jest pilny.
Przypominam: D3455!
Czy D3455 będzie gotowy?`;

        const result = parseMailContent(mailContent);

        expect(result.projects).toHaveLength(1);
        expect(result.projects[0]).toBe('D3455');
      });
    });
  });
});
