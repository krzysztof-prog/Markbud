/**
 * Import Parsers Module
 *
 * This module contains refactored parser services extracted from the monolithic
 * CsvParser and PdfParser classes. Each parser has a dedicated service with:
 * - Feature flag support for safe rollout
 * - Improved error handling
 * - Better testability
 * - Clear separation of concerns
 *
 * IMPORTANT: New parsers are disabled by default!
 * Enable with environment variables:
 * - ENABLE_NEW_PARSERS=true (all parsers)
 * - ENABLE_NEW_CSV_PARSER=true (CSV only)
 * - ENABLE_NEW_PDF_PARSER=true (PDF only)
 * - ENABLE_NEW_EXCEL_PARSER=true (Excel only)
 *
 * Services:
 * - CsvImportService: Parses "uzyte bele" CSV files
 * - PdfImportService: Parses price PDF files
 * - ExcelImportService: Parses Excel/XLSX files (placeholder)
 */

// Types
export type {
  ParsedUzyteBele,
  ParsedRequirement,
  ParsedWindow,
  CsvProcessResult,
  ParsedPdfCeny,
  PdfProcessResult,
  PendingPriceResult,
  OrderNumberParsed,
  ParserServiceConfig,
  ICsvImportService,
  IPdfImportService,
  IExcelImportService,
  ParserFeatureFlags,
} from './types.js';

export { BEAM_LENGTH_MM, REST_ROUNDING_MM } from './types.js';

// Feature flags
export {
  getParserFeatureFlags,
  useNewCsvParser,
  useNewPdfParser,
  useNewExcelParser,
  logParserFeatureFlags,
  validateParserFeatureFlags,
  compareParserResults,
} from './feature-flags.js';

export type { ParserComparisonResult } from './feature-flags.js';

// CSV Import Service
export { CsvImportService, createCsvImportService } from './csvImportService.js';

// CSV Validators
export {
  CsvRowValidator,
  csvRowValidator,
  articleNumberSchema,
  orderNumberSchema,
  requirementRowSchema,
  windowRowSchema,
} from './validators/CsvRowValidator.js';
export type { RowValidationResult } from './validators/CsvRowValidator.js';

// CSV Transformers
export {
  CsvDataTransformer,
  csvDataTransformer,
} from './transformers/CsvDataTransformer.js';
export type {
  ArticleNumberParsed,
  RawRequirementRow,
  RawWindowRow,
  OrderMetadata,
} from './transformers/CsvDataTransformer.js';

// CSV Utils
export {
  OrderNumberParser,
  orderNumberParser,
  orderNumberValidationSchema,
} from './utils/OrderNumberParser.js';
export type { OrderNumberValidationResult } from './utils/OrderNumberParser.js';

export {
  CurrencyConverter,
  currencyConverter,
  parseSchucoEurAmount,
  parsePlnAmount,
  schucoEurAmountSchema,
} from './utils/CurrencyConverter.js';
export type { CurrencyConversionResult } from './utils/CurrencyConverter.js';

// PDF Import Service
export { PdfImportService, createPdfImportService } from './pdfImportService.js';

// Excel Import Service
export {
  ExcelImportService,
  createExcelImportService,
  EXPECTED_COLUMNS,
} from './excelImportService.js';

export type {
  ExcelRow,
  ExcelParseResult,
  ColumnValidationResult,
} from './excelImportService.js';

// Factory function for creating appropriate parser based on feature flags
import type { PrismaClient } from '@prisma/client';
import { CsvParser } from '../../parsers/csv-parser.js';
import { PdfParser } from '../../parsers/pdf-parser.js';
import { CsvImportService } from './csvImportService.js';
import { PdfImportService } from './pdfImportService.js';
import { ExcelImportService } from './excelImportService.js';
import { useNewCsvParser, useNewPdfParser, useNewExcelParser } from './feature-flags.js';

/**
 * Get the appropriate CSV parser based on feature flag
 *
 * @param prisma - Prisma client instance (required for new parser)
 * @returns Either the new CsvImportService or legacy CsvParser
 */
export function getCsvParser(prisma?: PrismaClient): CsvParser | CsvImportService {
  if (useNewCsvParser() && prisma) {
    return new CsvImportService({ prisma });
  }
  return new CsvParser();
}

/**
 * Get the appropriate PDF parser based on feature flag
 *
 * @param prisma - Prisma client instance (required for new parser)
 * @returns Either the new PdfImportService or legacy PdfParser
 */
export function getPdfParser(prisma?: PrismaClient): PdfParser | PdfImportService {
  if (useNewPdfParser() && prisma) {
    return new PdfImportService({ prisma });
  }
  return new PdfParser();
}

/**
 * Get the appropriate Excel parser based on feature flag
 *
 * @param prisma - Prisma client instance
 * @returns ExcelImportService (always new, no legacy version exists)
 */
export function getExcelParser(prisma: PrismaClient): ExcelImportService {
  return new ExcelImportService({ prisma });
}

/**
 * Check if any new parsers are enabled
 */
export function hasNewParsersEnabled(): boolean {
  return useNewCsvParser() || useNewPdfParser() || useNewExcelParser();
}
