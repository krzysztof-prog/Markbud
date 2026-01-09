import chokidar from 'chokidar';
import path from 'path';
import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';
import { logger } from '../../utils/logger.js';
import { archiveFile } from './utils.js';
import type { IFileWatcher, WatcherConfig } from './types.js';
import { DEFAULT_WATCHER_CONFIG } from './types.js';
import { PdfParser } from '../parsers/pdf-parser.js';

/**
 * Watcher odpowiedzialny za monitorowanie folderu cen:
 * - Pliki PDF z cenami zleceń
 * - Automatyczny import i aktualizacja Order.valuePln/valueEur
 */
export class CenyWatcher implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private config: WatcherConfig;
  private pdfParser: PdfParser;

  constructor(prisma: PrismaClient, config: WatcherConfig = DEFAULT_WATCHER_CONFIG) {
    this.prisma = prisma;
    this.config = config;
    this.pdfParser = new PdfParser();
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
      .on('add', async (filePath) => {
        // Filtruj tylko pliki PDF
        const filename = path.basename(filePath).toLowerCase();
        if (!filename.endsWith('.pdf')) {
          return;
        }
        await this.handleNewCenyPdf(filePath);
      })
      .on('error', (error) => {
        logger.error(`Błąd File Watcher dla cen ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   👀 Obserwuję folder cen (PDF): ${absolutePath}`);
  }

  /**
   * Obsługa nowego pliku PDF z ceną
   */
  private async handleNewCenyPdf(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      // Sprawdź czy plik już był importowany
      const existing = await this.prisma.fileImport.findFirst({
        where: {
          filepath: filePath,
          status: { in: ['pending', 'completed', 'processing'] },
        },
      });

      if (existing) {
        logger.info(`   ⏭️ Plik PDF już zarejestrowany: ${filename}`);
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

      // Parsuj PDF i zaktualizuj zlecenie
      const result = await this.pdfParser.processCenyPdf(filePath);

      // Zaktualizuj status importu
      await this.prisma.fileImport.update({
        where: { id: fileImport.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify({
            orderId: result.orderId,
            updated: result.updated,
          }),
        },
      });

      logger.info(`   ✅ Zaimportowano cenę z PDF (Order ID: ${result.orderId})`);

      // Archiwizuj plik po pomyślnym imporcie
      await archiveFile(filePath);
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu PDF ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
      );

      // Znajdź istniejący import lub utwórz nowy
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
