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

/**
 * Watcher odpowiedzialny za monitorowanie folderu cen:
 * - Pliki PDF z cenami zleceń
 * - Automatyczny import i aktualizacja Order.valuePln/valueEur
 *
 * Używa kolejki do sekwencyjnego przetwarzania - SQLite nie radzi sobie z równoległymi transakcjami
 */
export class CenyWatcher implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private config: WatcherConfig;
  private cenyProcessor: CenyProcessor;

  // Kolejka do sekwencyjnego przetwarzania (SQLite limitation)
  private queue: string[] = [];
  private isProcessing = false;

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
   * Dodaje plik do kolejki i uruchamia przetwarzanie
   */
  private enqueue(filePath: string): void {
    this.queue.push(filePath);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Przetwarza kolejkę sekwencyjnie - jeden plik na raz
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const filePath = this.queue.shift();
      if (!filePath) break;

      try {
        await this.processCenyPdf(filePath);
      } catch (error) {
        logger.error(`Blad przetwarzania kolejki cen: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Mały delay między plikami żeby SQLite miał czas na commit
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isProcessing = false;

    if (this.queue.length > 0) {
      this.processQueue();
    }
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
      interval: 1000, // Sprawdzaj co 1s
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
        // Dodaj do kolejki zamiast przetwarzać bezpośrednio (SQLite limitation)
        this.enqueue(filePath);
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

      // Znajdź istniejący import lub utwórz nowy ze statusem failed
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

      // NIE archiwizuj pliku jeśli był błąd
      logger.warn(`   ⚠️ Plik NIE został zarchiwizowany - błąd importu`);
    }
  }
}
