/**
 * Feature Flags for Import Parsers
 *
 * Controls which parser implementation is used (old vs new).
 * This allows safe rollout of new parsers with easy rollback.
 *
 * IMPORTANT: Default is FALSE for all flags - new parsers are opt-in only!
 * Set environment variables to 'true' to enable new parsers:
 *
 * - ENABLE_NEW_CSV_PARSER=true
 * - ENABLE_NEW_PDF_PARSER=true
 * - ENABLE_NEW_EXCEL_PARSER=true
 *
 * Or enable all at once:
 * - ENABLE_NEW_PARSERS=true
 */

import { logger } from '../../../utils/logger.js';
import type { ParserFeatureFlags } from './types.js';

/**
 * Get current feature flag configuration
 *
 * Priority:
 * 1. Individual parser flags (ENABLE_NEW_CSV_PARSER, etc.)
 * 2. Global flag (ENABLE_NEW_PARSERS)
 * 3. Default (false - use old parsers)
 */
export function getParserFeatureFlags(): ParserFeatureFlags {
  const globalFlag = process.env.ENABLE_NEW_PARSERS === 'true';

  const flags: ParserFeatureFlags = {
    USE_NEW_CSV_PARSER:
      process.env.ENABLE_NEW_CSV_PARSER === 'true' || globalFlag,
    USE_NEW_PDF_PARSER:
      process.env.ENABLE_NEW_PDF_PARSER === 'true' || globalFlag,
    USE_NEW_EXCEL_PARSER:
      process.env.ENABLE_NEW_EXCEL_PARSER === 'true' || globalFlag,
  };

  return flags;
}

/**
 * Check if new CSV parser should be used
 */
export function useNewCsvParser(): boolean {
  return getParserFeatureFlags().USE_NEW_CSV_PARSER;
}

/**
 * Check if new PDF parser should be used
 */
export function useNewPdfParser(): boolean {
  return getParserFeatureFlags().USE_NEW_PDF_PARSER;
}

/**
 * Check if new Excel parser should be used
 */
export function useNewExcelParser(): boolean {
  return getParserFeatureFlags().USE_NEW_EXCEL_PARSER;
}

/**
 * Log current feature flag status
 * Call this during application startup for visibility
 */
export function logParserFeatureFlags(): void {
  const flags = getParserFeatureFlags();

  const activeNewParsers: string[] = [];
  if (flags.USE_NEW_CSV_PARSER) activeNewParsers.push('CSV');
  if (flags.USE_NEW_PDF_PARSER) activeNewParsers.push('PDF');
  if (flags.USE_NEW_EXCEL_PARSER) activeNewParsers.push('Excel');

  if (activeNewParsers.length > 0) {
    logger.info(
      `[Parser Feature Flags] New parsers ENABLED for: ${activeNewParsers.join(', ')}`
    );
  } else {
    logger.info('[Parser Feature Flags] Using legacy parsers (new parsers disabled)');
  }
}

/**
 * Validate that feature flags are properly configured
 * Returns warnings for any suspicious configurations
 */
export function validateParserFeatureFlags(): string[] {
  const warnings: string[] = [];
  const flags = getParserFeatureFlags();

  // Check for partial enablement (might be intentional, but worth noting)
  const enabledCount = [
    flags.USE_NEW_CSV_PARSER,
    flags.USE_NEW_PDF_PARSER,
    flags.USE_NEW_EXCEL_PARSER,
  ].filter(Boolean).length;

  if (enabledCount > 0 && enabledCount < 3) {
    warnings.push(
      `Partial new parser enablement detected: ${enabledCount}/3 parsers using new implementation`
    );
  }

  // In production, log extra warnings
  if (process.env.NODE_ENV === 'production' && enabledCount > 0) {
    warnings.push(
      'New parsers are enabled in PRODUCTION environment - ensure thorough testing was performed'
    );
  }

  return warnings;
}

/**
 * Create a parser comparison result for debugging
 * Useful when testing both implementations side-by-side
 */
export interface ParserComparisonResult<T> {
  oldResult: T;
  newResult: T;
  match: boolean;
  differences?: string[];
}

/**
 * Compare results from old and new parser implementations
 * Use this during testing phase to verify new parsers match old behavior
 */
export async function compareParserResults<T>(
  parserName: string,
  oldParserFn: () => Promise<T>,
  newParserFn: () => Promise<T>,
  compareFn: (oldResult: T, newResult: T) => { match: boolean; differences?: string[] }
): Promise<ParserComparisonResult<T>> {
  const oldResult = await oldParserFn();
  const newResult = await newParserFn();

  const comparison = compareFn(oldResult, newResult);

  if (!comparison.match) {
    logger.warn(`[Parser Comparison] ${parserName} results do NOT match`, {
      differences: comparison.differences,
    });
  } else {
    logger.debug(`[Parser Comparison] ${parserName} results match`);
  }

  return {
    oldResult,
    newResult,
    match: comparison.match,
    differences: comparison.differences,
  };
}
