import chokidar from 'chokidar';
import path from 'path';
import { readFile } from 'fs/promises';
import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';
import { logger } from '../../utils/logger.js';
import { archiveFile } from './utils.js';
import type { IFileWatcher, WatcherConfig } from './types.js';
import { DEFAULT_WATCHER_CONFIG } from './types.js';

/**
 * Watcher odpowiedzialny za monitorowanie folderów szyb:
 * - Zamówienia szyb (.txt) - nowe i korekty
 * - Dostawy szyb (.csv)
 */
export class GlassWatcher implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private config: WatcherConfig;

  constructor(prisma: PrismaClient, config: WatcherConfig = DEFAULT_WATCHER_CONFIG) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * Uruchamia watchery dla podanych ścieżek
   * @param glassOrdersPath - ścieżka do folderu zamówień szyb
   * @param glassDeliveriesPath - ścieżka do folderu dostaw szyb (opcjonalna)
   */
  async start(glassOrdersPath: string, glassDeliveriesPath?: string): Promise<void> {
    this.watchGlassOrdersFolder(glassOrdersPath);

    if (glassDeliveriesPath) {
      this.watchGlassDeliveriesFolder(glassDeliveriesPath);
    }
  }

  async stop(): Promise<void> {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
    logger.info('GlassWatcher zatrzymany');
  }

  getWatchers(): FSWatcher[] {
    return this.watchers;
  }

  /**
   * Obserwuj folder zamówień szyb (.txt)
   * Wykrywa "korekta" w nazwie → zastępuje poprzednie zamówienie
   */
  private watchGlassOrdersFolder(basePath: string): void {
    const absolutePath = path.resolve(basePath);
    const globPatterns = [path.join(absolutePath, '*.txt'), path.join(absolutePath, '*.TXT')];

    const watcher = chokidar.watch(globPatterns, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold,
        pollInterval: this.config.pollInterval,
      },
    });

    watcher
      .on('add', async (filePath) => {
        const filename = path.basename(filePath).toLowerCase();
        const isCorrection = /korekta|correction/i.test(filename);

        if (isCorrection) {
          await this.handleCorrectionGlassOrderTxt(filePath);
        } else {
          await this.handleNewGlassOrderTxt(filePath);
        }
      })
      .on('error', (error) => {
        logger.error(`Blad File Watcher dla zamowien szyb ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   Obserwuje zamowienia szyb: ${absolutePath}`);
  }

  /**
   * Obserwuj folder dostaw szyb (.csv)
   */
  private watchGlassDeliveriesFolder(basePath: string): void {
    const absolutePath = path.resolve(basePath);
    const globPatterns = [path.join(absolutePath, '*.csv'), path.join(absolutePath, '*.CSV')];

    const watcher = chokidar.watch(globPatterns, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold,
        pollInterval: this.config.pollInterval,
      },
    });

    watcher
      .on('add', async (filePath) => {
        await this.handleNewGlassDeliveryCsv(filePath);
      })
      .on('error', (error) => {
        logger.error(`Blad File Watcher dla dostaw szyb ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   Obserwuje dostawy szyb: ${absolutePath}`);
  }

  /**
   * Obsługa KOREKTY zamówienia szyb
   * Zastępuje poprzednie zamówienie o tym samym numerze
   * Używa GlassOrderService.importFromTxt z replaceExisting=true
   * która wewnętrznie obsługuje atomowość (delete + create w transakcji)
   */
  private async handleCorrectionGlassOrderTxt(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      logger.info(`   KOREKTA zamowienia szyb wykryta: ${filename}`);

      // Dynamiczny import - unikamy cyklicznych zależności
      const { parseGlassOrderTxt } = await import('../parsers/glass-order-txt-parser.js');
      const { GlassOrderService } = await import('../glassOrderService.js');

      const buffer = await readFile(filePath);
      const parsed = parseGlassOrderTxt(buffer);
      const glassOrderNumber = parsed.metadata.glassOrderNumber;

      logger.info(`   Sprawdzam zamowienie ${glassOrderNumber}`);

      // Sprawdź czy istnieje (dla logowania)
      const existing = await this.prisma.glassOrder.findUnique({
        where: { glassOrderNumber },
      });

      if (existing) {
        logger.info(`   Zastepuje zamowienie ${glassOrderNumber} (ID: ${existing.id})`);
      } else {
        logger.warn(`   Nie znaleziono poprzedniego zamowienia - tworze nowe`);
      }

      // GlassOrderService.importFromTxt z replaceExisting=true
      // obsługuje atomowość wewnętrznie (delete + create w tej samej transakcji)
      const glassOrderService = new GlassOrderService(this.prisma);
      const newOrder = await glassOrderService.importFromTxt(buffer, filename, true);

      logger.info(`   Utworzono nowe zamowienie (ID: ${newOrder.id})`);

      // Zarejestruj w FileImport
      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_order_correction',
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify({
            glassOrderNumber,
            wasReplaced: !!existing,
            itemsCount: parsed.items.length,
          }),
        },
      });

      // Archiwizuj plik po pomyślnym imporcie
      await archiveFile(filePath);
    } catch (error) {
      logger.error(
        `   Blad korekty ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
      );

      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_order_correction',
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Obsługa nowego zamówienia szyb (TXT)
   */
  private async handleNewGlassOrderTxt(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      logger.info(`   Nowe zamowienie szyb: ${filename}`);

      // Dynamiczny import - unikamy cyklicznych zależności
      const { GlassOrderService } = await import('../glassOrderService.js');

      const buffer = await readFile(filePath);
      const glassOrderService = new GlassOrderService(this.prisma);
      const order = await glassOrderService.importFromTxt(buffer, filename);

      logger.info(`   Zaimportowano zamowienie (ID: ${order.id})`);

      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_order',
          status: 'completed',
          processedAt: new Date(),
        },
      });

      // Archiwizuj plik po pomyślnym imporcie
      await archiveFile(filePath);
    } catch (error) {
      logger.error(
        `   Blad importu ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
      );

      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_order',
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Obsługa nowej dostawy szyb (CSV)
   */
  private async handleNewGlassDeliveryCsv(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      logger.info(`   Nowa dostawa szyb: ${filename}`);

      // Dynamiczny import - unikamy cyklicznych zależności
      const { GlassDeliveryService } = await import('../glass-delivery/index.js');

      const content = await readFile(filePath, 'utf-8');
      const glassDeliveryService = new GlassDeliveryService(this.prisma);
      const delivery = await glassDeliveryService.importFromCsv(content, filename);

      logger.info(`   Zaimportowano dostawe (ID: ${delivery.id})`);

      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_delivery',
          status: 'completed',
          processedAt: new Date(),
        },
      });

      // Archiwizuj plik po pomyślnym imporcie
      await archiveFile(filePath);
    } catch (error) {
      logger.error(
        `   Blad importu ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
      );

      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_delivery',
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}
