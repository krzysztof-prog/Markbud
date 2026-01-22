/**
 * CSV Import Service Tests
 *
 * Tests for the refactored CsvImportService.
 * These tests verify that the new implementation matches the legacy CsvParser behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// IMPORTANT: Mock the app index to prevent loading Fastify routes during test
vi.mock('../../../index.js', () => ({
  prisma: {}
}));

import { CsvImportService } from './csvImportService.js';
import { CsvParser } from '../../parsers/csv-parser.js';
import { BEAM_LENGTH_MM, REST_ROUNDING_MM } from './types.js';

// Mock Prisma
const mockPrisma = {
  order: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  orderRequirement: {
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  },
  orderWindow: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  profile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  color: {
    findUnique: vi.fn(),
  },
  orderSchucoLink: {
    findFirst: vi.fn(),
  },
  pendingOrderPrice: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
} as FastifyRequest;

describe('CsvImportService', () => {
  let newService: CsvImportService;
  let legacyParser: CsvParser;

  beforeEach(() => {
    newService = new CsvImportService({ prisma: mockPrisma });
    legacyParser = new CsvParser();
    vi.clearAllMocks();
  });

  describe('parseEurAmountFromSchuco', () => {
    const testCases = [
      { input: '62,30 EUR', expected: 62.3 },
      { input: '2 321,02 EUR', expected: 2321.02 },
      { input: '1 234,56', expected: 1234.56 },
      { input: '', expected: null },
      { input: 'invalid', expected: null },
    ];

    it.each(testCases)('parses "$input" correctly', ({ input, expected }) => {
      const newResult = newService.parseEurAmountFromSchuco(input);
      const legacyResult = legacyParser.parseEurAmountFromSchuco(input);

      expect(newResult).toBe(expected);
      expect(newResult).toBe(legacyResult);
    });
  });

  describe('parseOrderNumber', () => {
    const validCases = [
      { input: '54222', expected: { base: '54222', suffix: null, full: '54222' } },
      { input: '54222-a', expected: { base: '54222', suffix: 'a', full: '54222-a' } },
      { input: '54222a', expected: { base: '54222', suffix: 'a', full: '54222a' } },
      { input: '54222-abc', expected: { base: '54222', suffix: 'abc', full: '54222-abc' } },
      { input: '54222 a', expected: { base: '54222', suffix: 'a', full: '54222 a' } },
      { input: ' 54222 ', expected: { base: '54222', suffix: null, full: '54222' } },
    ];

    it.each(validCases)('parses "$input" correctly', ({ input, expected }) => {
      const newResult = newService.parseOrderNumber(input);
      const legacyResult = legacyParser.parseOrderNumber(input);

      expect(newResult).toEqual(expected);
      expect(newResult).toEqual(legacyResult);
    });

    const invalidCases = [
      { input: '', description: 'empty string' },
      { input: '   ', description: 'whitespace only' },
      { input: 'abc', description: 'letters only' },
      { input: '12345678901234567890123', description: 'too long' },
    ];

    it.each(invalidCases)('throws for $description', ({ input }) => {
      expect(() => newService.parseOrderNumber(input)).toThrow();
      expect(() => legacyParser.parseOrderNumber(input)).toThrow();
    });
  });

  describe('parseArticleNumber', () => {
    const testCases = [
      { input: '19016050', expected: { profileNumber: '9016', colorCode: '050' } },
      { input: '12345678', expected: { profileNumber: '2345', colorCode: '678' } },
      { input: '1ABC', expected: { profileNumber: '', colorCode: 'ABC' } },
    ];

    it.each(testCases)('parses "$input" correctly', ({ input, expected }) => {
      const newResult = newService.parseArticleNumber(input);
      const legacyResult = legacyParser.parseArticleNumber(input);

      expect(newResult).toEqual(expected);
      expect(newResult).toEqual(legacyResult);
    });
  });

  describe('calculateBeamsAndMeters', () => {
    const validCases = [
      { beams: 5, rest: 0, expected: { beams: 5, meters: 0 } },
      { beams: 5, rest: 500, expected: { beams: 4, meters: 5.5 } },
      { beams: 5, rest: 1000, expected: { beams: 4, meters: 5 } },
      { beams: 5, rest: 1500, expected: { beams: 4, meters: 4.5 } },
      { beams: 5, rest: 2000, expected: { beams: 4, meters: 4 } },
      { beams: 5, rest: 2500, expected: { beams: 4, meters: 3.5 } },
      { beams: 5, rest: 3000, expected: { beams: 4, meters: 3 } },
      { beams: 5, rest: 250, expected: { beams: 4, meters: 5.5 } }, // rounds up to 500
      { beams: 5, rest: 750, expected: { beams: 4, meters: 5 } }, // rounds up to 1000
    ];

    it.each(validCases)(
      'calculates correctly for $beams beams and $rest mm rest',
      ({ beams, rest, expected }) => {
        const newResult = newService.calculateBeamsAndMeters(beams, rest);
        const legacyResult = legacyParser.calculateBeamsAndMeters(beams, rest);

        expect(newResult).toEqual(expected);
        expect(newResult).toEqual(legacyResult);
      }
    );

    const invalidCases = [
      { beams: -1, rest: 0, description: 'negative beams' },
      { beams: 0, rest: -1, description: 'negative rest' },
      { beams: 0, rest: 1000, description: 'rest > 0 but beams < 1' },
      { beams: 5, rest: 7000, description: 'rest > beam length' },
      { beams: NaN, rest: 0, description: 'NaN beams' },
      { beams: 5, rest: Infinity, description: 'Infinity rest' },
    ];

    it.each(invalidCases)('throws for $description', ({ beams, rest }) => {
      expect(() => newService.calculateBeamsAndMeters(beams, rest)).toThrow();
      expect(() => legacyParser.calculateBeamsAndMeters(beams, rest)).toThrow();
    });
  });

  describe('constants', () => {
    it('uses correct beam length', () => {
      expect(BEAM_LENGTH_MM).toBe(6000);
    });

    it('uses correct rest rounding', () => {
      expect(REST_ROUNDING_MM).toBe(500);
    });
  });
});

describe('CsvImportService vs CsvParser Parity', () => {
  /**
   * These tests ensure the new service produces identical results to the legacy parser.
   * Run with real test files to validate before enabling feature flag.
   */

  it('has identical interface', () => {
    const newService = new CsvImportService({ prisma: mockPrisma });
    const legacyParser = new CsvParser();

    // Check method existence
    expect(typeof newService.parseEurAmountFromSchuco).toBe('function');
    expect(typeof newService.parseOrderNumber).toBe('function');
    expect(typeof newService.parseArticleNumber).toBe('function');
    expect(typeof newService.calculateBeamsAndMeters).toBe('function');
    expect(typeof newService.previewUzyteBele).toBe('function');
    expect(typeof newService.processUzyteBele).toBe('function');

    // Legacy also has these methods
    expect(typeof legacyParser.parseEurAmountFromSchuco).toBe('function');
    expect(typeof legacyParser.parseOrderNumber).toBe('function');
    expect(typeof legacyParser.parseArticleNumber).toBe('function');
    expect(typeof legacyParser.calculateBeamsAndMeters).toBe('function');
    expect(typeof legacyParser.previewUzyteBele).toBe('function');
    expect(typeof legacyParser.processUzyteBele).toBe('function');
  });
});

// ==============================================================================
// EXTENDED EDGE CASE TESTS - Dodane testy dla edge cases
// ==============================================================================

describe('CsvImportService - Extended Edge Cases', () => {
  let newService: CsvImportService;

  beforeEach(() => {
    newService = new CsvImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // parseEurAmountFromSchuco - Rozszerzone testy formatow EUR
  // ---------------------------------------------------------------------------
  describe('parseEurAmountFromSchuco - Extended formats', () => {
    describe('European format (comma decimal, space thousands)', () => {
      const europeanFormats = [
        // Podstawowe formaty z separatorem tysiecy (spacja)
        { input: '1 234,56 EUR', expected: 1234.56 },
        { input: '12 345,67 EUR', expected: 12345.67 },
        { input: '123 456,78 EUR', expected: 123456.78 },
        { input: '1 234 567,89 EUR', expected: 1234567.89 },
        // Bez EUR
        { input: '1 234,56', expected: 1234.56 },
        { input: '12 345,67', expected: 12345.67 },
        // Z symbolem euro
        { input: '1 234,56 €', expected: 1234.56 },
        { input: '€ 1 234,56', expected: 1234.56 },
        { input: '€1 234,56', expected: 1234.56 },
        // Bez spacji separatora tysiecy
        { input: '1234,56 EUR', expected: 1234.56 },
        { input: '12345,67 EUR', expected: 12345.67 },
      ];

      it.each(europeanFormats)('parses European format "$input" -> $expected', ({ input, expected }) => {
        const result = newService.parseEurAmountFromSchuco(input);
        expect(result).toBeCloseTo(expected, 2);
      });
    });

    describe('Edge values', () => {
      const edgeValues = [
        // Zero
        { input: '0,00 EUR', expected: 0 },
        { input: '0 EUR', expected: 0 },
        { input: '0,00', expected: 0 },
        // Bardzo male wartosci
        { input: '0,01 EUR', expected: 0.01 },
        { input: '0,10 EUR', expected: 0.1 },
        { input: '0,99 EUR', expected: 0.99 },
        // Calkowite (bez czesci dziesietnej)
        { input: '100 EUR', expected: 100 },
        { input: '1000 EUR', expected: 1000 },
        { input: '10000 EUR', expected: 10000 },
        // Jedna cyfra dziesietna
        { input: '100,5 EUR', expected: 100.5 },
        { input: '1 000,5 EUR', expected: 1000.5 },
        // Bardzo duze liczby
        { input: '999 999,99 EUR', expected: 999999.99 },
        { input: '1 000 000,00 EUR', expected: 1000000 },
        { input: '10 000 000,00 EUR', expected: 10000000 },
      ];

      it.each(edgeValues)('parses edge value "$input" -> $expected', ({ input, expected }) => {
        const result = newService.parseEurAmountFromSchuco(input);
        expect(result).toBeCloseTo(expected, 2);
      });
    });

    describe('Whitespace handling', () => {
      const whitespaceTests = [
        // Dodatkowe spacje na poczatku/koncu
        { input: '  62,30 EUR  ', expected: 62.3 },
        { input: '\t62,30 EUR\t', expected: 62.3 },
        { input: '\n62,30 EUR\n', expected: 62.3 },
        // Wiele spacji jako separator tysiecy
        { input: '1  234,56 EUR', expected: 1234.56 },
        // Non-breaking space (NBSP - \u00A0)
        { input: '1\u00A0234,56 EUR', expected: 1234.56 },
      ];

      it.each(whitespaceTests)('handles whitespace in "$input"', ({ input, expected }) => {
        const result = newService.parseEurAmountFromSchuco(input);
        expect(result).toBeCloseTo(expected, 2);
      });
    });

    describe('Invalid inputs', () => {
      const invalidInputs = [
        { input: '', expected: null, description: 'empty string' },
        { input: '   ', expected: null, description: 'only whitespace' },
        { input: 'EUR', expected: null, description: 'only currency' },
        { input: 'abc EUR', expected: null, description: 'non-numeric' },
        { input: 'abc', expected: null, description: 'letters only' },
        { input: null as unknown as string, expected: null, description: 'null' },
        { input: undefined as unknown as string, expected: null, description: 'undefined' },
      ];

      it.each(invalidInputs)('returns null for $description', ({ input, expected }) => {
        const result = newService.parseEurAmountFromSchuco(input);
        expect(result).toBe(expected);
      });
    });

    describe('Precision edge cases', () => {
      // Testy precyzji - upewniamy sie ze nie ma problemow z floating point
      it('maintains precision for common amounts', () => {
        expect(newService.parseEurAmountFromSchuco('10,01 EUR')).toBe(10.01);
        expect(newService.parseEurAmountFromSchuco('10,10 EUR')).toBe(10.1);
        expect(newService.parseEurAmountFromSchuco('99,99 EUR')).toBe(99.99);
      });

      it('handles amounts that could cause floating point issues', () => {
        // 0.1 + 0.2 !== 0.3 w JavaScript, sprawdzamy czy parser to obsluguje
        const result = newService.parseEurAmountFromSchuco('0,30 EUR');
        expect(result).toBeCloseTo(0.3, 10);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // parseOrderNumber - Rozszerzone testy edge cases
  // ---------------------------------------------------------------------------
  describe('parseOrderNumber - Extended edge cases', () => {
    describe('Valid formats with different suffix styles', () => {
      const validFormats = [
        // Sufiks z rozna wielkosc liter
        { input: '54222-A', expected: { base: '54222', suffix: 'A', full: '54222-A' } },
        { input: '54222-B', expected: { base: '54222', suffix: 'B', full: '54222-B' } },
        { input: '54222A', expected: { base: '54222', suffix: 'A', full: '54222A' } },
        { input: '54222B', expected: { base: '54222', suffix: 'B', full: '54222B' } },
        // Wieloliterowe sufiksy
        { input: '54222-AB', expected: { base: '54222', suffix: 'AB', full: '54222-AB' } },
        { input: '54222-ABC', expected: { base: '54222', suffix: 'ABC', full: '54222-ABC' } },
        { input: '54222AB', expected: { base: '54222', suffix: 'AB', full: '54222AB' } },
        // Sufiksy alfanumeryczne (z myslnikiem)
        { input: '54222-1', expected: { base: '54222', suffix: '1', full: '54222-1' } },
        { input: '54222-12', expected: { base: '54222', suffix: '12', full: '54222-12' } },
        { input: '54222-A1', expected: { base: '54222', suffix: 'A1', full: '54222-A1' } },
        // Rozne dlugosci numeru bazowego
        { input: '1-a', expected: { base: '1', suffix: 'a', full: '1-a' } },
        { input: '12-a', expected: { base: '12', suffix: 'a', full: '12-a' } },
        { input: '123-a', expected: { base: '123', suffix: 'a', full: '123-a' } },
        { input: '12345678-a', expected: { base: '12345678', suffix: 'a', full: '12345678-a' } },
        // Same cyfry - rozne dlugosci
        { input: '1', expected: { base: '1', suffix: null, full: '1' } },
        { input: '12', expected: { base: '12', suffix: null, full: '12' } },
        { input: '123456789', expected: { base: '123456789', suffix: null, full: '123456789' } },
      ];

      it.each(validFormats)('parses "$input" correctly', ({ input, expected }) => {
        const result = newService.parseOrderNumber(input);
        expect(result).toEqual(expected);
      });
    });

    describe('Whitespace handling', () => {
      const whitespaceTests = [
        { input: '  54222  ', expected: { base: '54222', suffix: null, full: '54222' } },
        { input: '\t54222\t', expected: { base: '54222', suffix: null, full: '54222' } },
        { input: ' 54222-a ', expected: { base: '54222', suffix: 'a', full: '54222-a' } },
        // Spacja jako separator (zamiast myslnika)
        { input: '54222 a', expected: { base: '54222', suffix: 'a', full: '54222 a' } },
        { input: '54222 ab', expected: { base: '54222', suffix: 'ab', full: '54222 ab' } },
        { input: '54222 abc', expected: { base: '54222', suffix: 'abc', full: '54222 abc' } },
      ];

      it.each(whitespaceTests)('handles whitespace in "$input"', ({ input, expected }) => {
        const result = newService.parseOrderNumber(input);
        expect(result).toEqual(expected);
      });
    });

    describe('Invalid formats', () => {
      const invalidFormats = [
        { input: '', description: 'empty string' },
        { input: '   ', description: 'only whitespace' },
        { input: '\t\n', description: 'only whitespace characters' },
        { input: 'abc', description: 'letters only' },
        { input: 'ABC', description: 'uppercase letters only' },
        { input: '-54222', description: 'leading hyphen' },
        { input: '54222-', description: 'trailing hyphen' },
        { input: '54222--a', description: 'double hyphen' },
        { input: '54222-abcd', description: 'suffix too long (4 chars)' },
        { input: '54222abcd', description: 'suffix without separator too long' },
        { input: '12345678901234567890123', description: 'number too long (>20 chars)' },
        { input: 'a54222', description: 'letter prefix' },
        { input: '54222.a', description: 'dot as separator' },
        { input: '54222_a', description: 'underscore as separator' },
        { input: '54222/a', description: 'slash as separator' },
      ];

      it.each(invalidFormats)('throws for $description ("$input")', ({ input }) => {
        expect(() => newService.parseOrderNumber(input)).toThrow();
      });
    });

    describe('Boundary conditions', () => {
      it('handles max length number (20 chars)', () => {
        // 20 znakow: 17 cyfr + myslnik + 2 znaki sufiksu
        const maxInput = '12345678901234567-ab';
        const result = newService.parseOrderNumber(maxInput);
        expect(result.base).toBe('12345678901234567');
        expect(result.suffix).toBe('ab');
      });

      it('throws for 21 char input', () => {
        const tooLong = '123456789012345678901';
        expect(() => newService.parseOrderNumber(tooLong)).toThrow();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // calculateBeamsAndMeters - Rozszerzone testy zaokraglen
  // ---------------------------------------------------------------------------
  describe('calculateBeamsAndMeters - Extended rounding edge cases', () => {
    describe('Rounding to 500mm increments', () => {
      const roundingCases = [
        // Dokladnie wielokrotnosci 500
        { beams: 5, rest: 500, expected: { beams: 4, meters: 5.5 } },
        { beams: 5, rest: 1000, expected: { beams: 4, meters: 5 } },
        { beams: 5, rest: 1500, expected: { beams: 4, meters: 4.5 } },
        { beams: 5, rest: 2000, expected: { beams: 4, meters: 4 } },
        { beams: 5, rest: 2500, expected: { beams: 4, meters: 3.5 } },
        { beams: 5, rest: 3000, expected: { beams: 4, meters: 3 } },
        { beams: 5, rest: 3500, expected: { beams: 4, meters: 2.5 } },
        { beams: 5, rest: 4000, expected: { beams: 4, meters: 2 } },
        { beams: 5, rest: 4500, expected: { beams: 4, meters: 1.5 } },
        { beams: 5, rest: 5000, expected: { beams: 4, meters: 1 } },
        { beams: 5, rest: 5500, expected: { beams: 4, meters: 0.5 } },
        { beams: 5, rest: 6000, expected: { beams: 4, meters: 0 } },
        // Wartosci wymagajace zaokraglenia W GORE
        { beams: 5, rest: 1, expected: { beams: 4, meters: 5.5 } },      // ceil(1/500)*500 = 500
        { beams: 5, rest: 250, expected: { beams: 4, meters: 5.5 } },    // ceil(250/500)*500 = 500
        { beams: 5, rest: 499, expected: { beams: 4, meters: 5.5 } },    // ceil(499/500)*500 = 500
        { beams: 5, rest: 501, expected: { beams: 4, meters: 5 } },      // ceil(501/500)*500 = 1000
        { beams: 5, rest: 750, expected: { beams: 4, meters: 5 } },      // ceil(750/500)*500 = 1000
        { beams: 5, rest: 999, expected: { beams: 4, meters: 5 } },      // ceil(999/500)*500 = 1000
        { beams: 5, rest: 1001, expected: { beams: 4, meters: 4.5 } },   // ceil(1001/500)*500 = 1500
        { beams: 5, rest: 2499, expected: { beams: 4, meters: 3.5 } },   // ceil(2499/500)*500 = 2500
        { beams: 5, rest: 2501, expected: { beams: 4, meters: 3 } },     // ceil(2501/500)*500 = 3000
      ];

      it.each(roundingCases)(
        'rounds rest $rest mm correctly (beams: $beams -> $expected.beams, meters: $expected.meters)',
        ({ beams, rest, expected }) => {
          const result = newService.calculateBeamsAndMeters(beams, rest);
          expect(result).toEqual(expected);
        }
      );
    });

    describe('Edge case: rest = 0', () => {
      const zeroRestCases = [
        { beams: 0, rest: 0, expected: { beams: 0, meters: 0 } },
        { beams: 1, rest: 0, expected: { beams: 1, meters: 0 } },
        { beams: 5, rest: 0, expected: { beams: 5, meters: 0 } },
        { beams: 100, rest: 0, expected: { beams: 100, meters: 0 } },
        { beams: 1000, rest: 0, expected: { beams: 1000, meters: 0 } },
      ];

      it.each(zeroRestCases)(
        'returns original beams when rest=0 (beams: $beams)',
        ({ beams, rest, expected }) => {
          const result = newService.calculateBeamsAndMeters(beams, rest);
          expect(result).toEqual(expected);
        }
      );
    });

    describe('Edge case: beams = 1 with rest > 0', () => {
      // Gdy mamy tylko 1 bele i reszta > 0, odejmujemy 1 bele -> 0 bel
      const singleBeamCases = [
        { beams: 1, rest: 500, expected: { beams: 0, meters: 5.5 } },
        { beams: 1, rest: 1000, expected: { beams: 0, meters: 5 } },
        { beams: 1, rest: 3000, expected: { beams: 0, meters: 3 } },
        { beams: 1, rest: 5500, expected: { beams: 0, meters: 0.5 } },
        { beams: 1, rest: 6000, expected: { beams: 0, meters: 0 } },
      ];

      it.each(singleBeamCases)(
        'handles single beam with rest $rest mm',
        ({ beams, rest, expected }) => {
          const result = newService.calculateBeamsAndMeters(beams, rest);
          expect(result).toEqual(expected);
        }
      );
    });

    describe('Large numbers', () => {
      it('handles large beam counts', () => {
        const result = newService.calculateBeamsAndMeters(1000, 2500);
        expect(result).toEqual({ beams: 999, meters: 3.5 });
      });

      it('handles very large beam counts', () => {
        const result = newService.calculateBeamsAndMeters(10000, 1);
        expect(result).toEqual({ beams: 9999, meters: 5.5 });
      });
    });

    describe('Invalid inputs', () => {
      const invalidInputs = [
        { beams: -1, rest: 0, description: 'negative beams' },
        { beams: -100, rest: 500, description: 'large negative beams' },
        { beams: 5, rest: -1, description: 'negative rest' },
        { beams: 5, rest: -500, description: 'large negative rest' },
        { beams: 0, rest: 100, description: 'zero beams with non-zero rest' },
        { beams: 0, rest: 500, description: 'zero beams with positive rest' },
        { beams: 5, rest: 6001, description: 'rest exceeds beam length' },
        { beams: 5, rest: 7000, description: 'rest much larger than beam' },
        { beams: 5, rest: 10000, description: 'rest way exceeds beam length' },
        { beams: NaN, rest: 500, description: 'NaN beams' },
        { beams: 5, rest: NaN, description: 'NaN rest' },
        { beams: NaN, rest: NaN, description: 'both NaN' },
        { beams: Infinity, rest: 500, description: 'Infinity beams' },
        { beams: 5, rest: Infinity, description: 'Infinity rest' },
        { beams: -Infinity, rest: 500, description: '-Infinity beams' },
        { beams: 5, rest: -Infinity, description: '-Infinity rest' },
      ];

      it.each(invalidInputs)('throws for $description', ({ beams, rest }) => {
        expect(() => newService.calculateBeamsAndMeters(beams, rest)).toThrow();
      });
    });

    describe('Float precision edge cases', () => {
      // Upewniamy sie, ze metry sa zawsze dokladne (bez bledow zmiennoprzecinkowych)
      it('returns exact meter values without floating point errors', () => {
        // 6000 - 500 = 5500mm = 5.5m (dokladnie)
        expect(newService.calculateBeamsAndMeters(5, 500).meters).toBe(5.5);
        // 6000 - 1000 = 5000mm = 5.0m
        expect(newService.calculateBeamsAndMeters(5, 1000).meters).toBe(5);
        // 6000 - 1500 = 4500mm = 4.5m
        expect(newService.calculateBeamsAndMeters(5, 1500).meters).toBe(4.5);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // parseArticleNumber - Rozszerzone testy
  // ---------------------------------------------------------------------------
  describe('parseArticleNumber - Extended edge cases', () => {
    describe('Valid article numbers', () => {
      const validCases = [
        // Standardowy format 8 cyfr
        { input: '19016050', expected: { profileNumber: '9016', colorCode: '050' } },
        { input: '12345678', expected: { profileNumber: '2345', colorCode: '678' } },
        { input: '10001000', expected: { profileNumber: '0001', colorCode: '000' } },
        // Z suffixem "p"
        { input: '19016050p', expected: { profileNumber: '9016', colorCode: '050' } },
        { input: '19016050P', expected: { profileNumber: '9016', colorCode: '050' } },
        { input: '12345678p', expected: { profileNumber: '2345', colorCode: '678' } },
        // Rozne dlugosci
        { input: '1ABC', expected: { profileNumber: '', colorCode: 'ABC' } },
        { input: '12ABC', expected: { profileNumber: '2', colorCode: 'ABC' } },
        { input: '123ABC', expected: { profileNumber: '23', colorCode: 'ABC' } },
        // Minimalna dlugosc (4 znaki)
        { input: '1234', expected: { profileNumber: '', colorCode: '234' } },
        // Zera wiodace
        { input: '10000001', expected: { profileNumber: '0000', colorCode: '001' } },
      ];

      it.each(validCases)('parses "$input" correctly', ({ input, expected }) => {
        const result = newService.parseArticleNumber(input);
        expect(result).toEqual(expected);
      });
    });
  });
});

// ==============================================================================
// TESTS FOR UTILITY CLASSES - Bezposrednie testy klas pomocniczych
// ==============================================================================

import { CurrencyConverter } from './utils/CurrencyConverter.js';
import { OrderNumberParser } from './utils/OrderNumberParser.js';
import { CsvDataTransformer } from './transformers/CsvDataTransformer.js';
import { stripBOM, hasBOM } from '../../../utils/string-utils.js';

describe('CurrencyConverter - Direct tests', () => {
  const converter = new CurrencyConverter();

  describe('parsePln', () => {
    const plnCases = [
      { input: '1 234,56 zł', expected: 1234.56 },
      { input: '1 234,56 PLN', expected: 1234.56 },
      { input: '1234,56 zł', expected: 1234.56 },
      { input: '1.234,56 zł', expected: 1234.56 },     // kropka jako separator tysiecy
      { input: '12.345,67 PLN', expected: 12345.67 },
      { input: '100 zł', expected: 100 },
      { input: '100 PLN', expected: 100 },
      { input: '0,99 zł', expected: 0.99 },
      { input: '', expected: null },
    ];

    it.each(plnCases)('parses PLN "$input"', ({ input, expected }) => {
      const result = converter.parsePln(input);
      if (expected === null) {
        expect(result).toBe(null);
      } else {
        expect(result).toBeCloseTo(expected, 2);
      }
    });
  });

  describe('toCents/fromCents', () => {
    it('converts to cents correctly', () => {
      expect(converter.toCents(10.01)).toBe(1001);
      expect(converter.toCents(99.99)).toBe(9999);
      expect(converter.toCents(0.01)).toBe(1);
      expect(converter.toCents(1000.00)).toBe(100000);
    });

    it('converts from cents correctly', () => {
      expect(converter.fromCents(1001)).toBe(10.01);
      expect(converter.fromCents(9999)).toBe(99.99);
      expect(converter.fromCents(1)).toBe(0.01);
      expect(converter.fromCents(100000)).toBe(1000.00);
    });

    it('handles floating point precision in toCents', () => {
      // Te wartosci sa znane z powodowania problemow z floating point
      expect(converter.toCents(10.01)).toBe(1001);
      expect(converter.toCents(0.1 + 0.2)).toBe(30); // 0.3 * 100 = 30
    });
  });

  describe('detectCurrency', () => {
    it('detects EUR', () => {
      expect(converter.detectCurrency('100 EUR')).toBe('EUR');
      expect(converter.detectCurrency('100€')).toBe('EUR');
      expect(converter.detectCurrency('€100')).toBe('EUR');
      expect(converter.detectCurrency('100 eur')).toBe('EUR');
    });

    it('detects PLN', () => {
      expect(converter.detectCurrency('100 PLN')).toBe('PLN');
      expect(converter.detectCurrency('100 zł')).toBe('PLN');
      expect(converter.detectCurrency('100 zl')).toBe('PLN');
      expect(converter.detectCurrency('100 pln')).toBe('PLN');
    });

    it('returns null for unknown', () => {
      expect(converter.detectCurrency('100')).toBe(null);
      expect(converter.detectCurrency('100 USD')).toBe(null);
      expect(converter.detectCurrency('')).toBe(null);
    });
  });

  describe('parseAuto', () => {
    it('auto-parses EUR amounts', () => {
      const result = converter.parseAuto('62,30 EUR');
      expect(result).not.toBeNull();
      expect(result!.currency).toBe('EUR');
      expect(result!.parsedValue).toBe(62.3);
      expect(result!.valueInCents).toBe(6230);
    });

    it('auto-parses PLN amounts', () => {
      const result = converter.parseAuto('1 234,56 zł');
      expect(result).not.toBeNull();
      expect(result!.currency).toBe('PLN');
      expect(result!.parsedValue).toBeCloseTo(1234.56, 2);
    });

    it('defaults to EUR for unknown currency', () => {
      const result = converter.parseAuto('100,50');
      expect(result).not.toBeNull();
      expect(result!.currency).toBe('EUR');
      expect(result!.parsedValue).toBe(100.5);
    });
  });
});

describe('OrderNumberParser - Direct tests', () => {
  const parser = new OrderNumberParser();

  describe('validate', () => {
    it('returns valid result for correct input', () => {
      const result = parser.validate('54222');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({ base: '54222', suffix: null, full: '54222' });
    });

    it('returns invalid result for incorrect input', () => {
      const result = parser.validate('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('hasVariant', () => {
    it('returns true for orders with suffix', () => {
      expect(parser.hasVariant('54222-a')).toBe(true);
      expect(parser.hasVariant('54222a')).toBe(true);
    });

    it('returns false for orders without suffix', () => {
      expect(parser.hasVariant('54222')).toBe(false);
    });

    it('returns false for invalid input', () => {
      expect(parser.hasVariant('abc')).toBe(false);
    });
  });

  describe('getBase', () => {
    it('extracts base from order with suffix', () => {
      expect(parser.getBase('54222-a')).toBe('54222');
      expect(parser.getBase('54222a')).toBe('54222');
    });

    it('returns same value for order without suffix', () => {
      expect(parser.getBase('54222')).toBe('54222');
    });
  });

  describe('normalize', () => {
    it('normalizes order with suffix to hyphen format', () => {
      expect(parser.normalize('54222a')).toBe('54222-a');
      expect(parser.normalize('54222A')).toBe('54222-a');
      expect(parser.normalize('54222-A')).toBe('54222-a');
    });

    it('returns base for order without suffix', () => {
      expect(parser.normalize('54222')).toBe('54222');
    });
  });

  describe('compareBase', () => {
    it('returns true when bases match', () => {
      expect(parser.compareBase('54222', '54222-a')).toBe(true);
      expect(parser.compareBase('54222-a', '54222-b')).toBe(true);
      expect(parser.compareBase('54222a', '54222b')).toBe(true);
    });

    it('returns false when bases differ', () => {
      expect(parser.compareBase('54222', '54223')).toBe(false);
      expect(parser.compareBase('54222-a', '12345-a')).toBe(false);
    });

    it('returns false for invalid inputs', () => {
      expect(parser.compareBase('abc', '54222')).toBe(false);
    });
  });

  describe('matches', () => {
    it('matches by base', () => {
      expect(parser.matches('54222-a', '54222')).toBe(true);
      expect(parser.matches('54222', '542')).toBe(true);
    });

    it('matches by full number', () => {
      expect(parser.matches('54222-a', '54222-a')).toBe(true);
      expect(parser.matches('54222-a', '-a')).toBe(true);
    });

    it('returns false for non-matching pattern', () => {
      expect(parser.matches('54222', '99999')).toBe(false);
    });
  });
});

describe('CsvDataTransformer - Direct tests', () => {
  const transformer = new CsvDataTransformer();

  describe('parseMetadataLine', () => {
    it('parses client', () => {
      const result = transformer.parseMetadataLine('klient: jan kowalski', 'Klient: Jan Kowalski');
      expect(result?.client).toBe('Jan Kowalski');
    });

    it('parses project', () => {
      const result = transformer.parseMetadataLine('projekt: budowa domu', 'Projekt: Budowa Domu');
      expect(result?.project).toBe('Budowa Domu');
    });

    it('parses system', () => {
      const result = transformer.parseMetadataLine('system: aws 75', 'System: AWS 75');
      expect(result?.system).toBe('AWS 75');
    });

    it('parses deadline', () => {
      const result = transformer.parseMetadataLine('termin realizacji: 2026-02-15', 'Termin realizacji: 2026-02-15');
      expect(result?.deadline).toBe('2026-02-15');
    });

    it('returns null for non-metadata line', () => {
      const result = transformer.parseMetadataLine('54222;19016050;5;500', '54222;19016050;5;500');
      expect(result).toBe(null);
    });
  });

  describe('parseSummaryLine', () => {
    it('parses windows count', () => {
      const result = transformer.parseSummaryLine('łączna liczba okien', ['Łączna liczba okien', '15']);
      expect(result).toEqual({ type: 'windows', value: 15 });
    });

    it('parses sashes count', () => {
      const result = transformer.parseSummaryLine('łączna liczba skrzydeł', ['Łączna liczba skrzydeł', '30']);
      expect(result).toEqual({ type: 'sashes', value: 30 });
    });

    it('parses glasses count', () => {
      const result = transformer.parseSummaryLine('łączna liczba szyb', ['Łączna liczba szyb', '45']);
      expect(result).toEqual({ type: 'glasses', value: 45 });
    });

    it('handles ASCII version of łączna', () => {
      const result = transformer.parseSummaryLine('laczna liczba okien', ['Laczna liczba okien', '10']);
      expect(result).toEqual({ type: 'windows', value: 10 });
    });

    it('returns null for non-summary line', () => {
      const result = transformer.parseSummaryLine('54222;19016050;5;500', ['54222', '19016050', '5', '500']);
      expect(result).toBe(null);
    });
  });

  describe('autoFillFromWindows', () => {
    const mockWindows = [
      { lp: 1, szer: 1000, wys: 1200, typProfilu: 'AWS 75', ilosc: 2, referencja: 'Dom A' },
      { lp: 2, szer: 800, wys: 1000, typProfilu: 'AWS 75', ilosc: 1, referencja: 'Dom B' },
      { lp: 3, szer: 1200, wys: 1400, typProfilu: 'ASS 70', ilosc: 1, referencja: 'Dom A' },
    ];

    it('extracts unique references as project', () => {
      const result = transformer.autoFillFromWindows(mockWindows, undefined, undefined);
      expect(result.project).toBe('Dom A, Dom B');
    });

    it('extracts unique profile types as system', () => {
      const result = transformer.autoFillFromWindows(mockWindows, undefined, undefined);
      expect(result.system).toBe('AWS 75, ASS 70');
    });

    it('does not override existing project', () => {
      const result = transformer.autoFillFromWindows(mockWindows, 'Existing Project', undefined);
      expect(result.project).toBe('Existing Project');
    });

    it('does not override existing system', () => {
      const result = transformer.autoFillFromWindows(mockWindows, undefined, 'Existing System');
      expect(result.system).toBe('Existing System');
    });

    it('handles empty windows array', () => {
      const result = transformer.autoFillFromWindows([], undefined, undefined);
      expect(result.project).toBeUndefined();
      expect(result.system).toBeUndefined();
    });
  });

  describe('transformRequirementRow', () => {
    it('transforms valid row', () => {
      const result = transformer.transformRequirementRow({
        orderNumber: '54222',
        articleNumber: '19016050',
        beamsCount: 5,
        restMm: 500,
      });

      expect(result).toEqual({
        articleNumber: '19016050',
        profileNumber: '9016',
        colorCode: '050',
        originalBeams: 5,
        originalRest: 500,
        calculatedBeams: 4,
        calculatedMeters: 5.5,
      });
    });

    it('handles article with p suffix', () => {
      const result = transformer.transformRequirementRow({
        orderNumber: '54222',
        articleNumber: '19016050p',
        beamsCount: 3,
        restMm: 0,
      });

      expect(result.profileNumber).toBe('9016');
      expect(result.colorCode).toBe('050');
    });
  });
});

// ==============================================================================
// TESTS FOR STRING UTILS - BOM handling
// ==============================================================================

describe('String Utils - BOM handling', () => {
  describe('stripBOM', () => {
    it('removes UTF-8 BOM from start of string', () => {
      const withBOM = '\uFEFFHello World';
      const result = stripBOM(withBOM);
      expect(result).toBe('Hello World');
    });

    it('returns original string if no BOM', () => {
      const noBOM = 'Hello World';
      const result = stripBOM(noBOM);
      expect(result).toBe('Hello World');
    });

    it('only removes BOM from start, not middle', () => {
      const bomInMiddle = 'Hello\uFEFFWorld';
      const result = stripBOM(bomInMiddle);
      expect(result).toBe('Hello\uFEFFWorld');
    });

    it('handles empty string', () => {
      expect(stripBOM('')).toBe('');
    });

    it('handles string that is only BOM', () => {
      expect(stripBOM('\uFEFF')).toBe('');
    });
  });

  describe('hasBOM', () => {
    it('returns true for string with BOM', () => {
      expect(hasBOM('\uFEFFHello')).toBe(true);
    });

    it('returns false for string without BOM', () => {
      expect(hasBOM('Hello')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasBOM('')).toBe(false);
    });
  });
});

// ==============================================================================
// TESTS FOR POLISH CHARACTERS
// ==============================================================================

describe('Polish characters handling', () => {
  const transformer = new CsvDataTransformer();

  describe('metadata parsing with Polish characters', () => {
    it('parses client with Polish characters', () => {
      const result = transformer.parseMetadataLine(
        'klient: jan kowalski łódź',
        'Klient: Jan Kowalski Łódź'
      );
      expect(result?.client).toBe('Jan Kowalski Łódź');
    });

    it('parses project with Polish characters', () => {
      const result = transformer.parseMetadataLine(
        'projekt: budowa żółtego domu',
        'Projekt: Budowa żółtego domu'
      );
      expect(result?.project).toBe('Budowa żółtego domu');
    });

    it('handles ą, ę, ó, ś, ź, ż, ł, ć, ń in text', () => {
      const polishText = 'ąęóśźżłćń ĄĘÓŚŹŻŁĆŃ';
      const result = transformer.parseMetadataLine(
        `klient: ${polishText.toLowerCase()}`,
        `Klient: ${polishText}`
      );
      expect(result?.client).toBe(polishText);
    });
  });

  describe('summary line parsing with Polish ł', () => {
    it('parses łączna with Polish ł', () => {
      const result = transformer.parseSummaryLine(
        'łączna liczba okien',
        ['Łączna liczba okien', '10']
      );
      expect(result).toEqual({ type: 'windows', value: 10 });
    });

    it('parses skrzydeł with Polish ł', () => {
      const result = transformer.parseSummaryLine(
        'łączna liczba skrzydeł',
        ['Łączna liczba skrzydeł', '20']
      );
      expect(result).toEqual({ type: 'sashes', value: 20 });
    });
  });
});

// ==============================================================================
// TESTS FOR CSV SEPARATORS
// ==============================================================================

describe('CSV separator handling', () => {
  const transformer = new CsvDataTransformer();

  describe('parseRequirementParts with different input formats', () => {
    // Te testy zakladaja, ze split zostal juz wykonany na odpowiednim separatorze
    // Testujemy logike parsowania czesci, nie samego splitu

    it('parses parts from semicolon-separated CSV', () => {
      // Symulacja: line.split(';')
      const parts = ['54222', '19016050', '5', '500'];
      const result = transformer.parseRequirementParts(parts);
      expect(result).toEqual({
        orderNumber: '54222',
        articleNumber: '19016050',
        beamsCount: 5,
        restMm: 500,
      });
    });

    it('parses parts from comma-separated CSV', () => {
      // Symulacja: line.split(',')
      const parts = ['54222', '19016050', '3', '1000'];
      const result = transformer.parseRequirementParts(parts);
      expect(result).toEqual({
        orderNumber: '54222',
        articleNumber: '19016050',
        beamsCount: 3,
        restMm: 1000,
      });
    });

    it('handles extra whitespace in parts', () => {
      const parts = ['  54222  ', '  19016050  ', '  5  ', '  500  '];
      const result = transformer.parseRequirementParts(parts);
      expect(result).toEqual({
        orderNumber: '54222',
        articleNumber: '19016050',
        beamsCount: 5,
        restMm: 500,
      });
    });

    it('returns null for insufficient parts', () => {
      const parts = ['54222', '19016050', '5'];
      const result = transformer.parseRequirementParts(parts);
      expect(result).toBe(null);
    });

    it('returns null for invalid numeric values', () => {
      const parts = ['54222', '19016050', 'abc', '500'];
      const result = transformer.parseRequirementParts(parts);
      expect(result).toBe(null);
    });
  });

  describe('parseWindowParts', () => {
    it('parses valid window parts', () => {
      const parts = ['1', '1000', '1200', 'AWS 75', '2', 'Dom A'];
      const result = transformer.parseWindowParts(parts);
      expect(result).toEqual({
        lp: 1,
        width: 1000,
        height: 1200,
        profileType: 'AWS 75',
        quantity: 2,
        reference: 'Dom A',
      });
    });

    it('defaults quantity to 1 when invalid', () => {
      const parts = ['1', '1000', '1200', 'AWS 75', 'abc', 'Dom A'];
      const result = transformer.parseWindowParts(parts);
      expect(result?.quantity).toBe(1);
    });

    it('handles empty reference', () => {
      const parts = ['1', '1000', '1200', 'AWS 75', '2', ''];
      const result = transformer.parseWindowParts(parts);
      expect(result?.reference).toBe('');
    });

    it('returns null for insufficient parts', () => {
      const parts = ['1', '1000', '1200', 'AWS 75'];
      const result = transformer.parseWindowParts(parts);
      expect(result).toBe(null);
    });
  });
});

// ==============================================================================
// CONSTANTS VERIFICATION
// ==============================================================================

describe('Constants verification', () => {
  it('BEAM_LENGTH_MM is 6000', () => {
    expect(BEAM_LENGTH_MM).toBe(6000);
  });

  it('REST_ROUNDING_MM is 500', () => {
    expect(REST_ROUNDING_MM).toBe(500);
  });

  it('beam length / rounding = 12 (full beam has 12 x 500mm segments)', () => {
    expect(BEAM_LENGTH_MM / REST_ROUNDING_MM).toBe(12);
  });
});
