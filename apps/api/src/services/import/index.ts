/**
 * Import Services Module
 *
 * This module contains specialized services extracted from the monolithic ImportService.
 * Each service has a single responsibility following SOLID principles.
 *
 * Services (Phase 1):
 * - ImportFileSystemService: File system operations (read, write, copy, delete, scan)
 * - ImportSettingsService: Settings and path resolution with caching
 *
 * Services (Phase 2):
 * - ImportValidationService: File validation, duplicate detection, business rules
 * - ImportTransactionService: Prisma transaction management, rollback, atomic operations
 * - ImportConflictService: Variant conflict detection and resolution
 *
 * Services (Phase 3 - Parsers):
 * - CsvImportService: Parses "uzyte bele" CSV files (behind feature flag)
 * - PdfImportService: Parses price PDF files (behind feature flag)
 * - ExcelImportService: Parses Excel/XLSX files (behind feature flag)
 */

// Phase 1 - File System and Settings
export { ImportFileSystemService, importFileSystemService } from './importFileSystemService.js';
export type { CsvFileData } from './importFileSystemService.js';

export { ImportSettingsService } from './importSettingsService.js';

// Phase 2 - Validation, Transactions, Conflicts
export { ImportValidationService } from './importValidationService.js';
export type {
  ImportFileType,
  DuplicatePdfCheckResult,
  OrderExistenceCheckResult,
  DeliveryAssignmentCheckResult,
} from './importValidationService.js';

export { ImportTransactionService } from './importTransactionService.js';
export type {
  ImportTransactionOptions,
  TransactionResult,
  TransactionClient,
} from './importTransactionService.js';

export { ImportConflictService } from './importConflictService.js';
export type {
  ConflictDetectionResult,
  ConflictResolutionResult,
} from './importConflictService.js';

// Phase 3 - Parsers (behind feature flags)
export {
  // Types
  type ParsedUzyteBele,
  type ParsedRequirement,
  type ParsedWindow,
  type CsvProcessResult,
  type ParsedPdfCeny,
  type PdfProcessResult,
  type PendingPriceResult,
  type OrderNumberParsed,
  type ParserServiceConfig,
  type ICsvImportService,
  type IPdfImportService,
  type IExcelImportService,
  type ParserFeatureFlags,
  type ParserComparisonResult,
  type ExcelRow,
  type ExcelParseResult,
  type ColumnValidationResult,
  // Constants
  BEAM_LENGTH_MM,
  REST_ROUNDING_MM,
  EXPECTED_COLUMNS,
  // Feature flags
  getParserFeatureFlags,
  useNewCsvParser,
  useNewPdfParser,
  useNewExcelParser,
  logParserFeatureFlags,
  validateParserFeatureFlags,
  compareParserResults,
  // Services
  CsvImportService,
  createCsvImportService,
  PdfImportService,
  createPdfImportService,
  ExcelImportService,
  createExcelImportService,
  // Factory functions
  getCsvParser,
  getPdfParser,
  getExcelParser,
  hasNewParsersEnabled,
} from './parsers/index.js';
