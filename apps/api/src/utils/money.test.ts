import { describe, it, expect } from 'vitest';
import {
  plnToGrosze,
  groszeToPln,
  eurToCenty,
  centyToEur,
  convertEurToPlnGrosze,
  convertPlnToEurCenty,
  formatGrosze,
  formatCenty,
  validateMonetaryValue,
  sumMonetary,
  type Grosze,
  type Centy,
} from './money.js';

describe('Money Utilities', () => {
  describe('plnToGrosze', () => {
    it('should convert PLN to grosze correctly', () => {
      expect(plnToGrosze(123.45)).toBe(12345);
      expect(plnToGrosze(0)).toBe(0);
      expect(plnToGrosze(0.01)).toBe(1);
      expect(plnToGrosze(999999.99)).toBe(99999999);
    });

    it('should handle floating point precision issues', () => {
      // Due to floating point representation, 0.1 + 0.2 !== 0.3
      // But these should still convert correctly since they are within tolerance
      expect(plnToGrosze(0.1 + 0.2)).toBe(30); // ~0.30 PLN
      expect(plnToGrosze(1.01)).toBe(101);
      expect(plnToGrosze(99.99)).toBe(9999);
    });

    it('should throw on infinite values', () => {
      expect(() => plnToGrosze(Infinity)).toThrow('finite number');
      expect(() => plnToGrosze(NaN)).toThrow('finite number');
    });

    it('should throw on excessive precision', () => {
      expect(() => plnToGrosze(123.4567)).toThrow('too much precision');
    });
  });

  describe('groszeToPln', () => {
    it('should convert grosze to PLN correctly', () => {
      expect(groszeToPln(12345 as Grosze)).toBe(123.45);
      expect(groszeToPln(0 as Grosze)).toBe(0);
      expect(groszeToPln(1 as Grosze)).toBe(0.01);
      expect(groszeToPln(99999999 as Grosze)).toBe(999999.99);
    });

    it('should throw on non-integer grosze', () => {
      expect(() => groszeToPln(123.45 as Grosze)).toThrow('must be an integer');
    });
  });

  describe('eurToCenty', () => {
    it('should convert EUR to cents correctly', () => {
      expect(eurToCenty(123.45)).toBe(12345);
      expect(eurToCenty(0)).toBe(0);
      expect(eurToCenty(0.01)).toBe(1);
    });

    it('should throw on excessive precision', () => {
      expect(() => eurToCenty(123.4567)).toThrow('too much precision');
    });
  });

  describe('centyToEur', () => {
    it('should convert cents to EUR correctly', () => {
      expect(centyToEur(12345 as Centy)).toBe(123.45);
      expect(centyToEur(0 as Centy)).toBe(0);
      expect(centyToEur(1 as Centy)).toBe(0.01);
    });
  });

  describe('convertEurToPlnGrosze', () => {
    it('should convert EUR to PLN using exchange rate', () => {
      // 100 EUR at rate 4.50 PLN/EUR = 450 PLN
      const eurCenty = 10000 as Centy; // 100.00 EUR
      const rate = 450; // 4.50 PLN/EUR stored as grosze
      const result = convertEurToPlnGrosze(eurCenty, rate);
      expect(result).toBe(45000); // 450.00 PLN in grosze
    });

    it('should handle small amounts', () => {
      const eurCenty = 1 as Centy; // 0.01 EUR
      const rate = 450; // 4.50 PLN/EUR
      const result = convertEurToPlnGrosze(eurCenty, rate);
      expect(result).toBe(5); // 0.05 PLN (rounded)
    });

    it('should throw on overflow', () => {
      const eurCenty = Number.MAX_SAFE_INTEGER as Centy;
      const rate = 1000;
      expect(() => convertEurToPlnGrosze(eurCenty, rate)).toThrow('exceeds maximum');
    });

    it('should throw on non-integer inputs', () => {
      expect(() => convertEurToPlnGrosze(123.45 as Centy, 450)).toThrow('must be integers');
    });
  });

  describe('convertPlnToEurCenty', () => {
    it('should convert PLN to EUR using exchange rate', () => {
      // 450 PLN at rate 4.50 PLN/EUR = 100 EUR
      const plnGrosze = 45000 as Grosze; // 450.00 PLN
      const rate = 450; // 4.50 PLN/EUR
      const result = convertPlnToEurCenty(plnGrosze, rate);
      expect(result).toBe(10000); // 100.00 EUR in cents
    });

    it('should throw on zero rate', () => {
      expect(() => convertPlnToEurCenty(100 as Grosze, 0)).toThrow('cannot be zero');
    });
  });

  describe('formatGrosze', () => {
    it('should format grosze as PLN string', () => {
      const formatted = formatGrosze(12345 as Grosze);
      expect(formatted).toContain('123');
      expect(formatted).toContain('45');
      expect(formatted).toContain('zł');
    });

    it('should handle zero', () => {
      const formatted = formatGrosze(0 as Grosze);
      expect(formatted).toContain('0');
    });
  });

  describe('formatCenty', () => {
    it('should format cents as EUR string', () => {
      const formatted = formatCenty(12345 as Centy);
      expect(formatted).toContain('123');
      expect(formatted).toContain('45');
      expect(formatted).toContain('€');
    });
  });

  describe('validateMonetaryValue', () => {
    it('should validate correct values', () => {
      expect(validateMonetaryValue(0)).toBe(true);
      expect(validateMonetaryValue(12345)).toBe(true);
      expect(validateMonetaryValue(999999999)).toBe(true);
    });

    it('should throw on negative values', () => {
      expect(() => validateMonetaryValue(-1)).toThrow('cannot be negative');
    });

    it('should throw on non-integers', () => {
      expect(() => validateMonetaryValue(123.45)).toThrow('must be an integer');
    });

    it('should throw on values exceeding max', () => {
      expect(() => validateMonetaryValue(1000, 999)).toThrow('exceeds maximum');
    });

    it('should throw on non-finite values', () => {
      expect(() => validateMonetaryValue(Infinity)).toThrow('finite number');
      expect(() => validateMonetaryValue(NaN)).toThrow('finite number');
    });
  });

  describe('sumMonetary', () => {
    it('should sum monetary values correctly', () => {
      expect(sumMonetary(100, 200, 300)).toBe(600);
      expect(sumMonetary(0, 0, 0)).toBe(0);
      expect(sumMonetary(12345)).toBe(12345);
    });

    it('should throw on non-integer values', () => {
      expect(() => sumMonetary(100, 200.5, 300)).toThrow('not an integer');
    });

    it('should throw on overflow', () => {
      const large = Math.floor(Number.MAX_SAFE_INTEGER / 2);
      expect(() => sumMonetary(large, large, large)).toThrow('exceeds maximum');
    });
  });

  describe('Edge Cases', () => {
    it('should handle conversion edge case from analysis doc', () => {
      // From EDGE_CASES_ANALYSIS.md: 1250.50 PLN
      const pln = 1250.5;
      const grosze = plnToGrosze(pln);
      expect(grosze).toBe(125050);

      const backToPln = groszeToPln(grosze);
      expect(backToPln).toBe(1250.5);
    });

    it('should handle large EUR to PLN conversion without overflow', () => {
      // Max safe conversion
      const eurCenty = 100000000 as Centy; // 1,000,000 EUR
      const rate = 450; // 4.50 PLN/EUR
      const plnGrosze = convertEurToPlnGrosze(eurCenty, rate);
      expect(plnGrosze).toBe(450000000); // 4,500,000 PLN

      // Should not overflow
      expect(plnGrosze).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });

    it('should prevent precision loss documented in edge cases', () => {
      // PDF parser scenario
      const parsed = { valueNetto: 1250.5 };

      // Correct conversion
      const grosze = plnToGrosze(parsed.valueNetto);
      expect(grosze).toBe(125050); // ✅ 1250.50 PLN

      // Not truncated to 1250
      expect(grosze).not.toBe(1250);
    });
  });
});
