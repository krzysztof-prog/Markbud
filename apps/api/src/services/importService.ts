/**
 * Import Service - Business logic layer
 */

import { writeFile, mkdir, readdir, copyFile } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { ImportRepository } from '../repositories/ImportRepository.js';
import { CsvParser } from './parsers/csv-parser.js';
import { PdfParser } from './parsers/pdf-parser.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { emitDeliveryCreated, emitOrderUpdated } from './event-emitter.js';

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
}

export class ImportService {
  constructor(private repository: ImportRepository) {}

  /**
   * Get imports base path from settings or environment
   */
  async getImportsBasePath(): Promise<string> {
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
  async uploadFile(filename: string, buffer: Buffer) {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new ValidationError('Plik jest zbyt duzy', {
        size: [`Maksymalny rozmiar to 10MB, a plik ma ${(buffer.length / 1024 / 1024).toFixed(2)}MB`],
      });
    }

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

    // Save file with unique name
    const timestamp = Date.now();
    const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
        await this.repository.update(importId, {
          status: 'pending',
          metadata: JSON.stringify({
            autoImportError: true,
            errorType: 'order_not_found',
            parsed: preview,
            message: `Zlecenie ${preview.orderNumber} nie istnieje w bazie danych`,
          }),
        });

        const fileImport = await this.repository.findById(importId);
        return {
          fileImport,
          autoImportStatus: 'error',
          autoImportError: `Zlecenie ${preview.orderNumber} nie istnieje - wymaga recznego zatwierdzenia`,
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
   * Get preview of import file
   */
  async getPreview(id: number) {
    const fileImport = await this.getImportById(id);

    if (fileImport.fileType === 'uzyte_bele') {
      const parser = new CsvParser();
      return parser.previewUzyteBele(fileImport.filepath);
    }

    if (fileImport.fileType === 'ceny_pdf') {
      const parser = new PdfParser();
      return parser.previewCenyPdf(fileImport.filepath);
    }

    return { message: 'Podglad dla tego typu pliku nie jest jeszcze dostepny' };
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
        result = await parser.processCenyPdf(fileImport.filepath);
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

    // Use transaction for atomic processing and adding to delivery
    const result = await this.repository.executeTransaction(async (tx) => {
      const parser = new CsvParser();
      const processResult = await parser.processUzyteBele(fileImport.filepath, action, replaceBase);

      // If file was from File Watcher, add order to delivery
      if (deliveryId && processResult.orderId) {
        const delivery = await tx.delivery.findUnique({
          where: { id: deliveryId },
        });

        if (delivery) {
          const existingDeliveryOrder = await tx.deliveryOrder.findUnique({
            where: {
              deliveryId_orderId: {
                deliveryId,
                orderId: processResult.orderId,
              },
            },
          });

          if (!existingDeliveryOrder) {
            const maxPosition = await tx.deliveryOrder.aggregate({
              where: { deliveryId },
              _max: { position: true },
            });

            await tx.deliveryOrder.create({
              data: {
                deliveryId,
                orderId: processResult.orderId,
                position: (maxPosition._max.position || 0) + 1,
              },
            });

            logger.info(`   Dodano zlecenie do dostawy ID: ${deliveryId}`);
          }
        } else {
          logger.warn(`   Dostawa ID ${deliveryId} nie istnieje, pominieto dodanie do dostawy`);
        }
      }

      return processResult;
    });

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
   */
  async importFromFolder(folderPath: string, deliveryNumber: 'I' | 'II' | 'III') {
    const basePath = await this.getImportsBasePath();
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
    const failCount = results.filter((r) => !r.success).length;

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
        failCount,
      },
      results,
    };
  }

  /**
   * List folders with dates in their names
   */
  async listFolders() {
    const basePath = await this.getImportsBasePath();

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
   * Scan a folder and return info about CSV files
   */
  async scanFolder(folderPath: string) {
    const basePath = await this.getImportsBasePath();
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

    // Get preview of each file
    const parser = new CsvParser();
    const previews: Array<{
      filename: string;
      relativePath: string;
      orderNumber: string;
      requirementsCount: number;
      windowsCount: number;
    }> = [];

    for (const csvFileData of csvFilesData) {
      try {
        const preview = await parser.previewUzyteBele(csvFileData.filepath);
        previews.push({
          filename: csvFileData.filename,
          relativePath: csvFileData.relativePath,
          orderNumber: preview.orderNumber,
          requirementsCount: preview.requirements.length,
          windowsCount: preview.windows.length,
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
}
