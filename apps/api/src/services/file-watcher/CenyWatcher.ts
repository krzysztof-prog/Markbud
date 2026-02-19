import chokidar from 'chokidar';
import path from 'path';
import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';
import { logger } from '../../utils/logger.js';
import { archiveFile, moveToSkipped, shouldSkipImport } from './utils.js';
import type { IFileWatcher, WatcherConfig } from './types.js';
import { DEFAULT_WATCHER_CONFIG } from './types.js';
import { ImportRepository } from '../../repositories/ImportRepository.js';
import { ImportValidationService } from '../import/importValidationService.js';
import { ImportTransactionService } from '../import/importTransactionService.js';
import { CenyProcessor } from '../import/CenyProcessor.js';
import { emitPriceImported, emitPricePending } from '../event-emitter.js';
import { importQueue } from '../import/ImportQueueService.js';

/**
 * Watcher odpowiedzialny za monitorowanie folderu cen:
 * - Pliki PDF z cenami zleceń
 * - Automatyczny import i aktualizacja Order.valuePln/valueEur
 *
 * Używa GLOBALNEJ kolejki importQueue do sekwencyjnego przetwarzania
 * wszystkich importów w systemie - zapobiega timeoutom SQLite
 */
export class CenyWatcher implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private config: WatcherConfig;
  private cenyProcessor: CenyProcessor;

  constructor(prisma: PrismaClient, config: WatcherConfig = DEFAULT_WATCHER_CONFIG) {
    this.prisma = prisma;
    this.config = config;

    // Inicjalizacja CenyProcessor z wymaganymi zależnościami
    const repository = new ImportRepository(prisma);
    const validationService = new ImportValidationService(prisma, repository);
    const transactionService = new ImportTransactionService(prisma, repository);
    this.cenyProcessor = new CenyProcessor(prisma, repository, validationService, transactionService);
  }

  /**
   * Uruchamia watcher dla folderu cen
   * @param cenyPath - ścieżka do folderu z plikami PDF
   */
  async start(cenyPath: string): Promise<void> {
    this.watchCenyFolder(cenyPath);
  }

  async stop(): Promise<void> {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
    logger.info('CenyWatcher zatrzymany');
  }

  getWatchers(): FSWatcher[] {
    return this.watchers;
  }

  /**
   * Dodaje plik do GLOBALNEJ kolejki importów
   * Używa importQueue singleton dla sekwencyjnego przetwarzania wszystkich importów w systemie
   */
  private enqueueToGlobalQueue(filePath: string): void {
    // Sprawdź czy plik nie jest już w kolejce
    if (importQueue.isFileInQueue(filePath)) {
      logger.debug(`Plik juz w kolejce, pomijam: ${path.basename(filePath)}`);
      return;
    }

    importQueue.enqueue({
      type: 'ceny_pdf',
      filePath,
      priority: 15, // Ceny mają niższy priorytet niż zamówienia
      execute: async () => {
        try {
          await this.processCenyPdf(filePath);
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const isTimeoutError =
            errorMessage.includes('Transaction') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('SQLITE_BUSY');
          return {
            success: false,
            error: errorMessage,
            shouldRetry: isTimeoutError,
          };
        }
      },
    });
  }

  /**
   * Obserwuj folder cen (PDF)
   * UWAGA: Na udziałach sieciowych Windows (UNC paths) glob patterns nie działają
   * Dlatego obserwujemy cały folder i filtrujemy pliki po rozszerzeniu
   */
  private watchCenyFolder(basePath: string): void {
    const absolutePath = path.resolve(basePath);

    // Obserwuj folder bezpośrednio (nie glob patterns - nie działają na UNC paths)
    const watcher = chokidar.watch(absolutePath, {
      persistent: true,
      ignoreInitial: false, // Skanuj istniejące przy starcie
      depth: 0, // Tylko pliki w głównym folderze
      usePolling: true, // Polling działa lepiej na udziałach sieciowych
      interval: 5000, // Sprawdzaj co 5s (mniejsze obciążenie sieci/CPU)
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold,
        pollInterval: this.config.pollInterval,
      },
    });

    watcher
      .on('add', (filePath) => {
        // Filtruj tylko pliki PDF
        const filename = path.basename(filePath).toLowerCase();
        if (!filename.endsWith('.pdf')) {
          return;
        }
        // Dodaj do GLOBALNEJ kolejki importów
        this.enqueueToGlobalQueue(filePath);
      })
      .on('error', (error) => {
        logger.error(`Błąd File Watcher dla cen ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   👀 Obserwuję folder cen (PDF): ${absolutePath}`);
  }

  /**
   * Przetwarza plik PDF z ceną
   * Używa CenyProcessor który obsługuje:
   * - Zlecenie istnieje -> aktualizuje cenę
   * - Zlecenie NIE istnieje -> zapisuje do PendingOrderPrice
   */
  private async processCenyPdf(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      // Sprawdź czy plik powinien być pominięty
      // (był importowany I nadal istnieje w archiwum)
      const shouldSkip = await shouldSkipImport(this.prisma, filename, filePath);

      if (shouldSkip) {
        // Plik jest w archiwum - przenieś do pominięte
        await moveToSkipped(filePath);
        return;
      }

      logger.info(`   📄 Nowy plik ceny (PDF): ${filename}`);

      // Zarejestruj import jako processing
      const fileImport = await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'ceny_pdf',
          status: 'processing',
        },
      });

      // Użyj CenyProcessor do przetworzenia PDF
      // Obsługuje zarówno istniejące zlecenia jak i pending prices
      const result = await this.cenyProcessor.autoImportPdf(fileImport.id, filePath, filename);

      // Wyciągnij orderNumber z metadata jeśli dostępne
      const metadata = result.fileImport?.metadata ? JSON.parse(result.fileImport.metadata as string) : {};
      const orderNumber = metadata?.parsed?.orderNumber || metadata?.orderNumber || '';

      // Loguj wynik w zależności od statusu i emituj eventy
      switch (result.autoImportStatus) {
        case 'success': {
          logger.info(`   ✅ Zaimportowano cenę z PDF - przypisano do zlecenia ${orderNumber}`);
          const archivedPath = await archiveFile(filePath);
          // Zaktualizuj filepath w bazie na nową lokalizację w archiwum
          if (archivedPath) {
            await this.prisma.fileImport.update({
              where: { id: fileImport.id },
              data: { filepath: archivedPath },
            });
          }
          // Emituj event o przypisanej cenie
          emitPriceImported({
            filename,
            orderNumber,
            message: result.autoImportMessage || 'Cena przypisana do zlecenia',
          });
          break;
        }

        case 'pending_order': {
          logger.info(`   ⏳ Cena zapisana jako oczekująca - zlecenie ${orderNumber} nie istnieje jeszcze`);
          const archivedPathPending = await archiveFile(filePath);
          // Zaktualizuj filepath w bazie na nową lokalizację w archiwum
          if (archivedPathPending) {
            await this.prisma.fileImport.update({
              where: { id: fileImport.id },
              data: { filepath: archivedPathPending },
            });
          }
          // Emituj event o oczekującej cenie
          emitPricePending({
            filename,
            orderNumber,
            message: result.autoImportMessage || 'Cena oczekuje na zlecenie',
          });
          break;
        }

        case 'warning':
          logger.warn(`   ⚠️ ${result.autoImportError || 'Ostrzeżenie podczas importu'}`);
          // Nie archiwizuj - wymaga ręcznej interwencji
          break;

        case 'error':
          logger.error(`   ❌ Błąd importu PDF: ${result.autoImportError}`);
          // Nie archiwizuj - błąd
          break;

        default:
          logger.warn(`   ⚠️ Nieznany status importu: ${result.autoImportStatus}`);
      }
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu PDF ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
      );

      // Zapisz do FileImport jako failed (ale nie blokuj propagacji błędu)
      try {
        const existingImport = await this.prisma.fileImport.findFirst({
          where: { filepath: filePath },
        });

        if (existingImport) {
          await this.prisma.fileImport.update({
            where: { id: existingImport.id },
            data: {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } else {
          await this.prisma.fileImport.create({
            data: {
              filename,
              filepath: filePath,
              fileType: 'ceny_pdf',
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      } catch (fileImportError) {
        logger.warn(`Nie udalo sie zapisac FileImport dla ${filename}`);
      }

      // NIE archiwizuj pliku jeśli był błąd
      logger.warn(`   ⚠️ Plik NIE został zarchiwizowany - błąd importu`);

      // WAŻNE: Propaguj błąd do kolejki aby mogła retry
      throw error;
    }
  }
}
