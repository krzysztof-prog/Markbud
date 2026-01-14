/**
 * OrderNumberParser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { OrderNumberParser, parseOrderNumber } from './OrderNumberParser.js';

describe('OrderNumberParser', () => {
  let parser: OrderNumberParser;

  beforeEach(() => {
    parser = new OrderNumberParser();
  });

  describe('parse', () => {
    it('should parse plain order number without suffix', () => {
      const result = parser.parse('54222');

      expect(result).toEqual({
        base: '54222',
        suffix: null,
        full: '54222',
      });
    });

    it('should parse order number with hyphen separator', () => {
      const result = parser.parse('54222-a');

      expect(result).toEqual({
        base: '54222',
        suffix: 'a',
        full: '54222-a',
      });
    });

    it('should parse order number with space separator', () => {
      const result = parser.parse('54222 a');

      expect(result).toEqual({
        base: '54222',
        suffix: 'a',
        full: '54222 a',
      });
    });

    it('should parse order number without separator', () => {
      const result = parser.parse('54222a');

      expect(result).toEqual({
        base: '54222',
        suffix: 'a',
        full: '54222a',
      });
    });

    it('should parse order number with multi-character suffix', () => {
      const result = parser.parse('54222-abc');

      expect(result).toEqual({
        base: '54222',
        suffix: 'abc',
        full: '54222-abc',
      });
    });

    it('should parse order number with numeric suffix', () => {
      const result = parser.parse('54222-123');

      expect(result).toEqual({
        base: '54222',
        suffix: '123',
        full: '54222-123',
      });
    });

    it('should trim whitespace', () => {
      const result = parser.parse('  54222-a  ');

      expect(result).toEqual({
        base: '54222',
        suffix: 'a',
        full: '54222-a',
      });
    });

    it('should throw error for empty string', () => {
      expect(() => parser.parse('')).toThrow('Numer zlecenia nie może być pusty');
      expect(() => parser.parse('   ')).toThrow('Numer zlecenia nie może być pusty');
    });

    it('should throw error for too long order number', () => {
      const longNumber = '1'.repeat(21);
      expect(() => parser.parse(longNumber)).toThrow('Numer zlecenia zbyt długi');
    });

    it('should throw error for invalid format', () => {
      expect(() => parser.parse('abc')).toThrow('Nieprawidłowy format numeru zlecenia');
      expect(() => parser.parse('54222-abcd')).toThrow('Nieprawidłowy format numeru zlecenia');
      expect(() => parser.parse('54222--a')).toThrow('Nieprawidłowy format numeru zlecenia');
    });
  });

  describe('hasSuffix', () => {
    it('should return true when suffix exists', () => {
      expect(parser.hasSuffix('54222-a')).toBe(true);
      expect(parser.hasSuffix('54222a')).toBe(true);
    });

    it('should return false when no suffix', () => {
      expect(parser.hasSuffix('54222')).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(parser.hasSuffix('invalid')).toBe(false);
    });
  });

  describe('getBase', () => {
    it('should extract base number', () => {
      expect(parser.getBase('54222')).toBe('54222');
      expect(parser.getBase('54222-a')).toBe('54222');
      expect(parser.getBase('54222abc')).toBe('54222');
    });
  });

  describe('getSuffix', () => {
    it('should extract suffix when exists', () => {
      expect(parser.getSuffix('54222-a')).toBe('a');
      expect(parser.getSuffix('54222abc')).toBe('abc');
    });

    it('should return null when no suffix', () => {
      expect(parser.getSuffix('54222')).toBeNull();
    });
  });

  describe('parseOrderNumber helper function', () => {
    it('should parse order number', () => {
      const result = parseOrderNumber('54222-a');

      expect(result).toEqual({
        base: '54222',
        suffix: 'a',
        full: '54222-a',
      });
    });
  });
});
