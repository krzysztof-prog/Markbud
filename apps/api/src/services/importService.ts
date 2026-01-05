/**
 * Import Service - Business logic layer (Orchestrator)
 *
 * This service orchestrates import operations, delegating to specialized services:
 *
 * Phase 1 Services:
 * - ImportFileSystemService: File system operations
 * - ImportSettingsService: Settings and path resolution with caching
 *
 * Phase 2 Services:
 * - ImportValidationService: File validation, duplicate detection, business rules
 * - ImportTransactionService: Prisma transaction management, rollback, atomic operations
 * - ImportConflictService: Variant conflict detection and resolution
 */

import { ImportRepository } from '../repositories/ImportRepository.js';
import { CsvParser } from './parsers/csv-parser.js';
import { PdfParser } from './parsers/pdf-parser.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { emitDeliveryCreated, emitOrderUpdated } from './event-emitter.js';
// Note: sanitizeFilename is now delegated to validationService
import type { VariantResolutionAction } from './orderVariantService.js';
import { ImportLockService } from './importLockService.js';
import { prisma } from '../index.js';
import {
  // Phase 1 - File System and Settings
  ImportFileSystemService,
  importFileSystemService,
  ImportSettingsService,
  // Phase 2 - Validation, Transactions, Conflicts
  ImportValidationService,
  ImportTransactionService,
  ImportConflictService,
  // Phase 3 - Parsers with Feature Flags
  getCsvParser,
  getPdfParser,
  useNewCsvParser,
  useNewPdfParser,
  logParserFeatureFlags,
  CsvImportService,
  PdfImportService,
} from './import/index.js';

// Log feature flags on module load for visibility
logParserFeatureFlags();

interface FolderImportResult {
  filename: string;
  relativePath: string;
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export class ImportService {
  // Phase 1 Services
  private fileSystemService: ImportFileSystemService;
  private settingsService: ImportSettingsService;

  // Phase 2 Services
  private validationService: ImportValidationService;
  private transactionService: ImportTransactionService;
  private conflictService: ImportConflictService;

  // Utility services
  private lockService: ImportLockService;

  constructor(private repository: ImportRepository) {
    // Phase 1 - File System and Settings
    this.fileSystemService = importFileSystemService;
    this.settingsService = new ImportSettingsService(prisma, repository);

    // Phase 2 - Validation, Transactions, Conflicts
    this.validationService = new ImportValidationService(prisma, repository);
    this.transactionService = new ImportTransactionService(prisma, repository);
    this.conflictService = new ImportConflictService(prisma, repository, this.transactionService);

    // Utility services
    this.lockService = new ImportLockService(prisma);
  }

  /**
   * Get imports base path from settings or environment
   * Supports per-user folder settings if userId is provided
   *
   * Delegates to ImportSettingsService for caching and user-specific settings
   */
  async getImportsBasePath(userId?: number): Promise<string> {
    return this.settingsService.getImportsBasePath(userId);
  }

  /**
   * Get all imports with optional status filter
   */
  async getAllImports(status?: string) {
    return this.repository.findAll({ status });
  }

  /**
   * Get pending imports
   */
  async getPendingImports() {
    return this.repository.findPending();
  }

  /**
   * Get import by ID
   */
  async getImportById(id: number) {
    const fileImport = await this.repository.findById(id);
    if (!fileImport) {
      throw new NotFoundError('Import');
    }
    return fileImport;
  }

  /**
   * Upload and create a new file import
   * Delegates validation to ImportValidationService
   */
  async uploadFile(filename: string, buffer: Buffer, mimeType?: string) {
    // SECURITY: Validate file before processing (using validation service)
    this.validationService.validateUploadedFile(filename, mimeType, buffer.length);

    // Determine file type based on filename (using validation service)
    const fileType = this.validationService.detectFileType(filename);

    // Create uploads directory if not exists (using file system service)
    const uploadsDir = await this.fileSystemService.ensureUploadsDirectory();

    // Save file with unique name (sanitized for security)
    const safeFilename = this.fileSystemService.generateSafeFilename(
      filename,
      this.validationService.sanitizeFilename.bind(this.validationService)
    );
    const filepath = this.fileSystemService.joinPath(uploadsDir, safeFilename);

    await this.fileSystemService.writeFile(filepath, buffer);

    // Create database record
    const fileImport = await this.repository.create({
      filename,
      filepath,
      fileType,
      status: 'pending',
    });

    // Auto-import for PDF price files
    if (fileType === 'ceny_pdf') {
      return this.autoImportPdf(fileImport.id, filepath, filename);
    }

    return { fileImport, autoImportStatus: null };
  }

  /**
   * Auto-import PDF with price data
   * Uses ValidationService for checks and TransactionService for DB operations
   */
  private async autoImportPdf(importId: number, filepath: string, filename: string) {
    try {
      const parser = new PdfParser();
      const preview = await parser.previewCenyPdf(filepath);

      // Check if order exists (using validation service)
      const orderCheck = await this.validationService.checkOrderExists(preview.orderNumber);

      if (!orderCheck.exists) {
        // Save price to pending_order_prices using transaction service
        await this.transactionService.createPendingOrderPriceSimple({
          orderNumber: preview.orderNumber,
          reference: preview.reference || null,
          currency: preview.currency,
          valueNetto: preview.valueNetto,
          valueBrutto: preview.valueBrutto || null,
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

        logger.info(`PDF price saved as pending: ${filename} -> ${preview.orderNumber} (${preview.currency} ${preview.valueNetto})`);

        const fileImport = await this.repository.findById(importId);
        return {
          fileImport: { ...fileImport, status: 'completed' },
          autoImportStatus: 'pending_order',
          autoImportMessage: `Cena dla ${preview.orderNumber} zapisana. Zostanie automatycznie przypisana gdy zlecenie sie pojawi.`,
        };
      }

      // Check for duplicate (using validation service)
      const duplicateCheck = await this.validationService.checkDuplicatePdfImport(
        orderCheck.orderId!,
        importId
      );

      if (duplicateCheck.isDuplicate) {
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
          fileImport,
          autoImportStatus: 'warning',
          autoImportError: `Duplikat - cena dla ${preview.orderNumber} juz istnieje. Wymaga recznego zatwierdzenia.`,
        };
      }

      // All OK - process automatically
      const result = await parser.processCenyPdf(filepath);

      // Mark as completed using transaction service
      await this.transactionService.markAsCompleted(importId, {
        ...result,
        autoImported: true,
        parsed: preview,
      });

      logger.info(`Auto-import PDF: ${filename} -> zlecenie ${preview.orderNumber} (${preview.currency} ${preview.valueNetto})`);

      const fileImport = await this.repository.findById(importId);
      return {
        fileImport: { ...fileImport, status: 'completed' },
        autoImportStatus: 'success',
        result,
      };
    } catch (error) {
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
        fileImport,
        autoImportStatus: 'error',
        autoImportError: errorMessage,
      };
    }
  }

  /**
   * Get preview of import file with variant conflict detection
   * Uses ConflictService for variant detection
   * TASK 7: Now includes error reporting for validation failures
   */
  async getPreview(id: number) {
    const fileImport = await this.getImportById(id);

    if (fileImport.fileType === 'uzyte_bele') {
      // Parse CSV with error reporting using validation service
      const parseResult = await this.validationService.parseAndValidateCsvWithErrors(fileImport.filepath);

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
        import: fileImport,
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

    if (fileImport.fileType === 'ceny_pdf') {
      // Parse PDF using validation service
      const preview = await this.validationService.parseAndValidatePdf(fileImport.filepath);

      return {
        import: fileImport,
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

    return {
      import: fileImport,
      data: [],
      summary: {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
      },
      message: 'Podglad dla tego typu pliku nie jest jeszcze dostepny',
    };
  }

  /**
   * Approve and process an import
   * Uses TransactionService for status updates and ValidationService for checks
   */
  async approveImport(id: number, action: 'overwrite' | 'add_new' = 'add_new', replaceBase: boolean = false) {
    // Validate import can be processed (using validation service)
    const fileImport = await this.validationService.validateImportCanBeProcessed(id);

    // Mark as processing using transaction service
    await this.transactionService.markAsProcessing(id);

    try {
      let result;

      if (fileImport.fileType === 'uzyte_bele') {
        result = await this.processUzyteBeleImport(fileImport, action, replaceBase);
      } else if (fileImport.fileType === 'ceny_pdf') {
        const parser = new PdfParser();

        // Parse and validate PDF
        const preview = await this.validationService.parseAndValidatePdf(fileImport.filepath);

        // Check if order exists
        const orderCheck = await this.validationService.checkOrderExists(preview.orderNumber);

        if (orderCheck.exists) {
          // Order exists - assign price directly
          result = await parser.processCenyPdf(fileImport.filepath);
        } else {
          // Order doesn't exist - save to PendingOrderPrice using transaction service
          await this.transactionService.createPendingOrderPriceSimple({
            orderNumber: preview.orderNumber,
            reference: preview.reference || null,
            currency: preview.currency,
            valueNetto: preview.valueNetto,
            valueBrutto: preview.valueBrutto || null,
            filename: fileImport.filename,
            filepath: fileImport.filepath,
            importId: id,
          });

          logger.info(`PDF price saved as pending (manual approve): ${fileImport.filename} -> ${preview.orderNumber}`);

          result = {
            savedAsPending: true,
            orderNumber: preview.orderNumber,
            currency: preview.currency,
            valueNetto: preview.valueNetto,
            message: `Cena zapisana - zostanie automatycznie przypisana gdy zlecenie ${preview.orderNumber} sie pojawi`,
          };
        }
      } else {
        throw new ValidationError('Nieobslugiwany typ pliku');
      }

      // Mark as completed using transaction service
      await this.transactionService.markAsCompleted(id, result);

      return { success: true, result };
    } catch (error) {
      // Mark as error using transaction service
      await this.transactionService.markAsError(
        id,
        error instanceof Error ? error.message : 'Nieznany blad'
      );

      throw error;
    }
  }

  /**
   * Process uzyte/bele CSV import with variant resolution
   * Uses ConflictService for resolution execution and TransactionService for DB operations
   */
  async processUzyteBeleWithResolution(
    id: number,
    resolution: VariantResolutionAction
  ): Promise<{ success: boolean; result: unknown }> {
    // Validate import can be processed
    const fileImport = await this.validationService.validateImportCanBeProcessed(id);

    // Mark as processing using transaction service
    await this.transactionService.markAsProcessing(id);

    try {
      let result;

      // Parse the file to get order number and data
      const preview = await this.validationService.parseAndValidateCsv(fileImport.filepath);
      const orderNumberParsed = this.conflictService.parseOrderNumber(preview.orderNumber);

      logger.info('Processing import with variant resolution', {
        importId: id,
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
        await this.transactionService.markAsRejected(id, {
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
      await this.transactionService.markAsCompleted(id, {
        ...result,
        resolutionType: resolution.type,
        targetOrderNumber: 'targetOrderNumber' in resolution ? resolution.targetOrderNumber : undefined,
        resolutionMessage: resolutionResult.message,
        deletedOrders: resolutionResult.deletedOrders,
      });

      logger.info('Import completed with variant resolution', {
        importId: id,
        resolutionType: resolution.type,
        orderId: result.orderId,
      });

      return { success: true, result };
    } catch (error) {
      // Mark as error using transaction service
      const errorMessage = error instanceof Error ? error.message : 'Nieznany blad';

      await this.transactionService.markAsError(id, errorMessage);

      logger.error('Import failed with variant resolution', {
        importId: id,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Process uzyte/bele CSV import
   */
  private async processUzyteBeleImport(
    fileImport: { id: number; filepath: string; metadata: string | null },
    action: 'overwrite' | 'add_new',
    replaceBase: boolean
  ) {
    // Check if file was detected by File Watcher and has deliveryId
    let metadata: Record<string, unknown> = {};
    try {
      metadata = fileImport.metadata ? JSON.parse(fileImport.metadata) : {};
    } catch {
      // Ignore parse errors
    }

    const deliveryId = typeof metadata.deliveryId === 'number' ? metadata.deliveryId : undefined;

    // Process uzyte_bele file (CsvParser uses its own prisma instance)
    const parser = new CsvParser();
    const result = await parser.processUzyteBele(fileImport.filepath, action, replaceBase);

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
   * Reject an import
   */
  async rejectImport(id: number) {
    await this.getImportById(id); // Verify exists
    return this.repository.update(id, { status: 'rejected' });
  }

  /**
   * Delete an import and associated data
   */
  async deleteImport(id: number) {
    const fileImport = await this.getImportById(id);

    // If import was approved and created an order, delete it
    if (fileImport.status === 'completed' && fileImport.metadata) {
      try {
        const metadata = JSON.parse(fileImport.metadata);
        if (metadata.orderId) {
          const order = await this.repository.findOrderById(metadata.orderId);
          if (order) {
            await this.repository.deleteOrder(metadata.orderId);
            logger.info(`Usunieto zlecenie ${metadata.orderId} powiazane z importem ${id}`);
          }
        }
      } catch (e) {
        logger.error('Blad podczas usuwania powiazanego zlecenia:', e);
      }
    }

    await this.repository.delete(id);
  }

  /**
   * Import all CSV files from a folder with date in name
   * Uses locking mechanism to prevent concurrent imports
   */
  async importFromFolder(folderPath: string, deliveryNumber: 'I' | 'II' | 'III', userId: number) {
    const basePath = await this.getImportsBasePath(userId);
    const normalizedFolder = this.fileSystemService.normalizePath(folderPath);

    // Validate folder is within allowed base path (using file system service)
    this.fileSystemService.validatePathWithinBase(normalizedFolder, basePath);

    // Validate folder exists and is a directory (using file system service)
    this.fileSystemService.validateDirectory(normalizedFolder);

    // Acquire lock for this folder
    const lock = await this.lockService.acquireLock(normalizedFolder, userId);
    if (!lock) {
      const existing = await this.lockService.checkLock(normalizedFolder);
      if (existing) {
        throw new ConflictError(
          `Folder jest obecnie importowany przez: ${existing.user.name}. Sprobuj ponownie pozniej.`
        );
      }
      throw new ConflictError('Nie mozna zalokowac folderu do importu');
    }

    try {
      return await this.performFolderImport(normalizedFolder, deliveryNumber, userId);
    } finally {
      // ALWAYS release lock, even if import fails
      await this.lockService.releaseLock(lock.id);
    }
  }

  /**
   * Perform the actual folder import (called within lock)
   */
  private async performFolderImport(normalizedFolder: string, deliveryNumber: 'I' | 'II' | 'III', userId: number) {
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
    const results: FolderImportResult[] = [];
    const parser = new CsvParser();

    for (const csvFileData of csvFilesData) {
      try {
        // First, preview the file to get order number for duplicate check
        const preview = await parser.previewUzyteBele(csvFileData.filepath);
        const orderNumber = preview.orderNumber;

        // Check if this order is already assigned to a DIFFERENT delivery
        const existingOrder = await this.repository.findOrderByOrderNumber(orderNumber);
        if (existingOrder && existingOrder.deliveryOrders.length > 0) {
          // Check if any of those deliveries is different from current one
          const otherDelivery = existingOrder.deliveryOrders.find(
            (dOrder) => dOrder.delivery.id !== delivery.id
          );

          if (otherDelivery) {
            const otherDeliveryDate = new Date(otherDelivery.delivery.deliveryDate).toLocaleDateString('pl-PL');
            results.push({
              filename: csvFileData.filename,
              relativePath: csvFileData.relativePath,
              success: false,
              skipped: true,
              orderNumber,
              skipReason: `Zlecenie ${orderNumber} jest juz przypisane do dostawy ${otherDelivery.delivery.deliveryNumber || ''} z dnia ${otherDeliveryDate}`,
            });
            logger.warn(`Pominieto ${csvFileData.relativePath} - zlecenie ${orderNumber} juz przypisane do innej dostawy`);
            continue;
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
        const result = await parser.processUzyteBele(destPath, 'add_new');

        // Update import as completed
        await this.repository.update(fileImport.id, {
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify(result),
        });

        // Get order number
        const order = await this.repository.findOrderById(result.orderId);

        // Add order to delivery (if not already added)
        const existingDeliveryOrder = await this.repository.findExistingDeliveryOrder(delivery.id, result.orderId);

        if (!existingDeliveryOrder) {
          const maxPosition = await this.repository.getMaxDeliveryOrderPosition(delivery.id);
          await this.repository.addOrderToDelivery(delivery.id, result.orderId, maxPosition + 1);
          emitOrderUpdated({ id: result.orderId });
        }

        results.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          success: true,
          orderId: result.orderId,
          orderNumber: order?.orderNumber,
        });

        logger.info(`Zaimportowano ${csvFileData.relativePath} -> zlecenie ${order?.orderNumber}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Nieznany blad';
        results.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          success: false,
          error: errorMessage,
        });
        logger.error(`Blad importu ${csvFileData.relativePath}: ${errorMessage}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failCount = results.filter((r) => !r.success && !r.skipped).length;

    // Move folder to archive after successful import using file system service
    let archivedPath: string | null = null;
    if (successCount > 0 || skippedCount > 0) {
      try {
        archivedPath = await this.fileSystemService.moveFolderToArchive(normalizedFolder);
        logger.info(`Przeniesiono folder ${folderName} do archiwum: ${archivedPath}`);
      } catch (archiveError) {
        logger.error(`Blad przenoszenia folderu do archiwum: ${archiveError instanceof Error ? archiveError.message : 'Nieznany blad'}`);
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
      },
      results,
      archivedPath,
    };
  }

  /**
   * List folders with dates in their names
   * Supports per-user folder settings if userId is provided
   */
  async listFolders(userId?: number) {
    const basePath = await this.getImportsBasePath(userId);

    if (!this.fileSystemService.exists(basePath)) {
      return {
        error: 'Folder bazowy nie istnieje',
        details: `Skonfiguruj IMPORTS_BASE_PATH w .env lub utworz folder: ${basePath}`,
        basePath,
        folders: [],
      };
    }

    try {
      const entries = await this.fileSystemService.readDirectory(basePath);
      const folders = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
          const folderName = entry.name;
          const fullPath = this.fileSystemService.joinPath(basePath, folderName);
          const extractedDate = this.fileSystemService.extractDateFromFolderName(folderName);

          return {
            name: folderName,
            path: fullPath,
            hasDate: !!extractedDate,
            date: extractedDate ? extractedDate.toISOString().split('T')[0] : null,
          };
        })
        .filter((folder) => folder.hasDate)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      return { basePath, folders };
    } catch (error) {
      return {
        error: 'Blad odczytu folderow',
        details: error instanceof Error ? error.message : 'Nieznany blad',
        basePath,
        folders: [],
      };
    }
  }

  /**
   * Archive a folder to the "archiwum" subdirectory
   * @param folderPath - Full path to the folder to archive
   * @param userId - Optional user ID for per-user folder settings
   * @returns The new path to the archived folder
   */
  async archiveFolder(folderPath: string, userId?: number): Promise<string> {
    const basePath = await this.getImportsBasePath(userId);
    const normalizedFolder = this.fileSystemService.normalizePath(folderPath);

    // Validate folder is within allowed base path (using file system service)
    this.fileSystemService.validatePathWithinBase(normalizedFolder, basePath);

    // Validate folder exists and is a directory (using file system service)
    this.fileSystemService.validateDirectory(normalizedFolder);

    // Use the file system service to move folder to archive
    const archivedPath = await this.fileSystemService.moveFolderToArchive(normalizedFolder);
    logger.info(`Folder ${this.fileSystemService.getBaseName(normalizedFolder)} zarchiwizowany: ${archivedPath}`);

    return archivedPath;
  }

  /**
   * Delete a folder permanently
   * @param folderPath - Full path to the folder to delete
   * @param userId - Optional user ID for per-user folder settings
   */
  async deleteFolder(folderPath: string, userId?: number): Promise<void> {
    const basePath = await this.getImportsBasePath(userId);
    const normalizedFolder = this.fileSystemService.normalizePath(folderPath);

    // Validate folder is within allowed base path (using file system service)
    this.fileSystemService.validatePathWithinBase(normalizedFolder, basePath);

    // Validate folder exists and is a directory (using file system service)
    this.fileSystemService.validateDirectory(normalizedFolder);

    // Delete folder recursively using file system service
    await this.fileSystemService.deleteDirectory(normalizedFolder);
    logger.info(`Folder ${this.fileSystemService.getBaseName(normalizedFolder)} usuniety: ${normalizedFolder}`);
  }

  /**
   * Scan a folder and return info about CSV files
   * Supports per-user folder settings if userId is provided
   */
  async scanFolder(folderPath: string, userId?: number) {
    const basePath = await this.getImportsBasePath(userId);
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
    const parser = new CsvParser();
    const previews: Array<{
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
    }> = [];

    for (const csvFileData of csvFilesData) {
      try {
        const preview = await parser.previewUzyteBele(csvFileData.filepath);

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
            deliveryDate: new Date(firstDeliveryOrder.delivery.deliveryDate).toISOString().split('T')[0],
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

  // Note: findCsvFilesRecursively and moveFolderToArchive methods have been extracted
  // to ImportFileSystemService for better separation of concerns and testability.

  /**
   * Preview file by filepath with variant conflict detection
   * Uses ValidationService for parsing and ConflictService for conflicts
   * TASK 7: Now includes error reporting for validation failures
   */
  async previewByFilepath(filepath: string): Promise<any> {
    // Validate filepath exists using file system service
    if (!this.fileSystemService.exists(filepath)) {
      throw new NotFoundError('File');
    }

    // Parse and validate CSV with error reporting using validation service
    const parseResult = await this.validationService.parseAndValidateCsvWithErrors(filepath);

    // Check for variant conflicts using conflict service
    const conflictResult = await this.conflictService.detectConflicts(parseResult.data.orderNumber, parseResult.data);

    return {
      ...parseResult.data,
      errors: parseResult.errors,
      summary: parseResult.summary,
      variantConflict: conflictResult.conflict,
    };
  }

  /**
   * Process import with optional variant resolution
   * Uses ValidationService for parsing and ConflictService for resolution
   */
  async processImport(
    filepath: string,
    deliveryNumber?: 'I' | 'II' | 'III',
    resolution?: VariantResolutionAction
  ) {
    // Validate filepath exists using file system service
    if (!this.fileSystemService.exists(filepath)) {
      throw new NotFoundError('File');
    }

    // Parse and validate CSV using validation service
    const preview = await this.validationService.parseAndValidateCsv(filepath);

    // Check for variant conflicts if no resolution provided
    const conflictResult = await this.conflictService.detectConflicts(preview.orderNumber, preview);

    if (conflictResult.hasConflict && !resolution) {
      throw new ValidationError('Variant conflict detected - resolution required', {
        variantConflict: [JSON.stringify(conflictResult.conflict)],
      });
    }

    // Handle cancellation
    if (resolution && resolution.type === 'cancel') {
      return {
        success: false,
        message: 'Import cancelled by user',
      };
    }

    // Execute resolution if provided using conflict service
    if (resolution) {
      const resolutionResult = await this.conflictService.executeResolution(
        resolution,
        preview.orderNumber,
        preview
      );

      logger.info('Resolution executed for processImport', {
        action: resolutionResult.action,
        message: resolutionResult.message,
      });
    }

    // Determine import action based on resolution type
    let action: 'overwrite' | 'add_new' = 'add_new';
    let replaceBase = false;

    if (resolution && resolution.type === 'replace') {
      action = 'overwrite';
      replaceBase = true;
    }

    // Create uploads directory if not exists using file system service
    const uploadsDir = await this.fileSystemService.ensureUploadsDirectory();

    // Copy file to uploads with timestamp using file system service
    const filename = this.fileSystemService.getBaseName(filepath);
    const safeFilename = this.fileSystemService.generateSafeFilename(
      filename,
      this.validationService.sanitizeFilename.bind(this.validationService)
    );
    const destPath = this.fileSystemService.joinPath(uploadsDir, safeFilename);

    await this.fileSystemService.copyFile(filepath, destPath);

    // Create import record
    const fileImport = await this.repository.create({
      filename,
      filepath: destPath,
      fileType: 'uzyte_bele',
      status: 'processing',
    });

    try {
      // Process file
      const parser = new CsvParser();
      const result = await parser.processUzyteBele(destPath, action, replaceBase);

      // Update import as completed using transaction service
      await this.transactionService.markAsCompleted(fileImport.id, { ...result, resolution });

      // Add to delivery if specified
      if (deliveryNumber && result.orderId) {
        // Extract date from filepath or use current date (using file system service)
        const folderPath = this.fileSystemService.getDirName(filepath);
        const folderName = this.fileSystemService.getBaseName(folderPath);
        const extractedDate = this.fileSystemService.extractDateFromFolderName(folderName);

        const deliveryDate = extractedDate || new Date();

        // Find or create delivery
        let delivery = await this.repository.findDeliveryByDateAndNumber(deliveryDate, deliveryNumber);
        if (!delivery) {
          delivery = await this.repository.createDelivery(deliveryDate, deliveryNumber);
          emitDeliveryCreated(delivery);
        }

        // Add order to delivery
        const existingDeliveryOrder = await this.repository.findExistingDeliveryOrder(
          delivery.id,
          result.orderId
        );

        if (!existingDeliveryOrder) {
          const maxPosition = await this.repository.getMaxDeliveryOrderPosition(delivery.id);
          await this.repository.addOrderToDelivery(delivery.id, result.orderId, maxPosition + 1);
          emitOrderUpdated({ id: result.orderId });
        }
      }

      // Emit event
      if (result.orderId) {
        emitOrderUpdated({ id: result.orderId });
      }

      return {
        success: true,
        result,
        importId: fileImport.id,
      };
    } catch (error) {
      // Mark as error using transaction service
      await this.transactionService.markAsError(
        fileImport.id,
        error instanceof Error ? error.message : 'Nieznany blad'
      );

      throw error;
    }
  }
}
