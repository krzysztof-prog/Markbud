/**
 * Ceny Processor
 *
 * Handles all PDF price file processing operations.
 * Responsibilities:
 * - Auto-import PDF price files
 * - Manual approval of PDF imports
 * - Save pending order prices for orders that don't exist yet
 *
 * Extracted from ImportService to follow Single Responsibility Principle.
 */

import type { PrismaClient, FileImport } from '@prisma/client';
import { ImportRepository } from '../../repositories/ImportRepository.js';
import { PdfParser } from '../parsers/pdf-parser.js';
import { logger } from '../../utils/logger.js';
import { plnToGrosze, eurToCenty } from '@markbud/shared';

import { ImportValidationService } from './importValidationService.js';
import { ImportTransactionService } from './importTransactionService.js';

/**
 * Result of PDF auto-import operation
 */
export interface PdfAutoImportResult {
  fileImport: FileImport | (FileImport & { status: string });
  autoImportStatus: 'success' | 'pending_order' | 'warning' | 'error' | null;
  autoImportMessage?: string;
  autoImportError?: string;
  result?: unknown;
}

/**
 * Result of PDF price approval
 */
export interface PdfApprovalResult {
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  savedAsPending?: boolean;
  message?: string;
  currency?: string;
  valueNetto?: number;
}

/**
 * Ceny Processor
 *
 * Processes PDF files containing price information.
 * Handles auto-import, manual approval, and pending price storage.
 */
export class CenyProcessor {
  private pdfParser: PdfParser;

  constructor(
    private prisma: PrismaClient,
    private repository: ImportRepository,
    private validationService: ImportValidationService,
    private transactionService: ImportTransactionService
  ) {
    this.pdfParser = new PdfParser();
  }

  // ============================================================
  // AUTO-IMPORT
  // ============================================================

  /**
   * Auto-import PDF with price data
   * Called automatically when PDF file is uploaded
   */
  async autoImportPdf(
    importId: number,
    filepath: string,
    filename: string
  ): Promise<PdfAutoImportResult> {
    try {
      const preview = await this.pdfParser.previewCenyPdf(filepath);

      // Check if order exists (using validation service)
      const orderCheck = await this.validationService.checkOrderExists(preview.orderNumber);

      if (!orderCheck.exists) {
        // Order doesn't exist - save price to pending_order_prices
        return this.handlePendingOrderPrice(importId, filepath, filename, preview);
      }

      // Check for duplicate (using validation service)
      const duplicateCheck = await this.validationService.checkDuplicatePdfImport(
        orderCheck.orderId!,
        importId
      );

      if (duplicateCheck.isDuplicate) {
        return this.handleDuplicateImport(importId, preview, duplicateCheck);
      }

      // All OK - process automatically
      return this.processAutomatically(importId, filepath, filename, preview);
    } catch (error) {
      return this.handleAutoImportError(importId, filename, error);
    }
  }

  /**
   * Handle case when order doesn't exist - save as pending
   */
  private async handlePendingOrderPrice(
    importId: number,
    filepath: string,
    filename: string,
    preview: {
      orderNumber: string;
      reference?: string;
      currency: string;
      valueNetto: number;
      valueBrutto?: number;
    }
  ): Promise<PdfAutoImportResult> {
    // Save price to pending_order_prices using transaction service
    // WAŻNE: Konwertujemy do groszy/centów przed zapisem
    const valueNettoInSmallestUnit = preview.currency === 'EUR'
      ? eurToCenty(preview.valueNetto)
      : plnToGrosze(preview.valueNetto);
    const valueBruttoInSmallestUnit = preview.valueBrutto
      ? (preview.currency === 'EUR' ? eurToCenty(preview.valueBrutto) : plnToGrosze(preview.valueBrutto))
      : null;

    await this.transactionService.createPendingOrderPriceSimple({
      orderNumber: preview.orderNumber,
      reference: preview.reference || null,
      currency: preview.currency,
      valueNetto: valueNettoInSmallestUnit,
      valueBrutto: valueBruttoInSmallestUnit,
      filename,
      filepath,
      importId,
    });

    // Mark import as completed using transaction service
    await this.transactionService.markAsCompleted(importId, {
      savedAsPending: true,
      orderNumber: preview.orderNumber,
      parsed: preview,
      message: `Cena dla ${preview.orderNumber} zapisana - zostanie automatycznie przypisana gdy zlecenie sie pojawi`,
    });

    logger.info(
      `PDF price saved as pending: ${filename} -> ${preview.orderNumber} (${preview.currency} ${preview.valueNetto})`
    );

    const fileImport = await this.repository.findById(importId);
    return {
      fileImport: { ...fileImport!, status: 'completed' },
      autoImportStatus: 'pending_order',
      autoImportMessage: `Cena dla ${preview.orderNumber} zapisana. Zostanie automatycznie przypisana gdy zlecenie sie pojawi.`,
    };
  }

  /**
   * Handle duplicate import detection
   */
  private async handleDuplicateImport(
    importId: number,
    preview: {
      orderNumber: string;
      reference?: string;
      currency: string;
      valueNetto: number;
      valueBrutto?: number;
    },
    duplicateCheck: {
      existingImport?: FileImport;
      existingImportDate?: Date;
    }
  ): Promise<PdfAutoImportResult> {
    await this.repository.update(importId, {
      status: 'pending',
      metadata: JSON.stringify({
        autoImportError: true,
        errorType: 'duplicate',
        parsed: preview,
        existingImportId: duplicateCheck.existingImport?.id,
        existingImportDate: duplicateCheck.existingImportDate,
        message: `Cena dla zlecenia ${preview.orderNumber} juz zostala zaimportowana`,
      }),
    });

    const fileImport = await this.repository.findById(importId);
    return {
      fileImport: fileImport!,
      autoImportStatus: 'warning',
      autoImportError: `Duplikat - cena dla ${preview.orderNumber} juz istnieje. Wymaga recznego zatwierdzenia.`,
    };
  }

  /**
   * Process PDF automatically when order exists and no duplicate
   */
  private async processAutomatically(
    importId: number,
    filepath: string,
    filename: string,
    preview: {
      orderNumber: string;
      reference?: string;
      currency: string;
      valueNetto: number;
      valueBrutto?: number;
    }
  ): Promise<PdfAutoImportResult> {
    const result = await this.pdfParser.processCenyPdf(filepath);

    // Mark as completed using transaction service
    await this.transactionService.markAsCompleted(importId, {
      ...result,
      autoImported: true,
      parsed: preview,
    });

    logger.info(
      `Auto-import PDF: ${filename} -> zlecenie ${preview.orderNumber} (${preview.currency} ${preview.valueNetto})`
    );

    const fileImport = await this.repository.findById(importId);
    return {
      fileImport: { ...fileImport!, status: 'completed' },
      autoImportStatus: 'success',
      result,
    };
  }

  /**
   * Handle error during auto-import
   */
  private async handleAutoImportError(
    importId: number,
    filename: string,
    error: unknown
  ): Promise<PdfAutoImportResult> {
    const errorMessage = error instanceof Error ? error.message : 'Nieznany blad';

    await this.repository.update(importId, {
      status: 'pending',
      metadata: JSON.stringify({
        autoImportError: true,
        errorType: 'parse_error',
        message: errorMessage,
      }),
    });

    logger.warn(`Auto-import PDF failed: ${filename} - ${errorMessage}`);

    const fileImport = await this.repository.findById(importId);
    return {
      fileImport: fileImport!,
      autoImportStatus: 'error',
      autoImportError: errorMessage,
    };
  }

  // ============================================================
  // MANUAL APPROVAL
  // ============================================================

  /**
   * Process PDF import after manual approval
   */
  async processPdfApproval(fileImport: FileImport): Promise<PdfApprovalResult> {
    // Parse and validate PDF
    const preview = await this.validationService.parseAndValidatePdf(fileImport.filepath);

    // Check if order exists
    const orderCheck = await this.validationService.checkOrderExists(preview.orderNumber);

    if (orderCheck.exists) {
      // Order exists - assign price directly
      const result = await this.pdfParser.processCenyPdf(fileImport.filepath);
      return {
        success: true,
        orderNumber: preview.orderNumber,
        ...result,
      };
    }

    // Order doesn't exist - save to PendingOrderPrice using transaction service
    // WAŻNE: Konwertujemy do groszy/centów przed zapisem
    const valueNettoConverted = preview.currency === 'EUR'
      ? eurToCenty(preview.valueNetto)
      : plnToGrosze(preview.valueNetto);
    const valueBruttoConverted = preview.valueBrutto
      ? (preview.currency === 'EUR' ? eurToCenty(preview.valueBrutto) : plnToGrosze(preview.valueBrutto))
      : null;

    await this.transactionService.createPendingOrderPriceSimple({
      orderNumber: preview.orderNumber,
      reference: preview.reference || null,
      currency: preview.currency,
      valueNetto: valueNettoConverted,
      valueBrutto: valueBruttoConverted,
      filename: fileImport.filename,
      filepath: fileImport.filepath,
      importId: fileImport.id,
    });

    logger.info(
      `PDF price saved as pending (manual approve): ${fileImport.filename} -> ${preview.orderNumber}`
    );

    return {
      success: true,
      savedAsPending: true,
      orderNumber: preview.orderNumber,
      currency: preview.currency,
      valueNetto: preview.valueNetto,
      message: `Cena zapisana - zostanie automatycznie przypisana gdy zlecenie ${preview.orderNumber} sie pojawi`,
    };
  }

  // ============================================================
  // PREVIEW
  // ============================================================

  /**
   * Get preview for PDF import
   * Used by ImportService.getPreview
   */
  async getPdfPreview(filepath: string) {
    // Parse PDF using validation service
    const preview = await this.validationService.parseAndValidatePdf(filepath);

    return {
      data: [],
      summary: {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
      },
      metadata: {
        orderNumber: preview.orderNumber,
        reference: preview.reference,
        valueNetto: preview.valueNetto,
        valueBrutto: preview.valueBrutto,
        currency: preview.currency,
        dimensions: preview.dimensions,
      },
    };
  }
}
