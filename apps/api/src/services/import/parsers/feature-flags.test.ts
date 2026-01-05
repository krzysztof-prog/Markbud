/**
 * Feature Flags Tests
 *
 * Tests for the parser feature flag system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getParserFeatureFlags,
  useNewCsvParser,
  useNewPdfParser,
  useNewExcelParser,
  validateParserFeatureFlags,
} from './feature-flags.js';

describe('Parser Feature Flags', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getParserFeatureFlags', () => {
    it('returns all flags as false by default', () => {
      delete process.env.ENABLE_NEW_PARSERS;
      delete process.env.ENABLE_NEW_CSV_PARSER;
      delete process.env.ENABLE_NEW_PDF_PARSER;
      delete process.env.ENABLE_NEW_EXCEL_PARSER;

      const flags = getParserFeatureFlags();

      expect(flags.USE_NEW_CSV_PARSER).toBe(false);
      expect(flags.USE_NEW_PDF_PARSER).toBe(false);
      expect(flags.USE_NEW_EXCEL_PARSER).toBe(false);
    });

    it('enables all parsers with global flag', () => {
      process.env.ENABLE_NEW_PARSERS = 'true';

      const flags = getParserFeatureFlags();

      expect(flags.USE_NEW_CSV_PARSER).toBe(true);
      expect(flags.USE_NEW_PDF_PARSER).toBe(true);
      expect(flags.USE_NEW_EXCEL_PARSER).toBe(true);
    });

    it('enables individual parsers', () => {
      process.env.ENABLE_NEW_CSV_PARSER = 'true';

      const flags = getParserFeatureFlags();

      expect(flags.USE_NEW_CSV_PARSER).toBe(true);
      expect(flags.USE_NEW_PDF_PARSER).toBe(false);
      expect(flags.USE_NEW_EXCEL_PARSER).toBe(false);
    });

    it('individual flags override global flag (always on if either is true)', () => {
      process.env.ENABLE_NEW_PARSERS = 'false';
      process.env.ENABLE_NEW_PDF_PARSER = 'true';

      const flags = getParserFeatureFlags();

      expect(flags.USE_NEW_CSV_PARSER).toBe(false);
      expect(flags.USE_NEW_PDF_PARSER).toBe(true);
      expect(flags.USE_NEW_EXCEL_PARSER).toBe(false);
    });
  });

  describe('useNewCsvParser', () => {
    it('returns false by default', () => {
      delete process.env.ENABLE_NEW_PARSERS;
      delete process.env.ENABLE_NEW_CSV_PARSER;

      expect(useNewCsvParser()).toBe(false);
    });

    it('returns true when enabled', () => {
      process.env.ENABLE_NEW_CSV_PARSER = 'true';

      expect(useNewCsvParser()).toBe(true);
    });
  });

  describe('useNewPdfParser', () => {
    it('returns false by default', () => {
      delete process.env.ENABLE_NEW_PARSERS;
      delete process.env.ENABLE_NEW_PDF_PARSER;

      expect(useNewPdfParser()).toBe(false);
    });

    it('returns true when enabled', () => {
      process.env.ENABLE_NEW_PDF_PARSER = 'true';

      expect(useNewPdfParser()).toBe(true);
    });
  });

  describe('useNewExcelParser', () => {
    it('returns false by default', () => {
      delete process.env.ENABLE_NEW_PARSERS;
      delete process.env.ENABLE_NEW_EXCEL_PARSER;

      expect(useNewExcelParser()).toBe(false);
    });

    it('returns true when enabled', () => {
      process.env.ENABLE_NEW_EXCEL_PARSER = 'true';

      expect(useNewExcelParser()).toBe(true);
    });
  });

  describe('validateParserFeatureFlags', () => {
    it('returns no warnings when all flags are off', () => {
      delete process.env.ENABLE_NEW_PARSERS;
      delete process.env.ENABLE_NEW_CSV_PARSER;
      delete process.env.ENABLE_NEW_PDF_PARSER;
      delete process.env.ENABLE_NEW_EXCEL_PARSER;

      const warnings = validateParserFeatureFlags();

      expect(warnings).toEqual([]);
    });

    it('warns about partial enablement', () => {
      process.env.ENABLE_NEW_CSV_PARSER = 'true';

      const warnings = validateParserFeatureFlags();

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Partial');
    });

    it('warns about production usage', () => {
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_NEW_PARSERS = 'true';

      const warnings = validateParserFeatureFlags();

      expect(warnings.some((w) => w.includes('PRODUCTION'))).toBe(true);

      process.env.NODE_ENV = origNodeEnv;
    });
  });
});
