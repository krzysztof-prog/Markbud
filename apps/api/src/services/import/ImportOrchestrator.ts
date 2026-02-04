/**
 * Import Orchestrator
 *
 * Coordinates import operations by delegating to specialized processors.
 * This is a thin orchestration layer that handles:
 * - File upload and type detection
 * - Routing to appropriate processor (UzyteBele or Ceny)
 * - Basic CRUD operations on imports
 * - Folder listing and management
 *
 * Business logic is delegated to:
 * - UzyteBeleProcessor: CSV "uzyte bele" processing
 * - CenyProcessor: PDF price file processing
 *
 * Extracted from the monolithic ImportService (1188 lines) to follow
 * Single Responsibility Principle.
 */

import { ImportRepository } from '../../repositories/ImportRepository.js';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { emitOrderUpdated, emitDeliveryCreated } from '../event-emitter.js';
import type { VariantResolutionAction } from '../orderVariantService.js';
import { ImportLockService } from '../importLockService.js';
import { prisma } from '../../index.js';
import { formatDateWarsaw } from '../../utils/date-helpers.js';

import {
  ImportFileSystemService,
  importFileSystemService,
} from './importFileSystemService.js';
import { ImportSettingsService } from './importSettingsService.js';
import { ImportValidationService } from './importValidationService.js';
import { ImportTransactionService } from './importTransactionService.js';
import { ImportConflictService } from './importConflictService.js';
import { UzyteBeleProcessor, type FolderImportResult, type FolderScanResult } from './UzyteBeleProcessor.js';
import { CenyProcessor } from './CenyProcessor.js';

/**
 * Import Orchestrator
 *
 * Main entry point for import operations.
 * Coordinates between specialized processors and shared services.
 */
export class ImportOrchestrator {
  // Shared services
  private fileSystemService: ImportFileSystemService;
  private settingsService: ImportSettingsService;
  private validationService: ImportValidationService;
  private transactionService: ImportTransactionService;
  private conflictService: ImportConflictService;
  private lockService: ImportLockService;

  // Specialized processors
  private uzyteBeleProcessor: UzyteBeleProcessor;
  private cenyProcessor: CenyProcessor;

  constructor(private repository: ImportRepository) {
    // Initialize shared services
    this.fileSystemService = importFileSystemService;
    this.settingsService = new ImportSettingsService(prisma, repository);
    this.validationService = new ImportValidationService(prisma, repository);
    this.transactionService = new ImportTransactionService(prisma, repository);
    this.conflictService = new ImportConflictService(prisma, repository, this.transactionService);
    this.lockService = new ImportLockService(prisma);

    // Initialize processors with shared services
    this.uzyteBeleProcessor = new UzyteBeleProcessor(
      prisma,
      repository,
      this.validationService,
      this.transactionService,
      this.conflictService,
      this.settingsService
    );

    this.cenyProcessor = new CenyProcessor(
      prisma,
      repository,
      this.validationService,
      this.transactionService
    );
  }

  // ============================================================
  // SETTINGS
  // ============================================================

  /**
   * Get imports base path from settings or environment
   * Supports per-user folder settings if userId is provided
   */
  async getImportsBasePath(userId?: number): Promise<string> {
    return this.settingsService.getImportsBasePath(userId);
  }

  // ============================================================
  // BASIC CRUD OPERATIONS
  // ============================================================

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

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  /**
   * Upload and create a new file import
   * Routes to appropriate processor based on file type
   */
  async uploadFile(filename: string, buffer: Buffer, mimeType?: string) {
    // SECURITY: Validate file before processing
    this.validationService.validateUploadedFile(filename, mimeType, buffer.length);

    // Determine file type based on filename
    const fileType = this.validationService.detectFileType(filename);

    // Create uploads directory if not exists
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
      return this.cenyProcessor.autoImportPdf(fileImport.id, filepath, filename);
    }

    return { fileImport, autoImportStatus: null };
  }

  // ============================================================
  // PREVIEW
  // ============================================================

  /**
   * Get preview of import file with variant conflict detection
   */
  async getPreview(id: number) {
    const fileImport = await this.getImportById(id);

    if (fileImport.fileType === 'uzyte_bele' || fileImport.fileType === 'uzyte_bele_prywatne') {
      const preview = await this.uzyteBeleProcessor.getUzyteBelePreview(fileImport.filepath);
      return {
        import: fileImport,
        ...preview,
      };
    }

    if (fileImport.fileType === 'ceny_pdf') {
      const preview = await this.cenyProcessor.getPdfPreview(fileImport.filepath);
      return {
        import: fileImport,
        ...preview,
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
   * Preview file by filepath with variant conflict detection
   */
  async previewByFilepath(filepath: string): Promise<any> {
    // Validate filepath exists
    if (!this.fileSystemService.exists(filepath)) {
      throw new NotFoundError('File');
    }

    return this.uzyteBeleProcessor.previewByFilepath(filepath);
  }

  // ============================================================
  // APPROVAL
  // ============================================================

  /**
   * Approve and process an import
   */
  async approveImport(id: number, action: 'overwrite' | 'add_new' = 'add_new', replaceBase: boolean = false) {
    // Validate import can be processed
    const fileImport = await this.validationService.validateImportCanBeProcessed(id);

    // Mark as processing
    await this.transactionService.markAsProcessing(id);

    try {
      let result: Record<string, unknown>;

      if (fileImport.fileType === 'uzyte_bele') {
        result = await this.uzyteBeleProcessor.processUzyteBeleImport(fileImport, action, replaceBase) as unknown as Record<string, unknown>;
      } else if (fileImport.fileType === 'uzyte_bele_prywatne') {
        // Import prywatny - przekaż opcję isPrivateImport do tworzenia PrivateColor
        result = await this.uzyteBeleProcessor.processUzyteBeleImport(fileImport, action, replaceBase, { isPrivateImport: true }) as unknown as Record<string, unknown>;
      } else if (fileImport.fileType === 'ceny_pdf') {
        result = await this.cenyProcessor.processPdfApproval(fileImport) as unknown as Record<string, unknown>;
      } else {
        throw new ValidationError('Nieobslugiwany typ pliku');
      }

      // Mark as completed
      await this.transactionService.markAsCompleted(id, result);

      return { success: true, result };
    } catch (error) {
      // Mark as error
      await this.transactionService.markAsError(
        id,
        error instanceof Error ? error.message : 'Nieznany blad'
      );

      throw error;
    }
  }

  /**
   * Process uzyte/bele CSV import with variant resolution
   */
  async processUzyteBeleWithResolution(
    id: number,
    resolution: VariantResolutionAction
  ): Promise<{ success: boolean; result: unknown }> {
    return this.uzyteBeleProcessor.processUzyteBeleWithResolution(id, resolution);
  }

  // ============================================================
  // FOLDER OPERATIONS
  // ============================================================

  /**
   * Import all CSV files from a folder with date in name
   * Uses locking mechanism to prevent concurrent imports
   */
  async importFromFolder(
    folderPath: string,
    deliveryNumber: 'I' | 'II' | 'III',
    userId: number
  ): Promise<FolderImportResult> {
    const basePath = await this.getImportsBasePath(userId);
    const normalizedFolder = this.fileSystemService.normalizePath(folderPath);

    // Validate folder is within allowed base path
    this.fileSystemService.validatePathWithinBase(normalizedFolder, basePath);

    // Validate folder exists and is a directory
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
      return await this.uzyteBeleProcessor.performFolderImport(normalizedFolder, deliveryNumber, userId);
    } finally {
      // ALWAYS release lock, even if import fails
      await this.lockService.releaseLock(lock.id);
    }
  }

  /**
   * List folders with dates in their names
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
            date: extractedDate ? formatDateWarsaw(extractedDate) : null,
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
   * Scan a folder and return info about CSV files
   */
  async scanFolder(folderPath: string, userId?: number): Promise<FolderScanResult> {
    return this.uzyteBeleProcessor.scanFolder(folderPath, userId);
  }

  /**
   * Archive a folder to the "archiwum" subdirectory
   */
  async archiveFolder(folderPath: string, userId?: number): Promise<string> {
    const basePath = await this.getImportsBasePath(userId);
    const normalizedFolder = this.fileSystemService.normalizePath(folderPath);

    // Validate folder is within allowed base path
    this.fileSystemService.validatePathWithinBase(normalizedFolder, basePath);

    // Validate folder exists and is a directory
    this.fileSystemService.validateDirectory(normalizedFolder);

    // Use the file system service to move folder to archive
    const archivedPath = await this.fileSystemService.moveFolderToArchive(normalizedFolder);
    logger.info(`Folder ${this.fileSystemService.getBaseName(normalizedFolder)} zarchiwizowany: ${archivedPath}`);

    return archivedPath;
  }

  /**
   * Delete a folder permanently
   */
  async deleteFolder(folderPath: string, userId?: number): Promise<void> {
    const basePath = await this.getImportsBasePath(userId);
    const normalizedFolder = this.fileSystemService.normalizePath(folderPath);

    // Validate folder is within allowed base path
    this.fileSystemService.validatePathWithinBase(normalizedFolder, basePath);

    // Validate folder exists and is a directory
    this.fileSystemService.validateDirectory(normalizedFolder);

    // Delete folder recursively
    await this.fileSystemService.deleteDirectory(normalizedFolder);
    logger.info(`Folder ${this.fileSystemService.getBaseName(normalizedFolder)} usuniety: ${normalizedFolder}`);
  }

  // ============================================================
  // PROCESS IMPORT BY FILEPATH
  // ============================================================

  /**
   * Process import with optional variant resolution
   * Used for direct file processing (not via upload)
   */
  async processImport(
    filepath: string,
    deliveryNumber?: 'I' | 'II' | 'III',
    resolution?: VariantResolutionAction
  ) {
    // Validate filepath exists
    if (!this.fileSystemService.exists(filepath)) {
      throw new NotFoundError('File');
    }

    // Parse and validate CSV
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

    // Execute resolution if provided
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

    // Create uploads directory if not exists
    const uploadsDir = await this.fileSystemService.ensureUploadsDirectory();

    // Copy file to uploads with timestamp
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
      // Process file using CsvParser directly (for consistency with old behavior)
      const { CsvParser } = await import('../parsers/csv-parser.js');
      const parser = new CsvParser();
      const result = await parser.processUzyteBele(destPath, action, replaceBase);

      // Update import as completed
      await this.transactionService.markAsCompleted(fileImport.id, { ...result, resolution });

      // Add to delivery if specified
      if (deliveryNumber && result.orderId) {
        // Extract date from filepath or use current date
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
      // Mark as error
      await this.transactionService.markAsError(
        fileImport.id,
        error instanceof Error ? error.message : 'Nieznany blad'
      );

      throw error;
    }
  }
}
