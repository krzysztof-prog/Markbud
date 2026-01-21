/**
 * Uzyte Bele Processor
 *
 * Handles all CSV "uzyte bele" file processing operations.
 * Responsibilities:
 * - Process single uzyte bele CSV files
 * - Process uzyte bele with variant resolution
 * - Import entire folders of CSV files
 * - Scan folders for CSV files
 *
 * Extracted from ImportService to follow Single Responsibility Principle.
 */

import type { PrismaClient } from '@prisma/client';
import { ImportRepository } from '../../repositories/ImportRepository.js';
import { CsvParser } from '../parsers/csv-parser.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { emitDeliveryCreated, emitOrderUpdated } from '../event-emitter.js';
import type { VariantResolutionAction } from '../orderVariantService.js';

import { ImportFileSystemService, importFileSystemService, type CsvFileData } from './importFileSystemService.js';
import { ImportValidationService } from './importValidationService.js';
import { ImportTransactionService } from './importTransactionService.js';
import { ImportConflictService } from './importConflictService.js';
import { ImportSettingsService } from './importSettingsService.js';

/**
 * Result of a single file import within folder import
 */
export interface FolderImportFileResult {
  filename: string;
  relativePath: string;
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
  /** Validation errors for rows that failed validation */
  validationErrors?: Array<{
    row: number;
    field?: string;
    reason: string;
  }>;
  /** Summary of validation: how many rows succeeded/failed */
  validationSummary?: {
    totalRows: number;
    successRows: number;
    failedRows: number;
  };
}

/**
 * Result of folder import operation
 */
export interface FolderImportResult {
  delivery: {
    id: number;
    deliveryDate: Date;
    deliveryNumber: string | null;
    created: boolean;
  };
  summary: {
    totalFiles: number;
    successCount: number;
    skippedCount: number;
    failCount: number;
    filesWithValidationErrors: number;
    totalValidationErrors: number;
  };
  results: FolderImportFileResult[];
  archivedPath: string | null;
}

/**
 * Result of folder scan operation
 */
export interface FolderScanResult {
  folderName: string;
  detectedDate: string | null;
  csvFiles: Array<{
    filename: string;
    relativePath: string;
    orderNumber: string;
    requirementsCount: number;
    windowsCount: number;
    existingDeliveryInfo?: {
      deliveryId: number;
      deliveryNumber: string | null;
      deliveryDate: string;
    };
    variantConflict?: {
      hasConflict: boolean;
      conflictType?: string;
      recommendation?: string;
    };
  }>;
  existingDeliveries: Array<{ id: number; deliveryNumber: string | null }>;
}

/**
 * Result of processing uzyte bele file
 * Matches return type of CsvParser.processUzyteBele
 */
export interface UzyteBeleProcessResult {
  orderId: number;
  requirementsCount: number;
  windowsCount: number;
  glassesCount: number;
}

/**
 * Uzyte Bele Processor
 *
 * Processes CSV files containing "uzyte bele" (used beams) data.
 * Handles single file processing, folder imports, and variant conflicts.
 */
export class UzyteBeleProcessor {
  private fileSystemService: ImportFileSystemService;
  private csvParser: CsvParser;

  constructor(
    private prisma: PrismaClient,
    private repository: ImportRepository,
    private validationService: ImportValidationService,
    private transactionService: ImportTransactionService,
    private conflictService: ImportConflictService,
    private settingsService: ImportSettingsService
  ) {
    this.fileSystemService = importFileSystemService;
    this.csvParser = new CsvParser();
  }

  // ============================================================
  // SINGLE FILE PROCESSING
  // ============================================================

  /**
   * Process uzyte/bele CSV import
   * Core processing logic for a single file
   * @param options - Opcjonalne parametry: isPrivateImport - czy to import prywatny (tworzy PrivateColor)
   */
  async processUzyteBeleImport(
    fileImport: { id: number; filepath: string; metadata: string | null },
    action: 'overwrite' | 'add_new',
    replaceBase: boolean,
    options?: { isPrivateImport?: boolean }
  ): Promise<UzyteBeleProcessResult> {
    // Check if file was detected by File Watcher and has deliveryId
    let metadata: Record<string, unknown> = {};
    try {
      metadata = fileImport.metadata ? JSON.parse(fileImport.metadata) : {};
    } catch {
      // Ignore parse errors
    }

    const deliveryId = typeof metadata.deliveryId === 'number' ? metadata.deliveryId : undefined;

    // Process uzyte_bele file (CsvParser uses its own prisma instance)
    const result = await this.csvParser.processUzyteBele(fileImport.filepath, action, replaceBase, options);

    // If file was from File Watcher, add order to delivery
    if (deliveryId && result.orderId) {
      await this.repository.addOrderToDeliveryIfNotExists(deliveryId, result.orderId);
    }

    // Emit event outside transaction
    if (result.orderId) {
      emitOrderUpdated({ id: result.orderId });
    }

    return result;
  }

  /**
   * Process uzyte/bele CSV import with variant resolution
   * Handles variant conflicts before processing
   */
  async processUzyteBeleWithResolution(
    importId: number,
    resolution: VariantResolutionAction
  ): Promise<{ success: boolean; result: unknown }> {
    // Validate import can be processed
    const fileImport = await this.validationService.validateImportCanBeProcessed(importId);

    // Mark as processing using transaction service
    await this.transactionService.markAsProcessing(importId);

    try {
      let result;

      // Parse the file to get order number and data
      const preview = await this.validationService.parseAndValidateCsv(fileImport.filepath);
      const orderNumberParsed = this.conflictService.parseOrderNumber(preview.orderNumber);

      logger.info('Processing import with variant resolution', {
        importId,
        orderNumber: preview.orderNumber,
        resolutionType: resolution.type,
      });

      // Execute resolution using conflict service
      const resolutionResult = await this.conflictService.executeResolution(
        resolution,
        preview.orderNumber,
        preview
      );

      logger.info('Resolution executed', {
        action: resolutionResult.action,
        message: resolutionResult.message,
      });

      // Handle cancellation
      if (resolution.type === 'cancel') {
        await this.transactionService.markAsRejected(importId, {
          resolutionType: 'cancelled',
          cancelledAt: new Date().toISOString(),
        });
        return { success: false, result: { cancelled: true } };
      }

      // Determine import action based on resolution type
      let action: 'overwrite' | 'add_new' = 'add_new';
      let replaceBase = false;

      if (resolution.type === 'replace') {
        action = 'overwrite';
        replaceBase = true;
      }

      // Process the import
      result = await this.processUzyteBeleImport(fileImport, action, replaceBase);

      // Mark as completed using transaction service
      await this.transactionService.markAsCompleted(importId, {
        ...result,
        resolutionType: resolution.type,
        targetOrderNumber: 'targetOrderNumber' in resolution ? resolution.targetOrderNumber : undefined,
        resolutionMessage: resolutionResult.message,
        deletedOrders: resolutionResult.deletedOrders,
      });

      logger.info('Import completed with variant resolution', {
        importId,
        resolutionType: resolution.type,
        orderId: result.orderId,
      });

      return { success: true, result };
    } catch (error) {
      // Mark as error using transaction service
      const errorMessage = error instanceof Error ? error.message : 'Nieznany blad';

      await this.transactionService.markAsError(importId, errorMessage);

      logger.error('Import failed with variant resolution', {
        importId,
        error: errorMessage,
      });

      throw error;
    }
  }

  // ============================================================
  // FOLDER IMPORT
  // ============================================================

  /**
   * Perform folder import (main logic, called within lock)
   */
  async performFolderImport(
    normalizedFolder: string,
    deliveryNumber: 'I' | 'II' | 'III',
    _userId: number
  ): Promise<FolderImportResult> {
    // Extract date from folder name using file system service
    const folderName = this.fileSystemService.getBaseName(normalizedFolder);
    const deliveryDate = this.fileSystemService.extractDateFromFolderName(folderName);

    if (!deliveryDate) {
      throw new ValidationError('Brak daty w nazwie folderu', {
        format: ['Oczekiwany format: DD.MM.YYYY'],
      });
    }

    // Find CSV files recursively using file system service
    const csvFilesData = await this.fileSystemService.findCsvFilesRecursively(normalizedFolder, 3);

    if (csvFilesData.length === 0) {
      throw new ValidationError('Brak plikow CSV', {
        files: ['Nie znaleziono plikow CSV z "uzyte" lub "bele" w nazwie'],
      });
    }

    // Find or create delivery with this date and number
    let delivery = await this.repository.findDeliveryByDateAndNumber(deliveryDate, deliveryNumber);
    const deliveryCreated = !delivery;

    if (!delivery) {
      delivery = await this.repository.createDelivery(deliveryDate, deliveryNumber);
      const dateStr = deliveryDate.toLocaleDateString('pl-PL');
      logger.info(`Utworzono nowa dostawe ${deliveryNumber} na ${dateStr}`);
      emitDeliveryCreated(delivery);
    }

    // Create uploads directory if not exists using file system service
    const uploadsDir = await this.fileSystemService.ensureUploadsDirectory();

    // Process each CSV file
    const results: FolderImportFileResult[] = [];

    for (const csvFileData of csvFilesData) {
      const fileResult = await this.processSingleCsvFile(
        csvFileData,
        delivery,
        uploadsDir
      );
      results.push(fileResult);
    }

    const successCount = results.filter((r) => r.success).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failCount = results.filter((r) => !r.success && !r.skipped).length;

    // Count files with validation errors and total validation errors
    const filesWithValidationErrors = results.filter(
      (r) => r.validationErrors && r.validationErrors.length > 0
    ).length;
    const totalValidationErrors = results.reduce(
      (sum, r) => sum + (r.validationErrors?.length || 0),
      0
    );

    // Move folder to archive after successful import using file system service
    let archivedPath: string | null = null;
    if (successCount > 0 || skippedCount > 0) {
      try {
        archivedPath = await this.fileSystemService.moveFolderToArchive(normalizedFolder);
        logger.info(`Przeniesiono folder ${folderName} do archiwum: ${archivedPath}`);
      } catch (archiveError) {
        logger.error(
          `Blad przenoszenia folderu do archiwum: ${archiveError instanceof Error ? archiveError.message : 'Nieznany blad'}`
        );
      }
    }

    return {
      delivery: {
        id: delivery.id,
        deliveryDate: delivery.deliveryDate,
        deliveryNumber: delivery.deliveryNumber,
        created: deliveryCreated,
      },
      summary: {
        totalFiles: csvFilesData.length,
        successCount,
        skippedCount,
        failCount,
        filesWithValidationErrors,
        totalValidationErrors,
      },
      results,
      archivedPath,
    };
  }

  /**
   * Process a single CSV file within folder import
   */
  private async processSingleCsvFile(
    csvFileData: CsvFileData,
    delivery: { id: number; deliveryNumber: string | null },
    uploadsDir: string
  ): Promise<FolderImportFileResult> {
    try {
      // Use previewUzyteBeleWithErrors to collect validation errors
      const previewResult = await this.csvParser.previewUzyteBeleWithErrors(csvFileData.filepath);
      const preview = previewResult.data;
      const orderNumber = preview.orderNumber;
      const validationErrors = previewResult.errors;
      const validationSummary = previewResult.summary;

      // Check if this order is already assigned to a DIFFERENT delivery
      const existingOrder = await this.repository.findOrderByOrderNumber(orderNumber);
      if (existingOrder && existingOrder.deliveryOrders.length > 0) {
        // Check if any of those deliveries is different from current one
        const otherDelivery = existingOrder.deliveryOrders.find(
          (dOrder) => dOrder.delivery.id !== delivery.id
        );

        if (otherDelivery) {
          const otherDeliveryDate = new Date(otherDelivery.delivery.deliveryDate).toLocaleDateString('pl-PL');
          logger.warn(
            `Pominieto ${csvFileData.relativePath} - zlecenie ${orderNumber} juz przypisane do innej dostawy`
          );
          return {
            filename: csvFileData.filename,
            relativePath: csvFileData.relativePath,
            success: false,
            skipped: true,
            orderNumber,
            skipReason: `Zlecenie ${orderNumber} jest juz przypisane do dostawy ${otherDelivery.delivery.deliveryNumber || ''} z dnia ${otherDeliveryDate}`,
          };
        }
      }

      // Copy file to uploads with timestamp using file system service
      const safeFilename = this.fileSystemService.generateSafeFilename(
        csvFileData.filename,
        (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_')
      );
      const destPath = this.fileSystemService.joinPath(uploadsDir, safeFilename);

      await this.fileSystemService.copyFile(csvFileData.filepath, destPath);

      // Create import record
      const fileImport = await this.repository.create({
        filename: csvFileData.relativePath,
        filepath: destPath,
        fileType: 'uzyte_bele',
        status: 'processing',
      });

      // Process file
      const result = await this.csvParser.processUzyteBele(destPath, 'add_new');

      // Update import as completed
      await this.repository.update(fileImport.id, {
        status: 'completed',
        processedAt: new Date(),
        metadata: JSON.stringify(result),
      });

      // Get order number
      const order = await this.repository.findOrderById(result.orderId);

      // Add order to delivery (if not already added)
      const existingDeliveryOrder = await this.repository.findExistingDeliveryOrder(
        delivery.id,
        result.orderId
      );

      if (!existingDeliveryOrder) {
        const maxPosition = await this.repository.getMaxDeliveryOrderPosition(delivery.id);
        await this.repository.addOrderToDelivery(delivery.id, result.orderId, maxPosition + 1);
        emitOrderUpdated({ id: result.orderId });
      }

      // Include validation info if there were any failed rows
      const resultItem: FolderImportFileResult = {
        filename: csvFileData.filename,
        relativePath: csvFileData.relativePath,
        success: true,
        orderId: result.orderId,
        orderNumber: order?.orderNumber,
      };

      if (validationErrors.length > 0) {
        resultItem.validationErrors = validationErrors.map((e) => ({
          row: e.row,
          field: e.field,
          reason: e.reason,
        }));
        resultItem.validationSummary = {
          totalRows: validationSummary.totalRows,
          successRows: validationSummary.successRows,
          failedRows: validationSummary.failedRows,
        };
        logger.warn(
          `Zaimportowano ${csvFileData.relativePath} -> zlecenie ${order?.orderNumber} (${validationSummary.failedRows} wierszy pominiętych z powodu błędów walidacji)`
        );
      } else {
        logger.info(`Zaimportowano ${csvFileData.relativePath} -> zlecenie ${order?.orderNumber}`);
      }

      return resultItem;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nieznany blad';
      logger.error(`Blad importu ${csvFileData.relativePath}: ${errorMessage}`);
      return {
        filename: csvFileData.filename,
        relativePath: csvFileData.relativePath,
        success: false,
        error: errorMessage,
      };
    }
  }

  // ============================================================
  // FOLDER SCANNING
  // ============================================================

  /**
   * Scan a folder and return info about CSV files
   */
  async scanFolder(folderPath: string, userId?: number): Promise<FolderScanResult> {
    const basePath = await this.settingsService.getImportsBasePath(userId);
    const normalizedFolder = this.fileSystemService.normalizePath(folderPath);

    // Validate folder is within allowed base path (using file system service)
    this.fileSystemService.validatePathWithinBase(normalizedFolder, basePath);

    // Validate folder exists and is a directory (using file system service)
    this.fileSystemService.validateDirectory(normalizedFolder);

    // Extract date from folder name using file system service
    const folderName = this.fileSystemService.getBaseName(normalizedFolder);
    const extractedDate = this.fileSystemService.extractDateFromFolderName(folderName);

    const detectedDate = extractedDate ? extractedDate.toISOString().split('T')[0] : null;

    // Find CSV files recursively using file system service
    const csvFilesData = await this.fileSystemService.findCsvFilesRecursively(normalizedFolder, 3);

    // Get preview of each file and check for duplicates + variant conflicts
    const previews = await this.getFilesPreviews(csvFilesData);

    // Check if delivery exists for this date
    let existingDeliveries: Array<{ id: number; deliveryNumber: string | null }> = [];
    if (detectedDate) {
      const dateObj = new Date(detectedDate);
      existingDeliveries = await this.repository.findDeliveriesOnDate(dateObj);
    }

    return {
      folderName,
      detectedDate,
      csvFiles: previews,
      existingDeliveries,
    };
  }

  /**
   * Get previews for a list of CSV files
   */
  private async getFilesPreviews(
    csvFilesData: CsvFileData[]
  ): Promise<FolderScanResult['csvFiles']> {
    const previews: FolderScanResult['csvFiles'] = [];

    for (const csvFileData of csvFilesData) {
      try {
        const preview = await this.csvParser.previewUzyteBele(csvFileData.filepath);

        // Check if order is already assigned to any delivery
        let existingDeliveryInfo: {
          deliveryId: number;
          deliveryNumber: string | null;
          deliveryDate: string;
        } | undefined;

        const existingOrder = await this.repository.findOrderByOrderNumber(preview.orderNumber);
        if (existingOrder && existingOrder.deliveryOrders.length > 0) {
          const firstDeliveryOrder = existingOrder.deliveryOrders[0];
          existingDeliveryInfo = {
            deliveryId: firstDeliveryOrder.delivery.id,
            deliveryNumber: firstDeliveryOrder.delivery.deliveryNumber,
            deliveryDate: new Date(firstDeliveryOrder.delivery.deliveryDate)
              .toISOString()
              .split('T')[0],
          };
        }

        // Check for variant conflicts using conflict service
        let variantConflict: {
          hasConflict: boolean;
          conflictType?: string;
          recommendation?: string;
        } | undefined;

        const conflictResult = await this.conflictService.detectConflicts(
          preview.orderNumber,
          preview
        );

        if (conflictResult.hasConflict && conflictResult.conflict) {
          variantConflict = {
            hasConflict: true,
            conflictType: conflictResult.conflict.type,
            recommendation: conflictResult.conflict.recommendation,
          };
        }

        previews.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          orderNumber: preview.orderNumber,
          requirementsCount: preview.requirements.length,
          windowsCount: preview.windows.length,
          existingDeliveryInfo,
          variantConflict,
        });
      } catch {
        previews.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          orderNumber: 'BLAD',
          requirementsCount: 0,
          windowsCount: 0,
        });
      }
    }

    return previews;
  }

  // ============================================================
  // PREVIEW
  // ============================================================

  /**
   * Get preview for uzyte bele import with variant conflict detection
   * Used by ImportService.getPreview
   */
  async getUzyteBelePreview(filepath: string) {
    // Parse CSV with error reporting using validation service
    const parseResult = await this.validationService.parseAndValidateCsvWithErrors(filepath);

    // Detect variant conflicts using conflict service
    const conflictResult = await this.conflictService.detectConflicts(
      parseResult.data.orderNumber,
      parseResult.data
    );

    // Format requirements and windows as data array
    const data = [
      ...parseResult.data.requirements.map((req: any) => ({ ...req, type: 'requirement' })),
      ...parseResult.data.windows.map((win: any) => ({ ...win, type: 'window' })),
    ];

    return {
      data,
      summary: {
        totalRecords: parseResult.summary.totalRows,
        validRecords: parseResult.summary.successRows,
        invalidRecords: parseResult.summary.failedRows,
      },
      errors: parseResult.errors,
      metadata: {
        orderNumber: parseResult.data.orderNumber,
        totals: parseResult.data.totals,
        variantConflict: conflictResult.conflict,
      },
    };
  }

  /**
   * Preview file by filepath with variant conflict detection
   */
  async previewByFilepath(filepath: string): Promise<any> {
    // Parse and validate CSV with error reporting using validation service
    const parseResult = await this.validationService.parseAndValidateCsvWithErrors(filepath);

    // Check for variant conflicts using conflict service
    const conflictResult = await this.conflictService.detectConflicts(
      parseResult.data.orderNumber,
      parseResult.data
    );

    return {
      ...parseResult.data,
      errors: parseResult.errors,
      summary: parseResult.summary,
      variantConflict: conflictResult.conflict,
    };
  }
}
