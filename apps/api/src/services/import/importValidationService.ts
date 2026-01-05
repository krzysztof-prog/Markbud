/**
 * Import Validation Service
 *
 * Centralizes all validation logic for the import module.
 * Responsibilities:
 * - File validation (format, size, structure)
 * - Duplicate detection
 * - Business rules validation
 * - Order existence checks
 */

import type { PrismaClient, FileImport } from '@prisma/client';
import { ImportRepository } from '../../repositories/ImportRepository.js';
import { CsvParser, type ParsedUzyteBele, type ParseResult } from '../parsers/csv-parser.js';
import { PdfParser } from '../parsers/pdf-parser.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import {
  validateUploadedFile,
  sanitizeFilename,
  validateFilename,
  validateFileExtension,
  validateFileSize,
  validateMimeType,
} from '../../utils/file-validation.js';

/**
 * Result of file type detection
 */
export type ImportFileType = 'uzyte_bele' | 'ceny_pdf' | 'unknown';

/**
 * Result of duplicate PDF check
 */
export interface DuplicatePdfCheckResult {
  isDuplicate: boolean;
  existingImport?: FileImport;
  existingImportDate?: Date;
}

/**
 * Result of order existence check
 */
export interface OrderExistenceCheckResult {
  exists: boolean;
  orderId?: number;
  orderNumber?: string;
}

/**
 * Result of delivery assignment check
 */
export interface DeliveryAssignmentCheckResult {
  isAssigned: boolean;
  deliveryId?: number;
  deliveryNumber?: string | null;
  deliveryDate?: Date;
}

/**
 * Import Validation Service
 *
 * Handles all validation-related operations for file imports.
 * Follows single responsibility principle - only validates, doesn't process.
 */
export class ImportValidationService {
  private csvParser: CsvParser;
  private pdfParser: PdfParser;

  constructor(
    private prisma: PrismaClient,
    private repository: ImportRepository
  ) {
    this.csvParser = new CsvParser();
    this.pdfParser = new PdfParser();
  }

  // ============================================================
  // FILE VALIDATION
  // ============================================================

  /**
   * Validate uploaded file - checks filename, extension, MIME type, and size
   * Throws ValidationError if validation fails
   */
  validateUploadedFile(
    filename: string,
    mimeType: string | undefined,
    size: number
  ): void {
    validateUploadedFile(filename, mimeType, size);
  }

  /**
   * Validate filename for path traversal and other security issues
   */
  validateFilename(filename: string): void {
    validateFilename(filename);
  }

  /**
   * Validate file extension
   */
  validateFileExtension(filename: string): void {
    validateFileExtension(filename);
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number): void {
    validateFileSize(size);
  }

  /**
   * Validate MIME type
   */
  validateMimeType(mimeType: string | undefined): void {
    validateMimeType(mimeType);
  }

  /**
   * Sanitize filename for safe filesystem storage
   */
  sanitizeFilename(filename: string): string {
    return sanitizeFilename(filename);
  }

  // ============================================================
  // FILE TYPE DETECTION
  // ============================================================

  /**
   * Determine file type based on filename
   * Returns 'uzyte_bele', 'ceny_pdf', or 'unknown'
   */
  detectFileType(filename: string): ImportFileType {
    const lowerFilename = filename.toLowerCase();

    if (
      lowerFilename.includes('uzyte') ||
      lowerFilename.includes('bele') ||
      lowerFilename.endsWith('.csv')
    ) {
      return 'uzyte_bele';
    }

    if (lowerFilename.endsWith('.pdf')) {
      return 'ceny_pdf';
    }

    return 'unknown';
  }

  // ============================================================
  // IMPORT STATUS VALIDATION
  // ============================================================

  /**
   * Validate that import exists and has expected status
   * Throws NotFoundError if import doesn't exist
   * Throws ValidationError if status doesn't match
   */
  async validateImportStatus(
    importId: number,
    expectedStatus: string | string[]
  ): Promise<FileImport> {
    const fileImport = await this.repository.findById(importId);

    if (!fileImport) {
      throw new NotFoundError('Import');
    }

    const allowedStatuses = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];

    if (!allowedStatuses.includes(fileImport.status)) {
      throw new ValidationError(
        `Import ma nieprawidlowy status: ${fileImport.status}. Oczekiwany: ${allowedStatuses.join(' lub ')}`
      );
    }

    return fileImport;
  }

  /**
   * Validate that import can be processed (is in pending status)
   */
  async validateImportCanBeProcessed(importId: number): Promise<FileImport> {
    return this.validateImportStatus(importId, 'pending');
  }

  // ============================================================
  // DUPLICATE DETECTION
  // ============================================================

  /**
   * Check if PDF with same order ID was already imported
   */
  async checkDuplicatePdfImport(
    orderId: number,
    excludeImportId: number
  ): Promise<DuplicatePdfCheckResult> {
    const existingImport = await this.repository.findDuplicatePdfImport(
      orderId,
      excludeImportId
    );

    if (existingImport) {
      return {
        isDuplicate: true,
        existingImport,
        existingImportDate: existingImport.processedAt || undefined,
      };
    }

    return { isDuplicate: false };
  }

  // ============================================================
  // ORDER VALIDATION
  // ============================================================

  /**
   * Check if order exists by order number
   */
  async checkOrderExists(orderNumber: string): Promise<OrderExistenceCheckResult> {
    const order = await this.repository.findOrderByNumber(orderNumber);

    if (order) {
      return {
        exists: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    }

    return { exists: false };
  }

  /**
   * Check if order is already assigned to a delivery
   */
  async checkOrderDeliveryAssignment(
    orderNumber: string,
    excludeDeliveryId?: number
  ): Promise<DeliveryAssignmentCheckResult> {
    const order = await this.repository.findOrderByOrderNumber(orderNumber);

    if (!order || order.deliveryOrders.length === 0) {
      return { isAssigned: false };
    }

    // If excludeDeliveryId is provided, check for OTHER deliveries
    if (excludeDeliveryId) {
      const otherDelivery = order.deliveryOrders.find(
        (dOrder) => dOrder.delivery.id !== excludeDeliveryId
      );

      if (otherDelivery) {
        return {
          isAssigned: true,
          deliveryId: otherDelivery.delivery.id,
          deliveryNumber: otherDelivery.delivery.deliveryNumber,
          deliveryDate: new Date(otherDelivery.delivery.deliveryDate),
        };
      }

      return { isAssigned: false };
    }

    // Otherwise, just check if assigned to any delivery
    const firstDelivery = order.deliveryOrders[0];
    return {
      isAssigned: true,
      deliveryId: firstDelivery.delivery.id,
      deliveryNumber: firstDelivery.delivery.deliveryNumber,
      deliveryDate: new Date(firstDelivery.delivery.deliveryDate),
    };
  }

  // ============================================================
  // CSV PREVIEW VALIDATION
  // ============================================================

  /**
   * Parse and validate CSV file, returning parsed data
   * Throws ValidationError if file cannot be parsed
   */
  async parseAndValidateCsv(filepath: string): Promise<ParsedUzyteBele> {
    try {
      const preview = await this.csvParser.previewUzyteBele(filepath);

      // Validate required fields
      if (!preview.orderNumber) {
        throw new ValidationError('Brak numeru zlecenia w pliku CSV');
      }

      logger.info('CSV file validated successfully', {
        orderNumber: preview.orderNumber,
        requirementsCount: preview.requirements.length,
        windowsCount: preview.windows.length,
      });

      return preview;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Nieznany blad';
      logger.error('CSV validation failed', { filepath, error: message });
      throw new ValidationError(`Blad parsowania pliku CSV: ${message}`);
    }
  }

  /**
   * Parse and validate CSV file with error reporting
   * Returns ParseResult with data, errors, and summary
   * Does NOT throw on validation errors - collects them in errors array
   */
  async parseAndValidateCsvWithErrors(filepath: string): Promise<ParseResult<ParsedUzyteBele>> {
    try {
      const result = await this.csvParser.previewUzyteBeleWithErrors(filepath);

      logger.info('CSV file parsed with error reporting', {
        orderNumber: result.data.orderNumber,
        totalRows: result.summary.totalRows,
        successRows: result.summary.successRows,
        failedRows: result.summary.failedRows,
        errorsCount: result.errors.length,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany blad';
      logger.error('CSV parsing failed completely', { filepath, error: message });
      throw new ValidationError(`Blad parsowania pliku CSV: ${message}`);
    }
  }

  /**
   * Parse order number into base and suffix components
   */
  parseOrderNumber(orderNumber: string): { base: string; suffix: string | null; full: string } {
    return this.csvParser.parseOrderNumber(orderNumber);
  }

  // ============================================================
  // PDF PREVIEW VALIDATION
  // ============================================================

  /**
   * Parse and validate PDF file, returning parsed data
   * Throws ValidationError if file cannot be parsed
   */
  async parseAndValidatePdf(filepath: string): Promise<{
    orderNumber: string;
    reference?: string;
    currency: string;
    valueNetto: number;
    valueBrutto?: number;
    dimensions?: { width: number; height: number; };
  }> {
    try {
      const preview = await this.pdfParser.previewCenyPdf(filepath);

      // Validate required fields
      if (!preview.orderNumber) {
        throw new ValidationError('Brak numeru zlecenia w pliku PDF');
      }

      if (!preview.valueNetto || preview.valueNetto <= 0) {
        throw new ValidationError('Brak lub nieprawidlowa wartosc netto w pliku PDF');
      }

      logger.info('PDF file validated successfully', {
        orderNumber: preview.orderNumber,
        currency: preview.currency,
        valueNetto: preview.valueNetto,
      });

      return preview;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Nieznany blad';
      logger.error('PDF validation failed', { filepath, error: message });
      throw new ValidationError(`Blad parsowania pliku PDF: ${message}`);
    }
  }

  // ============================================================
  // BUSINESS RULES VALIDATION
  // ============================================================

  /**
   * Validate folder import prerequisites
   * - Date extracted from folder name
   * - CSV files found in folder
   */
  validateFolderImportPrerequisites(
    deliveryDate: Date | null,
    csvFilesCount: number
  ): void {
    if (!deliveryDate) {
      throw new ValidationError('Brak daty w nazwie folderu', {
        format: ['Oczekiwany format: DD.MM.YYYY'],
      });
    }

    if (csvFilesCount === 0) {
      throw new ValidationError('Brak plikow CSV', {
        files: ['Nie znaleziono plikow CSV z "uzyte" lub "bele" w nazwie'],
      });
    }
  }

  /**
   * Validate that order can be imported to a delivery
   * Checks if order is already assigned to another delivery
   */
  async validateOrderCanBeImportedToDelivery(
    orderNumber: string,
    targetDeliveryId: number
  ): Promise<{ canImport: boolean; reason?: string }> {
    const assignmentCheck = await this.checkOrderDeliveryAssignment(
      orderNumber,
      targetDeliveryId
    );

    if (assignmentCheck.isAssigned) {
      const dateStr = assignmentCheck.deliveryDate?.toLocaleDateString('pl-PL') || '';
      return {
        canImport: false,
        reason: `Zlecenie ${orderNumber} jest juz przypisane do dostawy ${assignmentCheck.deliveryNumber || ''} z dnia ${dateStr}`,
      };
    }

    return { canImport: true };
  }
}
