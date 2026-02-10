import chokidar from 'chokidar';
import path from 'path';
import { readFile } from 'fs/promises';
import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';
import { logger } from '../../utils/logger.js';
import { archiveFile, moveToSkipped, shouldSkipImport } from './utils.js';
import type { IFileWatcher, WatcherConfig } from './types.js';
import { DEFAULT_WATCHER_CONFIG } from './types.js';
import { importQueue } from '../import/ImportQueueService.js';

/**
 * Watcher odpowiedzialny za monitorowanie folderów szyb:
 * - Zamówienia szyb (.txt) - nowe i korekty
 * - Dostawy szyb (.csv)
 *
 * Używa GLOBALNEJ kolejki importQueue do sekwencyjnego przetwarzania
 * wszystkich importów w systemie - zapobiega timeoutom SQLite
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
   * Dodaje zadanie do GLOBALNEJ kolejki importów
   * Używa importQueue singleton dla sekwencyjnego przetwarzania wszystkich importów w systemie
   */
  private enqueueToGlobalQueue(
    type: 'glass_order' | 'glass_order_correction' | 'glass_order_pdf' | 'glass_delivery',
    filePath: string
  ): void {
    // Sprawdź czy plik nie jest już w kolejce
    if (importQueue.isFileInQueue(filePath)) {
      logger.debug(`Plik juz w kolejce, pomijam: ${path.basename(filePath)}`);
      return;
    }

    importQueue.enqueue({
      type,
      filePath,
      priority: type === 'glass_order_correction' ? 5 : 10, // Korekty mają wyższy priorytet
      execute: async () => {
        try {
          switch (type) {
            case 'glass_order':
              await this.processGlassOrder(filePath);
              break;
            case 'glass_order_correction':
              await this.processCorrectionGlassOrder(filePath);
              break;
            case 'glass_order_pdf':
              await this.processGlassPdfOrder(filePath);
              break;
            case 'glass_delivery':
              await this.processGlassDelivery(filePath);
              break;
          }
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          // Sprawdź czy to błąd timeout - wtedy retry ma sens
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
        // Filtruj pliki TXT i PDF
        const filename = path.basename(filePath).toLowerCase();

        if (filename.endsWith('.txt')) {
          // Pliki TXT - zamówienia szyb (stary format)
          const isCorrection = /korekta|correction/i.test(filename);

          if (isCorrection) {
            this.enqueueToGlobalQueue('glass_order_correction', filePath);
          } else {
            this.enqueueToGlobalQueue('glass_order', filePath);
          }
        } else if (filename.endsWith('.pdf')) {
          // Pliki PDF - zamówienia szyb (format WH-Okna)
          this.enqueueToGlobalQueue('glass_order_pdf', filePath);
        }
        // Inne rozszerzenia są ignorowane
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
        // Dodaj do GLOBALNEJ kolejki importów
        this.enqueueToGlobalQueue('glass_delivery', filePath);
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

      // Zapisz do FileImport jako failed (ale nie blokuj propagacji błędu)
      try {
        await this.prisma.fileImport.create({
          data: {
            filename,
            filepath: filePath,
            fileType: 'glass_order_correction',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (fileImportError) {
        logger.warn(`Nie udalo sie zapisac FileImport dla ${filename}`);
      }

      // WAŻNE: Propaguj błąd do kolejki aby mogła retry
      throw error;
    }
  }

  /**
   * Przetwarza nowe zamówienie szyb (TXT)
   */
  private async processGlassOrder(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      // Sprawdź czy plik powinien być pominięty
      // (był importowany I nadal istnieje w archiwum)
      const shouldSkip = await shouldSkipImport(this.prisma, filename, filePath);

      if (shouldSkip) {
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

      // Zapisz do FileImport jako failed (ale nie blokuj propagacji błędu)
      try {
        await this.prisma.fileImport.create({
          data: {
            filename,
            filepath: filePath,
            fileType: 'glass_order',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (fileImportError) {
        // Jeśli zapis do FileImport też się nie udał - loguj ale propaguj oryginalny błąd
        logger.warn(`Nie udalo sie zapisac FileImport dla ${filename}`);
      }

      // WAŻNE: Propaguj błąd do kolejki aby mogła retry
      throw error;
    }
  }

  /**
   * Przetwarza zamówienie szyb z pliku PDF (format WH-Okna)
   * orderNumber jest wyciągany z nazwy pliku
   */
  private async processGlassPdfOrder(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      // Sprawdź czy plik powinien być pominięty
      const shouldSkip = await shouldSkipImport(this.prisma, filename, filePath);

      if (shouldSkip) {
        await moveToSkipped(filePath);
        return;
      }

      logger.info(`   Nowe zamowienie szyb (PDF): ${filename}`);

      // Dynamiczny import parsera PDF
      const { parseGlassOrderPdf } = await import('../parsers/glass-order-pdf-parser.js');
      const { GlassOrderService } = await import('../glassOrderService.js');

      const buffer = await readFile(filePath);
      const parsed = await parseGlassOrderPdf(buffer, filename);

      logger.info(`   Sparsowano PDF: ${parsed.metadata.glassOrderNumber}, ${parsed.items.length} pozycji`);

      // Sprawdź czy zamówienie już istnieje
      const existing = await this.prisma.glassOrder.findUnique({
        where: { glassOrderNumber: parsed.metadata.glassOrderNumber },
      });

      if (existing) {
        logger.warn(`   Zamowienie ${parsed.metadata.glassOrderNumber} juz istnieje (ID: ${existing.id}), pomijam`);
        await moveToSkipped(filePath);
        return;
      }

      // Zapisz do bazy używając GlassOrderService (bez parsowania - dane już sparsowane)
      const glassOrderService = new GlassOrderService(this.prisma);

      // Użyj transakcji do zapisu
      const glassOrder = await this.prisma.$transaction(async (tx) => {
        // Utwórz GlassOrder z items
        const order = await tx.glassOrder.create({
          data: {
            glassOrderNumber: parsed.metadata.glassOrderNumber,
            orderDate: parsed.metadata.orderDate,
            supplier: parsed.metadata.supplier,
            orderedBy: parsed.metadata.orderedBy || null,
            expectedDeliveryDate: parsed.metadata.expectedDeliveryDate,
            status: 'ordered',
            items: {
              create: parsed.items.map((item) => ({
                orderNumber: item.orderNumber,
                orderSuffix: item.orderSuffix || null,
                position: item.position,
                glassType: item.glassType,
                widthMm: item.widthMm,
                heightMm: item.heightMm,
                quantity: item.quantity,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        return order;
      }, {
        timeout: 60000,
        maxWait: 10000,
      });

      // Dopasuj do zleceń produkcyjnych
      await glassOrderService.matchWithProductionOrders(glassOrder.id);

      // Ustaw glassOrderNote z metadanych lub nazwy pliku
      // Priorytet: orderedBy z dokumentu > "szprosy"/"kształt" z nazwy pliku
      let glassNote = parsed.metadata.orderedBy || null;

      // Jeśli brak orderedBy, sprawdź czy nazwa pliku zawiera "szprosy" lub "kształt"
      if (!glassNote) {
        const filenameLower = filename.toLowerCase();
        if (filenameLower.includes('szprosy')) {
          glassNote = 'szprosy';
        } else if (filenameLower.includes('kształt') || filenameLower.includes('ksztalt')) {
          glassNote = 'kształt';
        }
      }

      if (glassNote) {
        const orderNumbers = [...new Set(parsed.items.map(item => item.orderNumber))];
        await this.prisma.order.updateMany({
          where: { orderNumber: { in: orderNumbers } },
          data: { glassOrderNote: glassNote },
        });
        logger.info(`   Ustawiono notatkę "${glassNote}" dla ${orderNumbers.length} zleceń`);
      }

      logger.info(`   Zaimportowano zamowienie PDF (ID: ${glassOrder.id})`);

      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_order_pdf',
          status: 'completed',
          processedAt: new Date(),
          metadata: JSON.stringify({
            glassOrderNumber: parsed.metadata.glassOrderNumber,
            itemsCount: parsed.items.length,
            totalQuantity: parsed.summary.totalQuantity,
          }),
        },
      });

      // Archiwizuj plik po pomyślnym imporcie
      await archiveFile(filePath);
    } catch (error) {
      logger.error(
        `   Blad importu PDF ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
      );

      // Zapisz do FileImport jako failed (ale nie blokuj propagacji błędu)
      try {
        await this.prisma.fileImport.create({
          data: {
            filename,
            filepath: filePath,
            fileType: 'glass_order_pdf',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (fileImportError) {
        logger.warn(`Nie udalo sie zapisac FileImport dla ${filename}`);
      }

      // WAŻNE: Propaguj błąd do kolejki aby mogła retry
      throw error;
    }
  }

  /**
   * Przetwarza nową dostawę szyb (CSV)
   */
  private async processGlassDelivery(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      // Sprawdź czy plik powinien być pominięty
      // (był importowany I nadal istnieje w archiwum)
      const shouldSkip = await shouldSkipImport(this.prisma, filename, filePath);

      if (shouldSkip) {
        await moveToSkipped(filePath);
        return;
      }

      logger.info(`   Nowa dostawa szyb: ${filename}`);

      // Dynamiczny import - unikamy cyklicznych zależności
      const { GlassDeliveryService } = await import('../glass-delivery/index.js');

      // Czytaj jako Buffer - parser sam skonwertuje z CP1250 na UTF-8
      const buffer = await readFile(filePath);
      const glassDeliveryService = new GlassDeliveryService(this.prisma);
      const delivery = await glassDeliveryService.importFromCsv(buffer, filename);

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

      // Zapisz do FileImport jako failed (ale nie blokuj propagacji błędu)
      try {
        await this.prisma.fileImport.create({
          data: {
            filename,
            filepath: filePath,
            fileType: 'glass_delivery',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (fileImportError) {
        logger.warn(`Nie udalo sie zapisac FileImport dla ${filename}`);
      }

      // WAŻNE: Propaguj błąd do kolejki aby mogła retry
      throw error;
    }
  }
}
