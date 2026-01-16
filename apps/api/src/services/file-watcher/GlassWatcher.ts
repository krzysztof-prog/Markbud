import chokidar from 'chokidar';
import path from 'path';
import { readFile } from 'fs/promises';
import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';
import { logger } from '../../utils/logger.js';
import { archiveFile, moveToSkipped } from './utils.js';
import type { IFileWatcher, WatcherConfig } from './types.js';
import { DEFAULT_WATCHER_CONFIG } from './types.js';

// Typ dla zadań w kolejce
type QueueTask = {
  type: 'glass_order' | 'glass_order_correction' | 'glass_delivery';
  filePath: string;
};

/**
 * Watcher odpowiedzialny za monitorowanie folderów szyb:
 * - Zamówienia szyb (.txt) - nowe i korekty
 * - Dostawy szyb (.csv)
 *
 * Używa kolejki do sekwencyjnego przetwarzania - SQLite nie radzi sobie z równoległymi transakcjami
 */
export class GlassWatcher implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private config: WatcherConfig;

  // Kolejka do sekwencyjnego przetwarzania (SQLite limitation)
  private queue: QueueTask[] = [];
  private isProcessing = false;

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
   * Dodaje zadanie do kolejki i uruchamia przetwarzanie
   * Zapewnia sekwencyjne przetwarzanie - SQLite nie radzi sobie z równoległymi transakcjami
   */
  private enqueue(task: QueueTask): void {
    this.queue.push(task);
    // Rozpocznij przetwarzanie jeśli nie jest w toku
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
      const task = this.queue.shift()!;

      try {
        switch (task.type) {
          case 'glass_order':
            await this.processGlassOrder(task.filePath);
            break;
          case 'glass_order_correction':
            await this.processCorrectionGlassOrder(task.filePath);
            break;
          case 'glass_delivery':
            await this.processGlassDelivery(task.filePath);
            break;
        }
      } catch (error) {
        // Błąd już zalogowany w metodach process*
        logger.error(`Blad przetwarzania kolejki: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Mały delay między plikami żeby SQLite miał czas na commit
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isProcessing = false;

    // Sprawdź czy w międzyczasie nie pojawiły się nowe zadania
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Obserwuj folder zamówień szyb (.txt)
   * Wykrywa "korekta" w nazwie → zastępuje poprzednie zamówienie
   * UWAGA: Na udziałach sieciowych Windows (UNC paths) glob patterns nie działają
   * Dlatego obserwujemy cały folder i filtrujemy pliki po rozszerzeniu
   */
  private watchGlassOrdersFolder(basePath: string): void {
    const absolutePath = path.resolve(basePath);

    // Obserwuj folder bezpośrednio (nie glob patterns - nie działają na UNC paths)
    const watcher = chokidar.watch(absolutePath, {
      persistent: true,
      ignoreInitial: false,
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
        // Filtruj tylko pliki TXT
        const filename = path.basename(filePath).toLowerCase();
        if (!filename.endsWith('.txt')) {
          return;
        }

        const isCorrection = /korekta|correction/i.test(filename);

        // Dodaj do kolejki zamiast przetwarzać bezpośrednio (SQLite limitation)
        if (isCorrection) {
          this.enqueue({ type: 'glass_order_correction', filePath });
        } else {
          this.enqueue({ type: 'glass_order', filePath });
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
   * UWAGA: Na udziałach sieciowych Windows (UNC paths) glob patterns nie działają
   * Dlatego obserwujemy cały folder i filtrujemy pliki po rozszerzeniu
   */
  private watchGlassDeliveriesFolder(basePath: string): void {
    const absolutePath = path.resolve(basePath);

    // Obserwuj folder bezpośrednio (nie glob patterns - nie działają na UNC paths)
    const watcher = chokidar.watch(absolutePath, {
      persistent: true,
      ignoreInitial: false,
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
        // Filtruj tylko pliki CSV
        const filename = path.basename(filePath).toLowerCase();
        if (!filename.endsWith('.csv')) {
          return;
        }
        // Dodaj do kolejki zamiast przetwarzać bezpośrednio (SQLite limitation)
        this.enqueue({ type: 'glass_delivery', filePath });
      })
      .on('error', (error) => {
        logger.error(`Blad File Watcher dla dostaw szyb ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   Obserwuje dostawy szyb: ${absolutePath}`);
  }

  /**
   * Przetwarza KOREKTĘ zamówienia szyb
   * Zastępuje poprzednie zamówienie o tym samym numerze
   * Używa GlassOrderService.importFromTxt z replaceExisting=true
   * która wewnętrznie obsługuje atomowość (delete + create w transakcji)
   *
   * UWAGA: Korekty NIE są sprawdzane na duplikaty - zawsze przetwarzane
   */
  private async processCorrectionGlassOrder(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      // Korekty NIE sprawdzamy na duplikaty - zawsze przetwarzamy (zastępują poprzednie)
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
   * Przetwarza nowe zamówienie szyb (TXT)
   */
  private async processGlassOrder(filePath: string): Promise<void> {
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
        logger.info(`   ⏭️ Zamowienie szyb juz zarejestrowane: ${filename}`);
        // Przenies do folderu pominiete aby nie pokazywal sie ponownie
        await moveToSkipped(filePath);
        return;
      }

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
   * Przetwarza nową dostawę szyb (CSV)
   */
  private async processGlassDelivery(filePath: string): Promise<void> {
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
        logger.info(`   ⏭️ Dostawa szyb juz zarejestrowana: ${filename}`);
        // Przenies do folderu pominiete aby nie pokazywal sie ponownie
        await moveToSkipped(filePath);
        return;
      }

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
