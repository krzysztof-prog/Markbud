/**
 * Import Service - Business logic layer
 */

import { writeFile, mkdir, readdir, copyFile, rename, rm } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { ImportRepository } from '../repositories/ImportRepository.js';
import { CsvParser } from './parsers/csv-parser.js';
import { PdfParser } from './parsers/pdf-parser.js';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { emitDeliveryCreated, emitOrderUpdated } from './event-emitter.js';
import { validateUploadedFile, sanitizeFilename } from '../utils/file-validation.js';
import { OrderVariantService, type VariantResolutionAction } from './orderVariantService.js';
import { ImportLockService } from './importLockService.js';
import { prisma } from '../index.js';

// Default base path for imports
const DEFAULT_IMPORTS_BASE_PATH = 'C:\\Dostawy';

interface CsvFileData {
  filepath: string;
  filename: string;
  relativePath: string;
}

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
  private variantService: OrderVariantService;
  private lockService: ImportLockService;

  constructor(private repository: ImportRepository) {
    this.variantService = new OrderVariantService(prisma);
    this.lockService = new ImportLockService(prisma);
  }

  /**
   * Get imports base path from settings or environment
   * Supports per-user folder settings if userId is provided
   */
  async getImportsBasePath(userId?: number): Promise<string> {
    // Check for user-specific settings first
    if (userId) {
      const userSettings = await prisma.userFolderSettings.findUnique({
        where: { userId },
      });
      if (userSettings && userSettings.isActive) {
        return userSettings.importsBasePath;
      }
    }

    // Fallback to global setting
    const settingValue = await this.repository.getSetting('importsBasePath');
    if (settingValue) {
      return settingValue;
    }
    return process.env.IMPORTS_BASE_PATH || DEFAULT_IMPORTS_BASE_PATH;
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
   */
  async uploadFile(filename: string, buffer: Buffer, mimeType?: string) {
    // SECURITY: Validate file before processing
    validateUploadedFile(filename, mimeType, buffer.length);

    // Determine file type based on filename
    const lowerFilename = filename.toLowerCase();
    let fileType = 'unknown';

    if (lowerFilename.includes('uzyte') || lowerFilename.includes('bele') || lowerFilename.endsWith('.csv')) {
      fileType = 'uzyte_bele';
    } else if (lowerFilename.endsWith('.pdf')) {
      fileType = 'ceny_pdf';
    }

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file with unique name (sanitized for security)
    const timestamp = Date.now();
    const safeFilename = `${timestamp}_${sanitizeFilename(filename)}`;
    const filepath = path.join(uploadsDir, safeFilename);

    await writeFile(filepath, buffer);

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
   */
  private async autoImportPdf(importId: number, filepath: string, filename: string) {
    try {
      const parser = new PdfParser();
      const preview = await parser.previewCenyPdf(filepath);

      // Check if order exists
      const order = await this.repository.findOrderByNumber(preview.orderNumber);

      if (!order) {
        // Zapisz cenę do pending_order_prices - będzie automatycznie przypisana gdy zlecenie się pojawi
        await prisma.pendingOrderPrice.create({
          data: {
            orderNumber: preview.orderNumber,
            reference: preview.reference || null,
            currency: preview.currency,
            valueNetto: preview.valueNetto,
            valueBrutto: preview.valueBrutto || null,
            filename,
            filepath,
            importId,
            status: 'pending',
          },
        });

        // Oznacz import jako completed (cena została zapisana do pending)
        await this.repository.update(importId, {
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify({
            savedAsPending: true,
            orderNumber: preview.orderNumber,
            parsed: preview,
            message: `Cena dla ${preview.orderNumber} zapisana - zostanie automatycznie przypisana gdy zlecenie sie pojawi`,
          }),
        });

        logger.info(`PDF price saved as pending: ${filename} -> ${preview.orderNumber} (${preview.currency} ${preview.valueNetto})`);

        const fileImport = await this.repository.findById(importId);
        return {
          fileImport: { ...fileImport, status: 'completed' },
          autoImportStatus: 'pending_order',
          autoImportMessage: `Cena dla ${preview.orderNumber} zapisana. Zostanie automatycznie przypisana gdy zlecenie się pojawi.`,
        };
      }

      // Check for duplicate
      const existingImport = await this.repository.findDuplicatePdfImport(order.id, importId);

      if (existingImport) {
        await this.repository.update(importId, {
          status: 'pending',
          metadata: JSON.stringify({
            autoImportError: true,
            errorType: 'duplicate',
            parsed: preview,
            existingImportId: existingImport.id,
            existingImportDate: existingImport.processedAt,
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

      await this.repository.update(importId, {
        status: 'completed',
        processedAt: new Date(),
        metadata: JSON.stringify({
          ...result,
          autoImported: true,
          parsed: preview,
        }),
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
   */
  async getPreview(id: number) {
    const fileImport = await this.getImportById(id);

    if (fileImport.fileType === 'uzyte_bele') {
      const parser = new CsvParser();
      const preview = await parser.previewUzyteBele(fileImport.filepath);

      // Detect variant conflicts
      let variantConflict;
      try {
        variantConflict = await this.variantService.detectConflicts(
          preview.orderNumber,
          preview
        );
      } catch (error) {
        logger.error('Variant conflict detection failed', error);
      }

      // Format requirements and windows as data array
      const data = [
        ...preview.requirements.map((req: any) => ({ ...req, type: 'requirement' })),
        ...preview.windows.map((win: any) => ({ ...win, type: 'window' })),
      ];

      return {
        import: fileImport,
        data,
        summary: {
          totalRecords: data.length,
          validRecords: data.length,
          invalidRecords: 0,
        },
        metadata: {
          orderNumber: preview.orderNumber,
          totals: preview.totals,
          variantConflict,
        },
      };
    }

    if (fileImport.fileType === 'ceny_pdf') {
      const parser = new PdfParser();
      const preview = await parser.previewCenyPdf(fileImport.filepath);

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
   */
  async approveImport(id: number, action: 'overwrite' | 'add_new' = 'add_new', replaceBase: boolean = false) {
    const fileImport = await this.getImportById(id);

    if (fileImport.status !== 'pending') {
      throw new ValidationError('Import juz zostal przetworzony');
    }

    // Mark as processing
    await this.repository.update(id, { status: 'processing' });

    try {
      let result;

      if (fileImport.fileType === 'uzyte_bele') {
        result = await this.processUzyteBeleImport(fileImport, action, replaceBase);
      } else if (fileImport.fileType === 'ceny_pdf') {
        const parser = new PdfParser();

        // Najpierw sprawdź czy zlecenie istnieje
        const preview = await parser.previewCenyPdf(fileImport.filepath);
        const order = await this.repository.findOrderByNumber(preview.orderNumber);

        if (order) {
          // Zlecenie istnieje - przypisz cenę bezpośrednio
          result = await parser.processCenyPdf(fileImport.filepath);
        } else {
          // Zlecenie nie istnieje - zapisz do PendingOrderPrice
          await prisma.pendingOrderPrice.create({
            data: {
              orderNumber: preview.orderNumber,
              reference: preview.reference || null,
              currency: preview.currency,
              valueNetto: preview.valueNetto,
              valueBrutto: preview.valueBrutto || null,
              filename: fileImport.filename,
              filepath: fileImport.filepath,
              importId: id,
              status: 'pending',
            },
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

      // Mark as completed
      await this.repository.update(id, {
        status: 'completed',
        processedAt: new Date(),
        metadata: JSON.stringify(result),
      });

      return { success: true, result };
    } catch (error) {
      // Mark as error
      await this.repository.update(id, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Nieznany blad',
      });

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
    const fileImport = await this.getImportById(id);

    if (fileImport.status !== 'pending') {
      throw new ValidationError('Import juz zostal przetworzony');
    }

    // Mark as processing
    await this.repository.update(id, { status: 'processing' });

    try {
      let result;

      // Parse the file to get order number and data
      const parser = new CsvParser();
      const preview = await parser.previewUzyteBele(fileImport.filepath);
      const orderNumberParsed = parser.parseOrderNumber(preview.orderNumber);

      logger.info('Processing import with variant resolution', {
        importId: id,
        orderNumber: preview.orderNumber,
        resolutionType: resolution.type,
      });

      // Handle different resolution types
      switch (resolution.type) {
        case 'replace':
          // Replace existing order (use replaceBase=true)
          logger.info('Resolution: Replace existing order', {
            targetOrder: resolution.targetOrderNumber,
          });
          result = await this.processUzyteBeleImport(fileImport, 'overwrite', true);
          break;

        case 'keep_both':
          // Import as new variant - use full variant number
          logger.info('Resolution: Keep both variants', {
            newOrder: preview.orderNumber,
          });
          result = await this.processUzyteBeleImport(fileImport, 'add_new', false);
          break;

        case 'use_latest':
          // Delete older variants, then import
          logger.info('Resolution: Use latest variant', {
            deleteOlder: resolution.deleteOlder,
          });

          if (resolution.deleteOlder) {
            // Find all related orders
            const relatedOrders = await this.variantService.findRelatedOrders(
              orderNumberParsed.base
            );

            logger.info('Deleting older variants', {
              count: relatedOrders.length,
              orders: relatedOrders.map(o => o.orderNumber),
            });

            // Delete all related orders in transaction
            await prisma.$transaction(async (tx) => {
              for (const relatedOrder of relatedOrders) {
                if (relatedOrder.id) {
                  // Delete requirements first
                  await tx.orderRequirement.deleteMany({
                    where: { orderId: relatedOrder.id },
                  });

                  // Delete windows
                  await tx.orderWindow.deleteMany({
                    where: { orderId: relatedOrder.id },
                  });

                  // Delete delivery associations
                  await tx.deliveryOrder.deleteMany({
                    where: { orderId: relatedOrder.id },
                  });

                  // Delete the order
                  await tx.order.delete({
                    where: { id: relatedOrder.id },
                  });

                  logger.info(`Deleted variant ${relatedOrder.orderNumber}`);
                }
              }
            });
          }

          // Import the new order
          result = await this.processUzyteBeleImport(fileImport, 'add_new', false);
          break;

        case 'merge':
          // Merge with existing order - not fully implemented yet
          // For now, treat as add_new
          logger.warn('Merge resolution not fully implemented, using add_new');
          result = await this.processUzyteBeleImport(fileImport, 'add_new', false);
          break;

        case 'cancel':
          // Cancel import - mark as rejected
          await this.repository.update(id, {
            status: 'rejected',
            metadata: JSON.stringify({
              resolutionType: 'cancelled',
              cancelledAt: new Date().toISOString(),
            }),
          });
          return { success: false, result: { cancelled: true } };

        default:
          throw new ValidationError('Nieznany typ rozwiazania konfliktu');
      }

      // Mark as completed
      await this.repository.update(id, {
        status: 'completed',
        processedAt: new Date(),
        metadata: JSON.stringify({
          ...result,
          resolutionType: resolution.type,
          targetOrderNumber: 'targetOrderNumber' in resolution ? resolution.targetOrderNumber : undefined,
        }),
      });

      logger.info('Import completed with variant resolution', {
        importId: id,
        resolutionType: resolution.type,
        orderId: result.orderId,
      });

      return { success: true, result };
    } catch (error) {
      // Mark as error
      const errorMessage = error instanceof Error ? error.message : 'Nieznany blad';

      await this.repository.update(id, {
        status: 'error',
        errorMessage,
      });

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
    const normalizedBase = path.resolve(basePath);
    const normalizedFolder = path.resolve(folderPath);

    // Ensure folder is within allowed base path (case-insensitive on Windows)
    if (!normalizedFolder.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
      throw new ForbiddenError('Folder musi znajdowac sie w dozwolonej lokalizacji');
    }

    // Check if folder exists
    if (!existsSync(normalizedFolder)) {
      throw new NotFoundError('Folder');
    }

    // Check if it's actually a directory
    const stats = statSync(normalizedFolder);
    if (!stats.isDirectory()) {
      throw new ValidationError('Sciezka nie jest folderem');
    }

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

    // Extract date from folder name (format DD.MM.YYYY)
    const folderName = path.basename(normalizedFolder);
    const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);

    if (!dateMatch) {
      throw new ValidationError('Brak daty w nazwie folderu', {
        format: ['Oczekiwany format: DD.MM.YYYY'],
      });
    }

    const [, day, month, year] = dateMatch;
    const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (isNaN(deliveryDate.getTime())) {
      throw new ValidationError('Nieprawidlowa data', {
        date: [`Data ${day}.${month}.${year} jest nieprawidlowa`],
      });
    }

    // Find CSV files recursively
    const csvFilesData = await this.findCsvFilesRecursively(normalizedFolder, 3);

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
      logger.info(`Utworzono nowa dostawe ${deliveryNumber} na ${day}.${month}.${year}`);
      emitDeliveryCreated(delivery);
    }

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

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

        // Copy file to uploads with timestamp
        const timestamp = Date.now();
        const safeFilename = `${timestamp}_${csvFileData.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const destPath = path.join(uploadsDir, safeFilename);

        await copyFile(csvFileData.filepath, destPath);

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

    // Move folder to archive after successful import
    let archivedPath: string | null = null;
    if (successCount > 0 || skippedCount > 0) {
      try {
        archivedPath = await this.moveFolderToArchive(normalizedFolder);
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

    if (!existsSync(basePath)) {
      return {
        error: 'Folder bazowy nie istnieje',
        details: `Skonfiguruj IMPORTS_BASE_PATH w .env lub utworz folder: ${basePath}`,
        basePath,
        folders: [],
      };
    }

    try {
      const entries = await readdir(basePath, { withFileTypes: true });
      const folders = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
          const folderName = entry.name;
          const fullPath = path.join(basePath, folderName);
          const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);

          return {
            name: folderName,
            path: fullPath,
            hasDate: !!dateMatch,
            date: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null,
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
    const normalizedBase = path.resolve(basePath);
    const normalizedFolder = path.resolve(folderPath);

    // Ensure folder is within allowed base path (case-insensitive on Windows)
    if (!normalizedFolder.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
      throw new ForbiddenError('Folder musi znajdowac sie w dozwolonej lokalizacji');
    }

    // Check if folder exists
    if (!existsSync(normalizedFolder)) {
      throw new NotFoundError('Folder');
    }

    // Check if it's actually a directory
    const stats = statSync(normalizedFolder);
    if (!stats.isDirectory()) {
      throw new ValidationError('Sciezka nie jest folderem');
    }

    // Use the existing moveFolderToArchive method
    const archivedPath = await this.moveFolderToArchive(normalizedFolder);
    logger.info(`Folder ${path.basename(normalizedFolder)} zarchiwizowany: ${archivedPath}`);

    return archivedPath;
  }

  /**
   * Delete a folder permanently
   * @param folderPath - Full path to the folder to delete
   * @param userId - Optional user ID for per-user folder settings
   */
  async deleteFolder(folderPath: string, userId?: number): Promise<void> {
    const basePath = await this.getImportsBasePath(userId);
    const normalizedBase = path.resolve(basePath);
    const normalizedFolder = path.resolve(folderPath);

    // Ensure folder is within allowed base path (case-insensitive on Windows)
    if (!normalizedFolder.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
      throw new ForbiddenError('Folder musi znajdowac sie w dozwolonej lokalizacji');
    }

    // Check if folder exists
    if (!existsSync(normalizedFolder)) {
      throw new NotFoundError('Folder');
    }

    // Check if it's actually a directory
    const stats = statSync(normalizedFolder);
    if (!stats.isDirectory()) {
      throw new ValidationError('Sciezka nie jest folderem');
    }

    // Delete folder recursively
    await rm(normalizedFolder, { recursive: true, force: true });
    logger.info(`Folder ${path.basename(normalizedFolder)} usuniety: ${normalizedFolder}`);
  }

  /**
   * Scan a folder and return info about CSV files
   * Supports per-user folder settings if userId is provided
   */
  async scanFolder(folderPath: string, userId?: number) {
    const basePath = await this.getImportsBasePath(userId);
    const normalizedBase = path.resolve(basePath);
    const normalizedFolder = path.resolve(folderPath);

    // Ensure folder is within allowed base path
    if (!normalizedFolder.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
      throw new ForbiddenError('Folder musi znajdowac sie w dozwolonej lokalizacji');
    }

    if (!existsSync(normalizedFolder)) {
      throw new NotFoundError('Folder');
    }

    const stats = statSync(normalizedFolder);
    if (!stats.isDirectory()) {
      throw new ValidationError('Sciezka nie jest folderem');
    }

    // Extract date from folder name
    const folderName = path.basename(normalizedFolder);
    const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);

    let detectedDate: string | null = null;
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      detectedDate = `${year}-${month}-${day}`;
    }

    // Find CSV files recursively
    const csvFilesData = await this.findCsvFilesRecursively(normalizedFolder, 3);

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

        // Check for variant conflicts
        let variantConflict: {
          hasConflict: boolean;
          conflictType?: string;
          recommendation?: string;
        } | undefined;

        try {
          const conflict = await this.variantService.detectConflicts(
            preview.orderNumber,
            preview
          );

          if (conflict) {
            variantConflict = {
              hasConflict: true,
              conflictType: conflict.type,
              recommendation: conflict.recommendation,
            };
          }
        } catch (variantError) {
          logger.error('Variant detection failed for preview', {
            orderNumber: preview.orderNumber,
            error: variantError,
          });
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

  /**
   * Recursively find CSV files with "uzyte" or "bele" in name
   */
  private async findCsvFilesRecursively(
    dirPath: string,
    maxDepth: number = 3,
    currentDepth: number = 0
  ): Promise<CsvFileData[]> {
    const results: CsvFileData[] = [];

    if (currentDepth > maxDepth) {
      return results;
    }

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subResults = await this.findCsvFilesRecursively(fullPath, maxDepth, currentDepth + 1);
          results.push(...subResults);
        } else if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase();
          if (lowerName.endsWith('.csv') && (lowerName.includes('uzyte') || lowerName.includes('bele'))) {
            const relativePath = path.relative(dirPath, fullPath);
            results.push({
              filepath: fullPath,
              filename: entry.name,
              relativePath,
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Blad podczas skanowania ${dirPath}: ${error instanceof Error ? error.message : 'Nieznany blad'}`);
    }

    return results;
  }

  /**
   * Move imported folder to archive subfolder
   * Creates "archiwum" subfolder in the parent directory if it doesn't exist
   */
  private async moveFolderToArchive(folderPath: string): Promise<string> {
    const parentDir = path.dirname(folderPath);
    const folderName = path.basename(folderPath);
    const archiveDir = path.join(parentDir, 'archiwum');
    const archivePath = path.join(archiveDir, folderName);

    // Create archive directory if it doesn't exist
    if (!existsSync(archiveDir)) {
      await mkdir(archiveDir, { recursive: true });
      logger.info(`Utworzono folder archiwum: ${archiveDir}`);
    }

    // Check if destination already exists (shouldn't happen, but handle gracefully)
    if (existsSync(archivePath)) {
      // Add timestamp to make it unique
      const timestamp = Date.now();
      const uniqueArchivePath = path.join(archiveDir, `${folderName}_${timestamp}`);
      await rename(folderPath, uniqueArchivePath);
      return uniqueArchivePath;
    }

    // Move folder to archive
    await rename(folderPath, archivePath);
    return archivePath;
  }

  /**
   * Preview file by filepath with variant conflict detection
   */
  async previewByFilepath(filepath: string): Promise<any> {
    // Validate filepath exists
    if (!existsSync(filepath)) {
      throw new NotFoundError('File');
    }

    const parser = new CsvParser();
    const preview = await parser.previewUzyteBele(filepath);

    // Check for variant conflicts
    const variantConflict = await this.variantService.detectConflicts(preview.orderNumber, preview);

    return {
      ...preview,
      variantConflict,
    };
  }

  /**
   * Process import with optional variant resolution
   */
  async processImport(
    filepath: string,
    deliveryNumber?: 'I' | 'II' | 'III',
    resolution?: VariantResolutionAction
  ) {
    // Validate filepath exists
    if (!existsSync(filepath)) {
      throw new NotFoundError('File');
    }

    const parser = new CsvParser();
    const preview = await parser.previewUzyteBele(filepath);

    // Check for variant conflicts if no resolution provided
    const variantConflict = await this.variantService.detectConflicts(preview.orderNumber, preview);

    if (variantConflict && !resolution) {
      throw new ValidationError('Variant conflict detected - resolution required', {
        variantConflict: [JSON.stringify(variantConflict)],
      });
    }

    // Handle cancellation
    if (resolution && resolution.type === 'cancel') {
      return {
        success: false,
        message: 'Import cancelled by user',
      };
    }

    // Process based on resolution strategy
    let action: 'overwrite' | 'add_new' = 'add_new';
    let replaceBase = false;

    if (resolution) {
      switch (resolution.type) {
        case 'replace':
          action = 'overwrite';
          break;
        case 'merge':
          action = 'add_new';
          replaceBase = false;
          break;
        case 'use_latest':
          // Delete older variants if requested
          if (resolution.deleteOlder && variantConflict) {
            for (const existingOrder of variantConflict.existingOrders) {
              if (existingOrder.id) {
                await this.repository.deleteOrder(existingOrder.id);
                logger.info(`Deleted older variant: ${existingOrder.orderNumber}`);
              }
            }
          }
          action = 'add_new';
          break;
        case 'keep_both':
          action = 'add_new';
          break;
      }
    }

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Copy file to uploads with timestamp
    const timestamp = Date.now();
    const filename = path.basename(filepath);
    const safeFilename = `${timestamp}_${sanitizeFilename(filename)}`;
    const destPath = path.join(uploadsDir, safeFilename);

    await copyFile(filepath, destPath);

    // Create import record
    const fileImport = await this.repository.create({
      filename,
      filepath: destPath,
      fileType: 'uzyte_bele',
      status: 'processing',
    });

    try {
      // Process file
      const result = await parser.processUzyteBele(destPath, action, replaceBase);

      // Update import as completed
      await this.repository.update(fileImport.id, {
        status: 'completed',
        processedAt: new Date(),
        metadata: JSON.stringify({ ...result, resolution }),
      });

      // Add to delivery if specified
      if (deliveryNumber && result.orderId) {
        // Extract date from filepath or use current date
        const folderPath = path.dirname(filepath);
        const folderName = path.basename(folderPath);
        const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);

        let deliveryDate = new Date();
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

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
      await this.repository.update(fileImport.id, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Nieznany blad',
      });

      throw error;
    }
  }
}
