import chokidar, { type FSWatcher } from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { readdir, copyFile } from 'fs/promises';
import type { PrismaClient } from '@prisma/client';
import { CsvParser, type ParsedUzyteBele } from '../parsers/csv-parser.js';
import { logger } from '../../utils/logger.js';
import { emitDeliveryCreated, emitOrderUpdated } from '../event-emitter.js';
import type { IFileWatcher, DeliveryNumber, WatcherConfig } from './types.js';
import {
  getSetting,
  extractDateFromFolderName,
  extractDeliveryNumber,
  formatDeliveryNumber,
  archiveFolder,
  ensureDirectoryExists,
  generateSafeFilename,
  shouldSkipImport,
} from './utils.js';
import { MojaPracaRepository } from '../../repositories/MojaPracaRepository.js';
import { importQueue, type ImportJobResult } from '../import/ImportQueueService.js';

// ESM compatibility: __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Domyślna konfiguracja watchera dla "użyte bele"
 */
const DEFAULT_CONFIG: WatcherConfig = {
  stabilityThreshold: 3000, // 3s - poczekaj aż folder jest stabilny
  pollInterval: 100,
};

/**
 * Watcher dla folderów "użyte bele"
 * Automatycznie importuje pliki CSV z podfolderów
 */
export class UzyteBeleWatcher implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private config: WatcherConfig;
  private mojaPracaRepository: MojaPracaRepository;

  constructor(prisma: PrismaClient, config: WatcherConfig = DEFAULT_CONFIG) {
    this.prisma = prisma;
    this.config = config;
    this.mojaPracaRepository = new MojaPracaRepository(prisma);
  }

  /**
   * Oblicza sugestię systemu na podstawie porównania okien i szyb
   * Jeśli liczby się zgadzają → sugeruj zastąpienie bazowego
   */
  private calculateSuggestion(
    existingWindows: number | null,
    existingGlasses: number | null,
    newWindows: number | null,
    newGlasses: number | null
  ): 'replace_base' | 'keep_both' | 'manual' {
    // Jeśli okna I szyby się zgadzają → sugeruj zastąpienie
    if (existingWindows === newWindows && existingGlasses === newGlasses) {
      return 'replace_base';
    }
    // W przeciwnym razie - decyzja manualna
    return 'manual';
  }

  /**
   * Uruchamia watcher dla podanej ścieżki bazowej
   */
  async start(basePath: string): Promise<void> {
    const absolutePath = path.resolve(basePath);

    if (!existsSync(absolutePath)) {
      console.log(`   ⚠️ Folder nie istnieje: ${absolutePath}`);
      return;
    }

    // Najpierw zeskanuj istniejące foldery (dostawy)
    await this.scanExistingFolders(absolutePath);

    // Skanuj pojedyncze pliki CSV (zlecenia bez dostawy)
    await this.scanExistingSingleFiles(absolutePath);

    // Uruchom nasłuchiwanie nowych podfolderów
    this.watchForNewFolders(absolutePath);

    // Uruchom nasłuchiwanie nowych pojedynczych plików CSV
    this.watchForNewSingleFiles(absolutePath);

    console.log(`   🔍 Nasłuchuję nowych podfolderów i plików w: ${absolutePath}`);
  }

  /**
   * Zatrzymuje wszystkie watchery
   */
  async stop(): Promise<void> {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
  }

  /**
   * Zwraca listę aktywnych watcherów
   */
  getWatchers(): FSWatcher[] {
    return this.watchers;
  }

  /**
   * Skanuje istniejące pojedyncze pliki CSV (bez podfolderów z datą)
   * Importuje jako zlecenia BEZ przypisania do dostawy
   */
  private async scanExistingSingleFiles(basePath: string): Promise<void> {
    console.log(`   🔍 Skanuję pojedyncze pliki CSV w: ${basePath}`);

    try {
      const entries = await readdir(basePath, { withFileTypes: true });

      // Filtruj tylko pliki CSV (nie foldery)
      const csvFiles = entries.filter((entry) => {
        if (!entry.isFile()) return false;
        const lowerName = entry.name.toLowerCase();
        return lowerName.endsWith('.csv') && (lowerName.includes('uzyte') || lowerName.includes('bele'));
      });

      if (csvFiles.length === 0) {
        console.log(`   ℹ️ Brak pojedynczych plików CSV do zaimportowania`);
        return;
      }

      console.log(`   📄 Znaleziono ${csvFiles.length} pojedynczych plików CSV`);

      const uploadsDir = path.join(process.cwd(), 'uploads');
      await ensureDirectoryExists(uploadsDir);
      const parser = new CsvParser();

      // Dodaj pliki do kolejki zamiast bezpośredniego przetwarzania
      const jobs = csvFiles.map((file) => ({
        type: 'uzyte_bele' as const,
        filePath: path.join(basePath, file.name),
        priority: 10, // Normalna priorytet dla pojedynczych plików
        execute: async (): Promise<ImportJobResult> => {
          const result = await this.processSingleFile(
            path.join(basePath, file.name),
            uploadsDir,
            parser
          );
          return {
            success: result === 'success',
            shouldRetry: result === 'failed',
          };
        },
      }));

      if (jobs.length > 0) {
        importQueue.enqueueBatch(jobs);
        console.log(`   📥 Dodano ${jobs.length} plików do kolejki importów`);
      }
    } catch (error) {
      logger.error(
        `Błąd skanowania pojedynczych plików ${basePath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    }
  }

  /**
   * Nasłuchuje nowych pojedynczych plików CSV i importuje je bez przypisania do dostawy
   */
  private watchForNewSingleFiles(basePath: string): void {
    const watcher = chokidar.watch(basePath, {
      persistent: true,
      ignoreInitial: true,
      depth: 0, // Tylko pliki w głównym folderze (nie podfoldery)
      usePolling: true, // Polling działa lepiej na udziałach sieciowych (UNC paths)
      interval: 5000,
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold,
        pollInterval: this.config.pollInterval,
      },
    });

    watcher
      .on('add', async (filePath) => {
        const lowerName = path.basename(filePath).toLowerCase();

        // Sprawdź czy to plik CSV z "uzyte" lub "bele" w nazwie
        if (!lowerName.endsWith('.csv') || (!lowerName.includes('uzyte') && !lowerName.includes('bele'))) {
          return;
        }

        console.log(`📄 Wykryto nowy plik CSV: ${filePath}`);

        // Sprawdź czy plik nie jest już w kolejce
        if (importQueue.isFileInQueue(filePath)) {
          console.log(`   ℹ️ Plik już w kolejce: ${filePath}`);
          return;
        }

        // Dodaj do kolejki zamiast bezpośredniego przetwarzania
        importQueue.enqueue({
          type: 'uzyte_bele',
          filePath,
          priority: 5, // Wyższy priorytet dla nowych plików (wykrytych przez watcher)
          execute: async (): Promise<ImportJobResult> => {
            const uploadsDir = path.join(process.cwd(), 'uploads');
            await ensureDirectoryExists(uploadsDir);
            const parser = new CsvParser();
            const result = await this.processSingleFile(filePath, uploadsDir, parser);
            return {
              success: result === 'success',
              shouldRetry: result === 'failed',
            };
          },
        });
      })
      .on('error', (error) => {
        logger.error(`❌ Błąd File Watcher dla plików CSV ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
  }

  /**
   * Przetwarza pojedynczy plik CSV BEZ przypisania do dostawy
   */
  private async processSingleFile(
    csvFile: string,
    uploadsDir: string,
    parser: CsvParser
  ): Promise<'success' | 'failed' | 'skipped'> {
    try {
      const originalFilename = path.basename(csvFile);

      // Sprawdź czy plik powinien być pominięty
      // (był importowany I nadal istnieje w archiwum)
      const shouldSkip = await shouldSkipImport(this.prisma, originalFilename, csvFile);

      if (shouldSkip) {
        await this.moveToSkipped(csvFile);
        return 'skipped';
      }

      const safeFilename = generateSafeFilename(originalFilename);
      const destPath = path.join(uploadsDir, safeFilename);

      await copyFile(csvFile, destPath);

      // Sprawdź czy plik ma konflikt
      const preview = await parser.previewUzyteBele(destPath);
      const hasRealConflict = preview.conflict?.baseOrderExists === true;

      if (hasRealConflict) {
        // Konflikt - utwórz PendingImportConflict zamiast FileImport
        await this.createPendingConflict(preview, destPath, safeFilename);

        logger.warn(
          `   ⚠️ Konflikt: ${originalFilename} → zlecenie ${preview.orderNumber} (bazowe ${preview.conflict?.baseOrderNumber} ISTNIEJE)`
        );
        logger.info(`   ⏸️ Konflikt utworzony - oczekuje na decyzję użytkownika w "Moja Praca"`);

        // Archiwizuj plik źródłowy żeby nie był importowany ponownie
        await this.archiveSingleFile(csvFile);
        return 'skipped';
      }

      // Brak konfliktu - przetwórz automatycznie
      const fileImport = await this.prisma.fileImport.create({
        data: {
          filename: safeFilename,
          filepath: destPath,
          fileType: 'uzyte_bele',
          status: 'processing',
        },
      });

      // Przetwórz plik
      const result = await parser.processUzyteBele(destPath, 'add_new');

      // Zaktualizuj jako completed
      await this.prisma.fileImport.update({
        where: { id: fileImport.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify({ ...result, singleFileImport: true }),
        },
      });

      // Pobierz numer zlecenia
      const order = await this.prisma.order.findUnique({
        where: { id: result.orderId },
        select: { orderNumber: true },
      });

      logger.info(`   ✅ Zaimportowano pojedynczy plik: ${originalFilename} → zlecenie ${order?.orderNumber}`);
      emitOrderUpdated({ id: result.orderId });

      // Archiwizuj plik do podfolderu "archiwum"
      await this.archiveSingleFile(csvFile);

      return 'success';
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu pojedynczego pliku ${csvFile}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
      return 'failed';
    }
  }

  /**
   * Przenosi pominięty plik do podfolderu "pominiete"
   */
  private async moveToSkipped(filePath: string): Promise<void> {
    try {
      const basePath = path.dirname(filePath);
      const skippedDir = path.join(basePath, 'pominiete');
      await ensureDirectoryExists(skippedDir);

      const filename = path.basename(filePath);
      const skippedPath = path.join(skippedDir, filename);

      const { rename, stat } = await import('fs/promises');
      try {
        await stat(skippedPath);
        // Plik istnieje - dodaj timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = path.extname(filename);
        const nameWithoutExt = path.basename(filename, ext);
        const newSkippedPath = path.join(skippedDir, `${nameWithoutExt}_${timestamp}${ext}`);
        await rename(filePath, newSkippedPath);
        logger.info(`   📁 Przeniesiono do pominiętych: ${filename} → pominiete/${path.basename(newSkippedPath)}`);
      } catch {
        // Plik nie istnieje - przenieś normalnie
        await rename(filePath, skippedPath);
        logger.info(`   📁 Przeniesiono do pominiętych: ${filename} → pominiete/`);
      }
    } catch (error) {
      logger.error(
        `   ⚠️ Nie udało się przenieść pliku ${filePath} do pominiętych: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    }
  }

  /**
   * Archiwizuje pojedynczy plik do podfolderu "archiwum"
   */
  private async archiveSingleFile(filePath: string): Promise<void> {
    try {
      const basePath = path.dirname(filePath);
      const archiveDir = path.join(basePath, 'archiwum');
      await ensureDirectoryExists(archiveDir);

      const filename = path.basename(filePath);
      const archivePath = path.join(archiveDir, filename);

      // Jeśli plik o tej nazwie już istnieje w archiwum, dodaj timestamp
      const { rename, stat } = await import('fs/promises');
      try {
        await stat(archivePath);
        // Plik istnieje - dodaj timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = path.extname(filename);
        const nameWithoutExt = path.basename(filename, ext);
        const newArchivePath = path.join(archiveDir, `${nameWithoutExt}_${timestamp}${ext}`);
        await rename(filePath, newArchivePath);
        logger.info(`   📦 Zarchiwizowano: ${filename} → archiwum/${path.basename(newArchivePath)}`);
      } catch {
        // Plik nie istnieje - przenieś normalnie
        await rename(filePath, archivePath);
        logger.info(`   📦 Zarchiwizowano: ${filename} → archiwum/`);
      }
    } catch (error) {
      logger.error(
        `   ⚠️ Nie udało się zarchiwizować pliku ${filePath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    }
  }

  /**
   * Skanuje istniejące podfoldery w "użyte bele" i importuje pliki CSV
   */
  async scanExistingFolders(basePath: string): Promise<void> {
    console.log(`   🔍 Skanuję istniejące foldery w: ${basePath}`);

    try {
      const entries = await readdir(basePath, { withFileTypes: true });

      // Filtruj tylko foldery z datą w formacie DD.MM.YYYY lub DD.MM.YY
      const dateFolders = entries.filter((entry) => {
        if (!entry.isDirectory()) return false;
        return /\d{2}\.\d{2}\.(\d{4}|\d{2})/.test(entry.name);
      });

      if (dateFolders.length === 0) {
        console.log(`   ℹ️ Brak folderów z datą do zaimportowania`);
        return;
      }

      console.log(`   📂 Znaleziono ${dateFolders.length} folderów z datą`);

      for (const folder of dateFolders) {
        const folderPath = path.join(basePath, folder.name);
        await this.handleNewFolder(folderPath);
      }
    } catch (error) {
      logger.error(
        `Błąd skanowania ${basePath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    }
  }

  /**
   * Nasłuchuje nowych PODFOLDERÓW i automatycznie importuje pliki CSV
   */
  private watchForNewFolders(basePath: string): void {
    const watcher = chokidar.watch(basePath, {
      persistent: true,
      ignoreInitial: true, // Ignoruj istniejące na start
      depth: 1, // Tylko pierwszy poziom podfolderów
      usePolling: true, // Polling działa lepiej na udziałach sieciowych (UNC paths)
      interval: 5000,
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold,
        pollInterval: this.config.pollInterval,
      },
    });

    watcher
      .on('addDir', async (folderPath) => {
        // Ignoruj sam folder bazowy
        if (folderPath === basePath) {
          return;
        }

        console.log(`📁 Wykryto nowy podfolder: ${folderPath}`);
        await this.handleNewFolder(folderPath);
      })
      .on('error', (error) => {
        logger.error(`❌ Błąd File Watcher dla podfolderów ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
  }

  /**
   * Obsługuje nowy podfolder - automatyczny import wszystkich CSV
   */
  private async handleNewFolder(folderPath: string): Promise<void> {
    const folderName = path.basename(folderPath);

    // Wyciągnij datę z nazwy folderu
    const deliveryDate = extractDateFromFolderName(folderName);

    if (!deliveryDate) {
      logger.warn(`   ⚠️ Folder "${folderName}" nie zawiera daty w formacie DD.MM.YYYY - pomijam`);
      return;
    }

    logger.info(
      `   📅 Wykryto folder z datą: ${deliveryDate.toLocaleDateString('pl-PL')}`
    );

    // Wyciągnij numer dostawy z nazwy folderu (opcjonalnie)
    const deliveryNumber = extractDeliveryNumber(folderName);
    logger.info(`   📦 Numer dostawy: ${deliveryNumber}`);

    try {
      await this.importFolder(folderPath, deliveryDate, deliveryNumber, folderName);
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu folderu "${folderName}": ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    }
  }

  /**
   * Automatyczny import folderu (podobnie jak POST /api/imports/folder)
   * Pliki są dodawane do kolejki importów zamiast bezpośredniego przetwarzania
   */
  private async importFolder(
    folderPath: string,
    deliveryDate: Date,
    deliveryNumber: DeliveryNumber,
    folderName: string
  ): Promise<void> {
    // Znajdź wszystkie pliki CSV rekursywnie
    const csvFiles = await this.findCsvFiles(folderPath);

    if (csvFiles.length === 0) {
      logger.warn(`   ⚠️ Brak plików CSV w folderze "${folderName}"`);
      return;
    }

    logger.info(`   📄 Znaleziono ${csvFiles.length} plików CSV`);

    // Generuj pełny numer dostawy w formacie DD.MM.YYYY_X
    const fullDeliveryNumber = formatDeliveryNumber(deliveryDate, deliveryNumber);

    // Znajdź lub utwórz dostawę
    const delivery = await this.findOrCreateDelivery(
      deliveryDate,
      deliveryNumber,
      fullDeliveryNumber
    );

    // Utwórz folder uploads jeśli nie istnieje
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await ensureDirectoryExists(uploadsDir);

    const parser = new CsvParser();

    // Tracking wyników dla archiwizacji folderu
    const folderResults = {
      total: csvFiles.length,
      success: 0,
      failed: 0,
      skipped: 0,
    };

    // Dodaj pliki do kolejki zamiast bezpośredniego przetwarzania
    const jobs = csvFiles.map((csvFile) => ({
      type: 'uzyte_bele' as const,
      filePath: csvFile,
      priority: 10,
      metadata: { deliveryId: delivery.id, folderPath, folderName },
      execute: async (): Promise<ImportJobResult> => {
        const result = await this.processFile(csvFile, folderPath, uploadsDir, parser, delivery.id);

        // Aktualizuj tracking wyników
        if (result === 'success') {
          folderResults.success++;
        } else if (result === 'failed') {
          folderResults.failed++;
        } else {
          folderResults.skipped++;
        }

        // Sprawdź czy to ostatni plik z folderu
        const processed = folderResults.success + folderResults.failed + folderResults.skipped;
        if (processed === folderResults.total) {
          // Wszystkie pliki przetworzone - archiwizuj folder jeśli możliwe
          await this.handleFolderCompletion(folderPath, folderName, folderResults);
        }

        return {
          success: result === 'success',
          shouldRetry: result === 'failed',
        };
      },
    }));

    if (jobs.length > 0) {
      importQueue.enqueueBatch(jobs);
      logger.info(`   📥 Dodano ${jobs.length} plików z folderu "${folderName}" do kolejki importów`);
    }
  }

  /**
   * Obsługuje zakończenie przetwarzania folderu - archiwizacja jeśli możliwa
   */
  private async handleFolderCompletion(
    folderPath: string,
    folderName: string,
    results: { total: number; success: number; failed: number; skipped: number }
  ): Promise<void> {
    logger.info(
      `   🎉 Import folderu "${folderName}" zakończony: ${results.success}/${results.total} sukces, ` +
        `${results.failed} błędów, ${results.skipped} pominiętych`
    );

    // Archiwizuj folder jeśli były sukcesy i nie było błędów
    if (results.success > 0 && results.failed === 0) {
      const uzyteBelePath = await this.getBasePath();
      await archiveFolder(folderPath, uzyteBelePath);
    } else if (results.failed > 0) {
      logger.warn(`   ⚠️ Folder "${folderName}" NIE został zarchiwizowany - wykryto ${results.failed} błędów`);
    }
  }

  /**
   * Znajduje lub tworzy dostawę dla podanej daty i numeru
   */
  private async findOrCreateDelivery(
    deliveryDate: Date,
    deliveryNumber: DeliveryNumber,
    fullDeliveryNumber: string
  ): Promise<{ id: number; deliveryNumber: string | null }> {
    // Znajdź wszystkie dostawy w tym dniu
    const deliveriesOnDay = await this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: new Date(
            deliveryDate.getFullYear(),
            deliveryDate.getMonth(),
            deliveryDate.getDate()
          ),
          lt: new Date(
            deliveryDate.getFullYear(),
            deliveryDate.getMonth(),
            deliveryDate.getDate() + 1
          ),
        },
      },
    });

    // Szukaj dostawy która kończy się tym samym sufiksem (I, II, III, etc.)
    let delivery = deliveriesOnDay.find((d) =>
      d.deliveryNumber?.endsWith(`_${deliveryNumber}`)
    );

    if (!delivery) {
      delivery = await this.prisma.delivery.create({
        data: {
          deliveryDate,
          deliveryNumber: fullDeliveryNumber,
          status: 'planned',
        },
      });
      logger.info(
        `   ✨ Utworzono nową dostawę ${fullDeliveryNumber} na ${deliveryDate.toLocaleDateString('pl-PL')}`
      );
      emitDeliveryCreated(delivery);
    } else {
      logger.info(
        `   📦 Używam istniejącej dostawy ${delivery.deliveryNumber} (ID: ${delivery.id})`
      );
    }

    return delivery;
  }

  /**
   * Przetwarza pojedynczy plik CSV
   * @returns 'success' | 'failed' | 'skipped'
   */
  private async processFile(
    csvFile: string,
    folderPath: string,
    uploadsDir: string,
    parser: CsvParser,
    deliveryId: number
  ): Promise<'success' | 'failed' | 'skipped'> {
    try {
      const originalFilename = path.basename(csvFile);

      // Sprawdź czy plik powinien być pominięty
      // (był importowany I nadal istnieje w archiwum)
      const shouldSkip = await shouldSkipImport(this.prisma, originalFilename, csvFile);

      if (shouldSkip) {
        return 'skipped';
      }

      const safeFilename = generateSafeFilename(originalFilename);
      const destPath = path.join(uploadsDir, safeFilename);

      await copyFile(csvFile, destPath);

      const relativePath = path.relative(folderPath, csvFile);

      // Sprawdź czy plik ma konflikt (zlecenie z sufiksem gdzie bazowe ISTNIEJE)
      const preview = await parser.previewUzyteBele(destPath);

      // Konflikt występuje TYLKO gdy:
      // - zlecenie ma sufiks (-a, -b, itp.) ORAZ
      // - zlecenie bazowe ISTNIEJE w bazie
      const hasRealConflict = preview.conflict?.baseOrderExists === true;

      if (hasRealConflict) {
        // Konflikt - utwórz PendingImportConflict zamiast FileImport
        await this.createPendingConflict(preview, destPath, safeFilename);

        logger.warn(
          `   ⚠️ Konflikt: ${relativePath} → zlecenie ${preview.orderNumber} (bazowe ${preview.conflict?.baseOrderNumber} ISTNIEJE)`
        );
        logger.info(`   ⏸️ Konflikt utworzony - oczekuje na decyzję użytkownika w "Moja Praca"`);
        return 'skipped';
      }

      // Brak konfliktu - przetwórz automatycznie
      const fileImport = await this.prisma.fileImport.create({
        data: {
          filename: safeFilename,
          filepath: destPath,
          fileType: 'uzyte_bele',
          status: 'processing',
        },
      });

      // Przetwórz plik
      const result = await parser.processUzyteBele(destPath, 'add_new');

      // Zaktualizuj jako completed
      await this.prisma.fileImport.update({
        where: { id: fileImport.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify(result),
        },
      });

      // Pobierz numer zlecenia
      const order = await this.prisma.order.findUnique({
        where: { id: result.orderId },
        select: { orderNumber: true },
      });

      // Dodaj zlecenie do dostawy
      await this.addOrderToDelivery(deliveryId, result.orderId);

      logger.info(`   ✅ Zaimportowano: ${relativePath} → zlecenie ${order?.orderNumber}`);
      return 'success';
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu ${csvFile}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
      return 'failed';
    }
  }

  /**
   * Dodaje zlecenie do dostawy jeśli jeszcze nie jest przypisane
   */
  private async addOrderToDelivery(deliveryId: number, orderId: number): Promise<void> {
    const existingDeliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: {
        deliveryId_orderId: {
          deliveryId,
          orderId,
        },
      },
    });

    if (!existingDeliveryOrder) {
      const maxPosition = await this.prisma.deliveryOrder.aggregate({
        where: { deliveryId },
        _max: { position: true },
      });

      await this.prisma.deliveryOrder.create({
        data: {
          deliveryId,
          orderId,
          position: (maxPosition._max.position || 0) + 1,
        },
      });

      emitOrderUpdated({ id: orderId });
    }
  }

  /**
   * Rekursywnie znajduje wszystkie pliki CSV w folderze
   */
  private async findCsvFiles(folderPath: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);

        if (entry.isDirectory()) {
          // Rekursywnie przeszukaj podfolder
          const subResults = await this.findCsvFiles(fullPath);
          results.push(...subResults);
        } else if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase();
          if (lowerName.endsWith('.csv') && (lowerName.includes('uzyte') || lowerName.includes('bele'))) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.error(
        `Błąd skanowania ${folderPath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    }

    return results;
  }

  /**
   * Pobiera bazową ścieżkę folderu "użyte bele"
   */
  private async getBasePath(): Promise<string> {
    const projectRoot = path.resolve(__dirname, '../../../../../');
    return (
      process.env.WATCH_FOLDER_UZYTE_BELE ||
      (await getSetting(this.prisma, 'watchFolderUzyteBele')) ||
      path.join(projectRoot, 'uzyte bele')
    );
  }

  /**
   * Tworzy PendingImportConflict dla konfliktu importu
   * Konflikt jest przypisywany do użytkownika na podstawie DocumentAuthorMapping
   */
  private async createPendingConflict(
    preview: ParsedUzyteBele,
    filepath: string,
    filename: string
  ): Promise<void> {
    if (!preview.conflict?.baseOrderId || !preview.conflict?.baseOrderNumber) {
      logger.error('Nie można utworzyć konfliktu - brak danych bazowego zlecenia');
      return;
    }

    // Pobierz dane bazowego zlecenia do porównania
    const baseOrder = await this.prisma.order.findUnique({
      where: { id: preview.conflict.baseOrderId },
      select: { totalWindows: true, totalGlasses: true },
    });

    if (!baseOrder) {
      logger.error(`Nie znaleziono bazowego zlecenia ID: ${preview.conflict.baseOrderId}`);
      return;
    }

    // Znajdź użytkownika przypisanego do autora dokumentu
    let authorUserId: number | null = null;
    if (preview.documentAuthor) {
      const authorMapping = await this.prisma.documentAuthorMapping.findFirst({
        where: { authorName: preview.documentAuthor },
      });
      authorUserId = authorMapping?.userId ?? null;
    }

    // Oblicz sugestię
    const suggestion = this.calculateSuggestion(
      baseOrder.totalWindows,
      baseOrder.totalGlasses,
      preview.totals?.windows ?? null,
      preview.totals?.glasses ?? null
    );

    // Utwórz PendingImportConflict
    await this.mojaPracaRepository.createConflict({
      orderNumber: preview.orderNumber,
      baseOrderNumber: preview.conflict.baseOrderNumber,
      suffix: preview.orderNumberParsed?.suffix || '',
      baseOrderId: preview.conflict.baseOrderId,
      documentAuthor: preview.documentAuthor ?? null,
      authorUserId,
      filepath,
      filename,
      parsedData: JSON.stringify(preview),
      existingWindowsCount: baseOrder.totalWindows,
      existingGlassCount: baseOrder.totalGlasses,
      newWindowsCount: preview.totals?.windows ?? null,
      newGlassCount: preview.totals?.glasses ?? null,
      systemSuggestion: suggestion,
    });

    logger.info(
      `   📝 Utworzono konflikt: ${preview.orderNumber} (bazowe: ${preview.conflict.baseOrderNumber})` +
        (authorUserId ? ` - przypisano do użytkownika ID: ${authorUserId}` : ' - brak mapowania użytkownika')
    );
  }
}
