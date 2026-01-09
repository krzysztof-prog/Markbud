import chokidar, { type FSWatcher } from 'chokidar';
import path from 'path';
import { existsSync } from 'fs';
import { readdir, copyFile, readFile, rename, stat } from 'fs/promises';
import type { PrismaClient } from '@prisma/client';
import { CsvParser } from '../parsers/csv-parser.js';
import { logger } from '../../utils/logger.js';
import { emitOrderUpdated } from '../event-emitter.js';
import type { IFileWatcher, WatcherConfig } from './types.js';
import { ensureDirectoryExists, generateSafeFilename } from './utils.js';

/**
 * Domyślna konfiguracja watchera
 */
const DEFAULT_CONFIG: WatcherConfig = {
  stabilityThreshold: 3000, // 3s - poczekaj aż plik jest stabilny
  pollInterval: 100,
};

/**
 * Watcher dla plików "użyte bele" od klientów prywatnych
 *
 * Różnice od standardowego UzyteBeleWatcher:
 * - Obsługuje TYLKO pojedyncze pliki CSV (bez podfolderów z dostawami)
 * - Odczytuje "Data realizacji" z pliku CSV i ustawia jako deadline zlecenia
 * - Klient nie jest AKROBUD
 */
export class UzyteBelePrywatneWatcher implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private config: WatcherConfig;

  constructor(prisma: PrismaClient, config: WatcherConfig = DEFAULT_CONFIG) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * Uruchamia watcher dla podanej ścieżki
   */
  async start(basePath: string): Promise<void> {
    const absolutePath = path.resolve(basePath);

    if (!existsSync(absolutePath)) {
      console.log(`   ⚠️ Folder klientów prywatnych nie istnieje: ${absolutePath}`);
      return;
    }

    // Skanuj istniejące pliki CSV
    await this.scanExistingFiles(absolutePath);

    // Uruchom nasłuchiwanie nowych plików
    this.watchForNewFiles(absolutePath);

    console.log(`   🔍 Nasłuchuję plików prywatnych w: ${absolutePath}`);
  }

  /**
   * Zatrzymuje watchery
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
   * Skanuje istniejące pliki CSV
   */
  private async scanExistingFiles(basePath: string): Promise<void> {
    console.log(`   🔍 Skanuję pliki CSV klientów prywatnych w: ${basePath}`);

    try {
      const entries = await readdir(basePath, { withFileTypes: true });

      // Filtruj tylko pliki CSV
      const csvFiles = entries.filter((entry) => {
        if (!entry.isFile()) return false;
        const lowerName = entry.name.toLowerCase();
        return lowerName.endsWith('.csv') && (lowerName.includes('uzyte') || lowerName.includes('bele'));
      });

      if (csvFiles.length === 0) {
        console.log(`   ℹ️ Brak plików CSV klientów prywatnych`);
        return;
      }

      console.log(`   📄 Znaleziono ${csvFiles.length} plików CSV klientów prywatnych`);

      const uploadsDir = path.join(process.cwd(), 'uploads');
      await ensureDirectoryExists(uploadsDir);
      const parser = new CsvParser();

      for (const file of csvFiles) {
        const filePath = path.join(basePath, file.name);
        await this.processPrivateFile(filePath, uploadsDir, parser);
      }
    } catch (error) {
      logger.error(
        `Błąd skanowania plików prywatnych ${basePath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    }
  }

  /**
   * Nasłuchuje nowych plików CSV
   */
  private watchForNewFiles(basePath: string): void {
    const watcher = chokidar.watch(basePath, {
      persistent: true,
      ignoreInitial: true,
      depth: 0, // Tylko pliki w głównym folderze
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold,
        pollInterval: this.config.pollInterval,
      },
    });

    watcher
      .on('add', async (filePath) => {
        const lowerName = path.basename(filePath).toLowerCase();

        // Sprawdź czy to plik CSV
        if (!lowerName.endsWith('.csv') || (!lowerName.includes('uzyte') && !lowerName.includes('bele'))) {
          return;
        }

        console.log(`📄 Wykryto nowy plik prywatny: ${filePath}`);

        const uploadsDir = path.join(process.cwd(), 'uploads');
        await ensureDirectoryExists(uploadsDir);
        const parser = new CsvParser();

        await this.processPrivateFile(filePath, uploadsDir, parser);
      })
      .on('error', (error) => {
        logger.error(`❌ Błąd File Watcher dla plików prywatnych ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
  }

  /**
   * Przetwarza plik CSV klienta prywatnego
   * Odczytuje "Data realizacji" i ustawia jako deadline
   */
  private async processPrivateFile(
    csvFile: string,
    uploadsDir: string,
    parser: CsvParser
  ): Promise<'success' | 'failed' | 'skipped'> {
    try {
      const originalFilename = path.basename(csvFile);

      // Sprawdź czy plik był już importowany
      const alreadyImported = await this.prisma.fileImport.findFirst({
        where: {
          filename: { contains: originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_') },
          status: { in: ['completed', 'processing'] },
        },
      });

      if (alreadyImported) {
        logger.info(`   ⏭️ Plik ${originalFilename} już był zaimportowany, pomijam`);
        await this.moveToSkipped(csvFile);
        return 'skipped';
      }

      // Odczytaj datę realizacji z pliku CSV PRZED kopiowaniem
      const deadline = await this.extractDeadlineFromCsv(csvFile);

      const safeFilename = generateSafeFilename(originalFilename);
      const destPath = path.join(uploadsDir, safeFilename);

      await copyFile(csvFile, destPath);

      // Sprawdź czy plik ma konflikt
      const preview = await parser.previewUzyteBele(destPath);
      const hasRealConflict = preview.conflict?.baseOrderExists === true;

      if (hasRealConflict) {
        // Konflikt - zostaw jako PENDING
        await this.prisma.fileImport.create({
          data: {
            filename: safeFilename,
            filepath: destPath,
            fileType: 'uzyte_bele_prywatne',
            status: 'pending',
            metadata: JSON.stringify({
              preview,
              autoDetectedConflict: true,
              privateClient: true,
              deadline: deadline?.toISOString(),
            }),
          },
        });

        logger.warn(
          `   ⚠️ Konflikt: ${originalFilename} → zlecenie ${preview.orderNumber}`
        );
        return 'skipped';
      }

      // Brak konfliktu - przetwórz automatycznie
      const fileImport = await this.prisma.fileImport.create({
        data: {
          filename: safeFilename,
          filepath: destPath,
          fileType: 'uzyte_bele_prywatne',
          status: 'processing',
        },
      });

      // Przetwórz plik
      const result = await parser.processUzyteBele(destPath, 'add_new');

      // Jeśli mamy datę realizacji, zaktualizuj zlecenie
      if (deadline && result.orderId) {
        await this.prisma.order.update({
          where: { id: result.orderId },
          data: { deadline },
        });
        logger.info(`   📅 Ustawiono termin realizacji: ${deadline.toLocaleDateString('pl-PL')}`);
      }

      // Zaktualizuj jako completed
      await this.prisma.fileImport.update({
        where: { id: fileImport.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify({
            ...result,
            privateClient: true,
            deadline: deadline?.toISOString(),
          }),
        },
      });

      // Pobierz numer zlecenia
      const order = await this.prisma.order.findUnique({
        where: { id: result.orderId },
        select: { orderNumber: true, client: true },
      });

      logger.info(
        `   ✅ Zaimportowano zlecenie prywatne: ${originalFilename} → ${order?.orderNumber} (klient: ${order?.client || 'nieznany'})`
      );
      emitOrderUpdated({ id: result.orderId });

      // Archiwizuj plik
      await this.archiveFile(csvFile);

      return 'success';
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu pliku prywatnego ${csvFile}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
      return 'failed';
    }
  }

  /**
   * Odczytuje "Data realizacji" z pliku CSV
   * Format w pliku: "Data realizacji:DD.MM.YYYY"
   */
  private async extractDeadlineFromCsv(filePath: string): Promise<Date | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Szukaj linii z "Data realizacji"
        const match = line.match(/Data\s*realizacji[:\s]*(\d{2})[.\-/](\d{2})[.\-/](\d{4})/i);
        if (match) {
          const [, day, month, year] = match;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

          // Sprawdź czy data jest prawidłowa
          if (!isNaN(date.getTime())) {
            logger.info(`   📅 Znaleziono datę realizacji: ${date.toLocaleDateString('pl-PL')}`);
            return date;
          }
        }
      }

      logger.info(`   ℹ️ Brak daty realizacji w pliku`);
      return null;
    } catch (error) {
      logger.warn(
        `   ⚠️ Nie udało się odczytać daty realizacji: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
      return null;
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
   * Archiwizuje plik do podfolderu "archiwum"
   */
  private async archiveFile(filePath: string): Promise<void> {
    try {
      const basePath = path.dirname(filePath);
      const archiveDir = path.join(basePath, 'archiwum');
      await ensureDirectoryExists(archiveDir);

      const filename = path.basename(filePath);
      const archivePath = path.join(archiveDir, filename);

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
}
