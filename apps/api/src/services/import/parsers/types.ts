/**
 * Types for Import Parser Services
 *
 * Shared type definitions for CSV, PDF, and Excel import services.
 * These types ensure consistent interfaces across all parser implementations.
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Result of parsing a CSV "uzyte bele" file
 */
export interface ParsedUzyteBele {
  orderNumber: string;
  orderNumberParsed?: {
    base: string;
    suffix: string | null;
    full: string;
  };
  client?: string;
  project?: string;
  system?: string;
  deadline?: string;
  pvcDeliveryDate?: string;
  requirements: ParsedRequirement[];
  windows: ParsedWindow[];
  totals: {
    windows: number;
    sashes: number;
    glasses: number;
  };
  conflict?: {
    baseOrderExists: boolean;
    baseOrderId?: number;
    baseOrderNumber?: string;
  };
}

/**
 * Parsed requirement from CSV
 */
export interface ParsedRequirement {
  articleNumber: string;
  profileNumber: string;
  colorCode: string;
  originalBeams: number;
  originalRest: number;
  calculatedBeams: number;
  calculatedMeters: number;
}

/**
 * Parsed window from CSV
 */
export interface ParsedWindow {
  lp: number;
  szer: number;
  wys: number;
  typProfilu: string;
  ilosc: number;
  referencja: string;
}

/**
 * Result of processing a CSV file
 */
export interface CsvProcessResult {
  orderId: number;
  requirementsCount: number;
  windowsCount: number;
}

/**
 * Result of parsing a PDF price file
 */
export interface ParsedPdfCeny {
  orderNumber: string;
  reference: string;
  currency: 'EUR' | 'PLN';
  valueNetto: number;
  valueBrutto: number;
  dimensions?: {
    width: number;
    height: number;
  };
  windowsCount?: number;
  glassCount?: number;
  weight?: number;
}

/**
 * Result of processing a PDF file
 */
export interface PdfProcessResult {
  orderId: number;
  updated: boolean;
}

/**
 * Pending price result (when order doesn't exist yet)
 */
export interface PendingPriceResult {
  savedAsPending: true;
  orderNumber: string;
  currency: 'EUR' | 'PLN';
  valueNetto: number;
  message: string;
}

/**
 * Parsed order number breakdown
 */
export interface OrderNumberParsed {
  base: string;
  suffix: string | null;
  full: string;
}

/**
 * Configuration for parser services
 */
export interface ParserServiceConfig {
  /**
   * Prisma client instance for database operations
   */
  prisma: PrismaClient;
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Interface for CSV parser service
 */
export interface ICsvImportService {
  /**
   * Parse EUR amount from Schuco format (e.g., "62,30 EUR" -> 62.30)
   */
  parseEurAmountFromSchuco(amountStr: string): number | null;

  /**
   * Parse order number into base and suffix components
   */
  parseOrderNumber(orderNumber: string): OrderNumberParsed;

  /**
   * Parse article number into profile and color components
   */
  parseArticleNumber(articleNumber: string): { profileNumber: string; colorCode: string };

  /**
   * Calculate beams and meters from original values
   */
  calculateBeamsAndMeters(originalBeams: number, restMm: number): { beams: number; meters: number };

  /**
   * Preview a CSV file without saving to database
   */
  previewUzyteBele(filepath: string): Promise<ParsedUzyteBele>;

  /**
   * Process and save CSV data to database
   */
  processUzyteBele(
    filepath: string,
    action: 'overwrite' | 'add_new',
    replaceBase?: boolean
  ): Promise<CsvProcessResult>;
}

/**
 * Interface for PDF parser service
 */
export interface IPdfImportService {
  /**
   * Preview a PDF file without saving to database
   */
  previewCenyPdf(filepath: string): Promise<ParsedPdfCeny>;

  /**
   * Process and save PDF data to database
   */
  processCenyPdf(filepath: string): Promise<PdfProcessResult>;
}

/**
 * Interface for Excel parser service
 */
export interface IExcelImportService {
  /**
   * Parse an Excel file
   */
  parseExcelFile(filepath: string): Promise<unknown>;

  /**
   * Validate Excel column structure
   */
  validateColumns(headers: string[]): { valid: boolean; errors: string[] };
}

/**
 * Feature flag configuration for parsers
 */
export interface ParserFeatureFlags {
  /**
   * Use new CSV parser implementation
   */
  USE_NEW_CSV_PARSER: boolean;
  /**
   * Use new PDF parser implementation
   */
  USE_NEW_PDF_PARSER: boolean;
  /**
   * Use new Excel parser implementation
   */
  USE_NEW_EXCEL_PARSER: boolean;
}

/**
 * Constants for beam calculations
 */
export const BEAM_LENGTH_MM = 6000;
export const REST_ROUNDING_MM = 500;
