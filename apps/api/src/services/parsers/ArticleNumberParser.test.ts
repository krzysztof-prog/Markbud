/**
 * ArticleNumberParser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { ArticleNumberParser, parseArticleNumber } from './ArticleNumberParser.js';

describe('ArticleNumberParser', () => {
  let parser: ArticleNumberParser;

  beforeEach(() => {
    parser = new ArticleNumberParser();
  });

  describe('parse', () => {
    it('should parse article number without "p" suffix', () => {
      const result = parser.parse('19016050');

      expect(result).toEqual({
        profileNumber: '9016',
        colorCode: '050',
      });
    });

    it('should parse article number with "p" suffix', () => {
      const result = parser.parse('19016050p');

      expect(result).toEqual({
        profileNumber: '9016',
        colorCode: '050',
      });
    });

    it('should parse article number with uppercase "P" suffix', () => {
      const result = parser.parse('19016050P');

      expect(result).toEqual({
        profileNumber: '9016',
        colorCode: '050',
      });
    });

    it('should handle different profile numbers', () => {
      const result1 = parser.parse('12345678');
      expect(result1).toEqual({
        profileNumber: '2345',
        colorCode: '678',
      });

      const result2 = parser.parse('10001000');
      expect(result2).toEqual({
        profileNumber: '0001',
        colorCode: '000',
      });
    });
  });

  describe('parseStrict', () => {
    it('should parse valid article number', () => {
      const result = parser.parseStrict('19016050');

      expect(result).toEqual({
        profileNumber: '9016',
        colorCode: '050',
      });
    });

    it('should throw error for empty string', () => {
      expect(() => parser.parseStrict('')).toThrow('Numer artykułu nie może być pusty');
      expect(() => parser.parseStrict('   ')).toThrow('Numer artykułu nie może być pusty');
    });

    it('should throw error for invalid format', () => {
      expect(() => parser.parseStrict('123')).toThrow('Nieprawidłowy format numeru artykułu');
      expect(() => parser.parseStrict('12345')).toThrow('Nieprawidłowy format numeru artykułu');
      expect(() => parser.parseStrict('1234567')).toThrow('Nieprawidłowy format numeru artykułu');
      expect(() => parser.parseStrict('123456789')).toThrow('Nieprawidłowy format numeru artykułu');
      expect(() => parser.parseStrict('abcd1234')).toThrow('Nieprawidłowy format numeru artykułu');
    });

    it('should accept 8 digits with "p" suffix', () => {
      expect(() => parser.parseStrict('19016050p')).not.toThrow();
      expect(() => parser.parseStrict('19016050P')).not.toThrow();
    });
  });

  describe('getProfileNumber', () => {
    it('should extract profile number', () => {
      expect(parser.getProfileNumber('19016050')).toBe('9016');
      expect(parser.getProfileNumber('19016050p')).toBe('9016');
      expect(parser.getProfileNumber('12345678')).toBe('2345');
    });
  });

  describe('getColorCode', () => {
    it('should extract color code', () => {
      expect(parser.getColorCode('19016050')).toBe('050');
      expect(parser.getColorCode('19016050p')).toBe('050');
      expect(parser.getColorCode('12345678')).toBe('678');
    });
  });

  describe('isValid', () => {
    it('should return true for any parseable article number', () => {
      // isValid używa parse (nie parseStrict), więc akceptuje wszystko co można sparsować
      expect(parser.isValid('19016050')).toBe(true);
      expect(parser.isValid('19016050p')).toBe(true);
      expect(parser.isValid('12345678')).toBe(true);
      // parse nie waliduje formatu - po prostu parsuje
      expect(parser.isValid('123')).toBe(true);
      expect(parser.isValid('abcd1234')).toBe(true);
    });
  });

  describe('parseArticleNumber helper function', () => {
    it('should parse article number', () => {
      const result = parseArticleNumber('19016050');

      expect(result).toEqual({
        profileNumber: '9016',
        colorCode: '050',
      });
    });
  });
});
