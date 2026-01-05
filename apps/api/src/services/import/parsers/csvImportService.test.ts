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
} as any;

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
