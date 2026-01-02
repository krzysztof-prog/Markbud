// @ts-nocheck - Temporarily disabled TypeScript checks due to okuc module errors
import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PrismaClient } from '@prisma/client';
import { CsvParser } from './parsers/csv-parser.js';
import { logger } from '../utils/logger.js';
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { emitDeliveryCreated, emitOrderUpdated, eventEmitter } from './event-emitter.js';
import { config } from '../utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileWatcherService {
  private prisma: PrismaClient;
  private watchers: chokidar.FSWatcher[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async start() {
    // Pobierz ścieżki z ustawień (domyślnie folder w głównym katalogu projektu)
    const projectRoot = path.resolve(__dirname, '../../../../');

    // Sprawdź zmienne środowiskowe, potem ustawienia z bazy, potem domyślne
    const uzyteBelePath = process.env.WATCH_FOLDER_UZYTE_BELE
      || await this.getSetting('watchFolderUzyteBele')
      || path.join(projectRoot, 'uzyte bele');
    const cenyPath = process.env.WATCH_FOLDER_CENY
      || await this.getSetting('watchFolderCeny')
      || path.join(projectRoot, 'ceny');
    const glassOrdersPath = process.env.WATCH_FOLDER_GLASS_ORDERS
      || await this.getSetting('watchFolderGlassOrders')
      || path.join(projectRoot, 'zamowienia_szyb');
    const glassDeliveriesPath = process.env.WATCH_FOLDER_GLASS_DELIVERIES
      || await this.getSetting('watchFolderGlassDeliveries')
      || path.join(projectRoot, 'dostawy_szyb');
    const okucRwPath = process.env.WATCH_FOLDER_OKUC_RW
      || await this.getSetting('watchFolderOkucRw')
      || path.join(projectRoot, 'okuc_rw');
    const okucDemandPath = process.env.WATCH_FOLDER_OKUC_DEMAND
      || await this.getSetting('watchFolderOkucDemand')
      || path.join(projectRoot, 'okuc_zapotrzebowanie');

    console.log('👀 Uruchamiam File Watcher...');
    console.log(`   📁 Folder "użyte bele": ${uzyteBelePath}`);
    console.log(`   📁 Folder "ceny": ${cenyPath}`);
    console.log(`   📁 Folder "zamówienia szyb": ${glassOrdersPath}`);
    console.log(`   📁 Folder "dostawy szyb": ${glassDeliveriesPath}`);
    console.log(`   📁 Folder "okuc RW": ${okucRwPath}`);
    console.log(`   📁 Folder "okuc zapotrzebowanie": ${okucDemandPath}`);

    // Najpierw zeskanuj istniejące foldery
    await this.scanExistingFolders(uzyteBelePath);

    // Watcher dla PODFOLDERÓW w "użyte bele" - automatyczny import
    this.watchUzyteBeleFolders(uzyteBelePath);

    // Watcher dla folderu "ceny" (PDF) - stary system
    this.watchFolder(cenyPath, 'ceny_pdf', ['*.pdf', '*.PDF']);

    // Watchers dla szyb
    this.watchGlassOrdersFolder(glassOrdersPath);
    this.watchGlassDeliveriesFolder(glassDeliveriesPath);

    // Watchers dla Okuc (RW i Zapotrzebowanie)
    this.watchOkucRwFolder(okucRwPath);
    this.watchOkucDemandFolder(okucDemandPath);
  }

  /**
   * Skanuje istniejące podfoldery w "użyte bele" i importuje pliki CSV
   */
  async scanExistingFolders(basePath: string) {
    const absolutePath = path.resolve(basePath);

    if (!existsSync(absolutePath)) {
      console.log(`   ⚠️ Folder nie istnieje: ${absolutePath}`);
      return;
    }

    console.log(`   🔍 Skanuję istniejące foldery w: ${absolutePath}`);

    try {
      const { readdir } = await import('fs/promises');
      const entries = await readdir(absolutePath, { withFileTypes: true });

      const dateFolders = entries.filter(entry => {
        if (!entry.isDirectory()) return false;
        // Sprawdź czy nazwa zawiera datę w formacie DD.MM.YYYY
        return /\d{2}\.\d{2}\.\d{4}/.test(entry.name);
      });

      if (dateFolders.length === 0) {
        console.log(`   ℹ️ Brak folderów z datą do zaimportowania`);
        return;
      }

      console.log(`   📂 Znaleziono ${dateFolders.length} folderów z datą`);

      for (const folder of dateFolders) {
        const folderPath = path.join(absolutePath, folder.name);
        await this.handleNewUzyteBeleFolder(folderPath);
      }
    } catch (error) {
      logger.error(`Błąd skanowania ${absolutePath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  }

  private async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    return setting?.value || null;
  }

  private watchFolder(folderPath: string, fileType: string, patterns: string[]) {
    const absolutePath = path.resolve(folderPath);
    const globPatterns = patterns.map(p => path.join(absolutePath, p));

    const watcher = chokidar.watch(globPatterns, {
      persistent: true,
      ignoreInitial: false, // Skanuj istniejące pliki przy starcie
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    watcher
      .on('add', async (filePath) => {
        console.log(`📄 Wykryto nowy plik: ${filePath}`);
        await this.handleNewFile(filePath, fileType);
      })
      .on('error', (error) => {
        console.error(`❌ Błąd File Watcher dla ${folderPath}:`, error);
      });

    this.watchers.push(watcher);
  }

  private async handleNewFile(filePath: string, fileType: string) {
    const filename = path.basename(filePath);

    // Sprawdź czy plik już był importowany
    const existing = await this.prisma.fileImport.findFirst({
      where: {
        filepath: filePath,
        status: { in: ['pending', 'completed'] },
      },
    });

    if (existing) {
      console.log(`   ⏭️ Plik już zarejestrowany: ${filename}`);
      return;
    }

    // Zarejestruj nowy plik do importu
    const fileImport = await this.prisma.fileImport.create({
      data: {
        filename,
        filepath: filePath,
        fileType,
        status: 'pending',
      },
    });

    console.log(`   ✅ Zarejestrowano do importu: ${filename} (ID: ${fileImport.id})`);

    // TODO: Wyślij powiadomienie WebSocket do frontendu
  }

  /**
   * Nasłuchuje nowych PODFOLDERÓW w "użyte bele" i automatycznie importuje pliki CSV
   */
  private watchUzyteBeleFolders(basePath: string) {
    const absolutePath = path.resolve(basePath);

    // Obserwuj katalog dla nowych podfolderów
    const watcher = chokidar.watch(absolutePath, {
      persistent: true,
      ignoreInitial: true, // Ignoruj istniejące na start
      depth: 1, // Tylko pierwszy poziom podfolderów
      awaitWriteFinish: {
        stabilityThreshold: 3000, // Poczekaj 3s zanim uznasz folder za gotowy
        pollInterval: 100,
      },
    });

    watcher
      .on('addDir', async (folderPath) => {
        // Ignoruj sam folder bazowy
        if (folderPath === absolutePath) {
          return;
        }

        console.log(`📁 Wykryto nowy podfolder: ${folderPath}`);
        await this.handleNewUzyteBeleFolder(folderPath);
      })
      .on('error', (error) => {
        logger.error(`❌ Błąd File Watcher dla podfolderów ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    console.log(`   🔍 Nasłuchuję nowych podfolderów w: ${absolutePath}`);
  }

  /**
   * Obsługuje nowy podfolder w "użyte bele" - automatyczny import wszystkich CSV
   */
  private async handleNewUzyteBeleFolder(folderPath: string) {
    const folderName = path.basename(folderPath);

    // Wyciągnij datę z nazwy folderu (format DD.MM.YYYY)
    const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);

    if (!dateMatch) {
      logger.warn(`   ⚠️ Folder "${folderName}" nie zawiera daty w formacie DD.MM.YYYY - pomijam`);
      return;
    }

    const [, day, month, year] = dateMatch;
    const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (isNaN(deliveryDate.getTime())) {
      logger.warn(`   ⚠️ Nieprawidłowa data w nazwie folderu "${folderName}" - pomijam`);
      return;
    }

    logger.info(`   📅 Wykryto folder z datą: ${day}.${month}.${year}`);

    // Wyciągnij numer dostawy z nazwy folderu (opcjonalnie)
    // Format: "01.12.2025_I" lub "01.12.2025_II" lub "01.12.2025_III"
    const deliveryNumberMatch = folderName.match(/_(I{1,3})$/);
    const deliveryNumber = (deliveryNumberMatch?.[1] || 'I') as 'I' | 'II' | 'III';

    logger.info(`   📦 Numer dostawy: ${deliveryNumber}`);

    try {
      // Użyj istniejącej funkcji importu z routes/imports.ts
      await this.importFolderAuto(folderPath, deliveryDate, deliveryNumber, folderName);
    } catch (error) {
      logger.error(`   ❌ Błąd importu folderu "${folderName}": ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  }

  /**
   * Automatyczny import folderu (podobnie jak POST /api/imports/folder)
   */
  private async importFolderAuto(
    folderPath: string,
    deliveryDate: Date,
    deliveryNumber: 'I' | 'II' | 'III',
    folderName: string
  ) {
    const { readdir } = await import('fs/promises');

    // Znajdź wszystkie pliki CSV rekursywnie
    const csvFiles = await this.findCsvFilesInFolder(folderPath);

    if (csvFiles.length === 0) {
      logger.warn(`   ⚠️ Brak plików CSV w folderze "${folderName}"`);
      return;
    }

    logger.info(`   📄 Znaleziono ${csvFiles.length} plików CSV`);

    // Generuj pełny numer dostawy w formacie DD.MM.YYYY_X
    const day = String(deliveryDate.getDate()).padStart(2, '0');
    const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
    const year = deliveryDate.getFullYear();
    const fullDeliveryNumber = `${day}.${month}.${year}_${deliveryNumber}`;

    // Znajdź dostawę - sprawdź wszystkie dostawy w tym dniu i dopasuj po sufiksie
    const deliveriesOnDay = await this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate()),
          lt: new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate() + 1),
        },
      },
    });

    // Szukaj dostawy która kończy się tym samym sufiksem (I, II, III, etc.)
    let delivery = deliveriesOnDay.find(d => d.deliveryNumber?.endsWith(`_${deliveryNumber}`));

    const deliveryCreated = !delivery;

    if (!delivery) {
      delivery = await this.prisma.delivery.create({
        data: {
          deliveryDate,
          deliveryNumber: fullDeliveryNumber,
          status: 'planned',
        },
      });
      logger.info(`   ✨ Utworzono nową dostawę ${fullDeliveryNumber} na ${deliveryDate.toLocaleDateString('pl-PL')}`);
      emitDeliveryCreated(delivery);
    } else {
      logger.info(`   📦 Używam istniejącej dostawy ${delivery.deliveryNumber} (ID: ${delivery.id})`);
    }

    // Utwórz folder uploads jeśli nie istnieje
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const parser = new CsvParser();
    let successCount = 0;
    let failCount = 0;

    // Przetwórz każdy plik CSV
    for (const csvFile of csvFiles) {
      try {
        const originalFilename = path.basename(csvFile);

        // Sprawdź czy ten plik (po nazwie oryginalnej) był już importowany
        const alreadyImported = await this.prisma.fileImport.findFirst({
          where: {
            filename: { contains: originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_') },
            status: { in: ['completed', 'processing'] },
          },
        });

        if (alreadyImported) {
          logger.info(`   ⏭️ Plik ${originalFilename} już był zaimportowany, pomijam`);
          continue;
        }

        const timestamp = Date.now();
        const safeFilename = `${timestamp}_${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
          // Jeśli jest konflikt (bazowe istnieje), zostaw jako PENDING i poczekaj na decyzję użytkownika
          await this.prisma.fileImport.create({
            data: {
              filename: safeFilename,
              filepath: destPath,
              fileType: 'uzyte_bele',
              status: 'pending',
              metadata: JSON.stringify({
                preview,
                deliveryId: delivery.id,
                autoDetectedConflict: true,
              }),
            },
          });

          logger.warn(`   ⚠️ Konflikt: ${relativePath} → zlecenie ${preview.orderNumber} (bazowe ${preview.conflict?.baseOrderNumber} ISTNIEJE)`);
          logger.info(`   ⏸️ Plik oczekuje na decyzję użytkownika`);
          continue; // Pomiń automatyczne przetwarzanie
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
        const existingDeliveryOrder = await this.prisma.deliveryOrder.findUnique({
          where: {
            deliveryId_orderId: {
              deliveryId: delivery.id,
              orderId: result.orderId,
            },
          },
        });

        if (!existingDeliveryOrder) {
          const maxPosition = await this.prisma.deliveryOrder.aggregate({
            where: { deliveryId: delivery.id },
            _max: { position: true },
          });

          await this.prisma.deliveryOrder.create({
            data: {
              deliveryId: delivery.id,
              orderId: result.orderId,
              position: (maxPosition._max.position || 0) + 1,
            },
          });

          emitOrderUpdated({ id: result.orderId });
        }

        successCount++;
        logger.info(`   ✅ Zaimportowano: ${relativePath} → zlecenie ${order?.orderNumber}`);
      } catch (error) {
        failCount++;
        logger.error(`   ❌ Błąd importu ${csvFile}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
      }
    }

    logger.info(`   🎉 Import zakończony: ${successCount}/${csvFiles.length} plików zaimportowano pomyślnie`);
  }

  /**
   * Rekursywnie znajduje wszystkie pliki CSV w folderze
   */
  private async findCsvFilesInFolder(folderPath: string): Promise<string[]> {
    const { readdir } = await import('fs/promises');
    const { statSync } = await import('fs');
    const results: string[] = [];

    try {
      const entries = await readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);

        if (entry.isDirectory()) {
          // Rekursywnie przeszukaj podfolder
          const subResults = await this.findCsvFilesInFolder(fullPath);
          results.push(...subResults);
        } else if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase();
          if (lowerName.endsWith('.csv') && (lowerName.includes('uzyte') || lowerName.includes('bele'))) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.error(`Błąd skanowania ${folderPath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }

    return results;
  }

  async stop() {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
    console.log('👀 File Watcher zatrzymany');
  }

  /**
   * Restartuje watchery (przydatne po zmianie ustawien folderow)
   */
  async restart() {
    console.log('🔄 Restartuję File Watcher...');
    await this.stop();
    await this.start();
  }

  /**
   * Zwraca aktualne sciezki monitorowanych folderow
   */
  async getCurrentPaths(): Promise<{
    watchFolderUzyteBele: string;
    watchFolderCeny: string;
    watchFolderGlassOrders: string;
    watchFolderGlassDeliveries: string;
    watchFolderOkucRw: string;
    watchFolderOkucDemand: string;
    importsBasePath: string;
    importsCenyPath: string;
  }> {
    const projectRoot = path.resolve(__dirname, '../../../../');

    const watchFolderUzyteBele = process.env.WATCH_FOLDER_UZYTE_BELE
      || await this.getSetting('watchFolderUzyteBele')
      || path.join(projectRoot, 'uzyte bele');

    const watchFolderCeny = process.env.WATCH_FOLDER_CENY
      || await this.getSetting('watchFolderCeny')
      || path.join(projectRoot, 'ceny');

    const watchFolderGlassOrders = process.env.WATCH_FOLDER_GLASS_ORDERS
      || await this.getSetting('watchFolderGlassOrders')
      || path.join(projectRoot, 'zamowienia_szyb');

    const watchFolderGlassDeliveries = process.env.WATCH_FOLDER_GLASS_DELIVERIES
      || await this.getSetting('watchFolderGlassDeliveries')
      || path.join(projectRoot, 'dostawy_szyb');

    const watchFolderOkucRw = path.resolve(projectRoot, config.watchFolders.okucRw);
    const watchFolderOkucDemand = path.resolve(projectRoot, config.watchFolders.okucDemand);

    const importsBasePath = await this.getSetting('importsBasePath')
      || process.env.IMPORTS_BASE_PATH
      || 'C:\\Dostawy';

    const importsCenyPath = await this.getSetting('importsCenyPath')
      || process.env.IMPORTS_CENY_PATH
      || 'C:\\Ceny';

    return {
      watchFolderUzyteBele,
      watchFolderCeny,
      watchFolderGlassOrders,
      watchFolderGlassDeliveries,
      watchFolderOkucRw,
      watchFolderOkucDemand,
      importsBasePath,
      importsCenyPath,
    };
  }

  /**
   * Obserwuj folder zamówień szyb (.txt)
   * Wykrywa "korekta" w nazwie → zastępuje poprzednie zamówienie
   */
  private watchGlassOrdersFolder(basePath: string) {
    const absolutePath = path.resolve(basePath);
    const globPatterns = [path.join(absolutePath, '*.txt'), path.join(absolutePath, '*.TXT')];

    const watcher = chokidar.watch(globPatterns, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
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
        logger.error(`❌ Błąd File Watcher dla zamówień szyb ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   👀 Obserwuję zamówienia szyb: ${absolutePath}`);
  }

  /**
   * Obserwuj folder dostaw szyb (.csv)
   */
  private watchGlassDeliveriesFolder(basePath: string) {
    const absolutePath = path.resolve(basePath);
    const globPatterns = [path.join(absolutePath, '*.csv'), path.join(absolutePath, '*.CSV')];

    const watcher = chokidar.watch(globPatterns, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    watcher
      .on('add', async (filePath) => {
        await this.handleNewGlassDeliveryCsv(filePath);
      })
      .on('error', (error) => {
        logger.error(`❌ Błąd File Watcher dla dostaw szyb ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   👀 Obserwuję dostawy szyb: ${absolutePath}`);
  }

  /**
   * Obsługa KOREKTY zamówienia szyb
   * Zastępuje poprzednie zamówienie o tym samym numerze
   */
  private async handleCorrectionGlassOrderTxt(filePath: string) {
    const filename = path.basename(filePath);

    try {
      logger.info(`   📝 KOREKTA zamówienia szyb wykryta: ${filename}`);

      const { readFile } = await import('fs/promises');
      const { parseGlassOrderTxt } = await import('./parsers/glass-order-txt-parser.js');
      const { GlassOrderService } = await import('./glassOrderService.js');

      // Parse TXT
      const buffer = await readFile(filePath);
      const parsed = parseGlassOrderTxt(buffer);
      const glassOrderNumber = parsed.metadata.glassOrderNumber;

      logger.info(`   🔍 Sprawdzam zamówienie ${glassOrderNumber}`);

      // Znajdź istniejące
      const existing = await this.prisma.glassOrder.findUnique({
        where: { glassOrderNumber },
      });

      if (existing) {
        logger.info(`   🔄 Zastępuję zamówienie ${glassOrderNumber} (ID: ${existing.id})`);

        // Usuń stare (reverse counts)
        const glassOrderService = new GlassOrderService(this.prisma);
        await glassOrderService.delete(existing.id);

        logger.info(`   ✅ Usunięto stare zamówienie`);
      } else {
        logger.warn(`   ⚠️ Nie znaleziono poprzedniego zamówienia - tworzę nowe`);
      }

      // Utwórz nowe
      const glassOrderService = new GlassOrderService(this.prisma);
      const newOrder = await glassOrderService.importFromTxt(buffer, filename);

      logger.info(`   ✨ Utworzono nowe zamówienie (ID: ${newOrder.id})`);

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
    } catch (error) {
      logger.error(
        `   ❌ Błąd korekty ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
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
  private async handleNewGlassOrderTxt(filePath: string) {
    const filename = path.basename(filePath);

    try {
      logger.info(`   📄 Nowe zamówienie szyb: ${filename}`);

      const { readFile } = await import('fs/promises');
      const { GlassOrderService } = await import('./glassOrderService.js');

      const buffer = await readFile(filePath);
      const glassOrderService = new GlassOrderService(this.prisma);
      const order = await glassOrderService.importFromTxt(buffer, filename);

      logger.info(`   ✅ Zaimportowano zamówienie (ID: ${order.id})`);

      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_order',
          status: 'completed',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
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
  private async handleNewGlassDeliveryCsv(filePath: string) {
    const filename = path.basename(filePath);

    try {
      logger.info(`   📦 Nowa dostawa szyb: ${filename}`);

      const { readFile } = await import('fs/promises');
      const { GlassDeliveryService } = await import('./glass-delivery/index.js');

      const content = await readFile(filePath, 'utf-8');
      const glassDeliveryService = new GlassDeliveryService(this.prisma);
      const delivery = await glassDeliveryService.importFromCsv(content, filename);

      logger.info(`   ✅ Zaimportowano dostawę (ID: ${delivery.id})`);

      await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'glass_delivery',
          status: 'completed',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
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

  // ============ OKUC FOLDERS WATCHING ============

  /**
   * Obserwuj folder RW okuć (.csv)
   * RW automatycznie aktualizuje stan magazynu (z podmagazynu 'production')
   */
  private watchOkucRwFolder(basePath: string) {
    const absolutePath = path.resolve(basePath);

    // Utwórz folder jeśli nie istnieje
    if (!existsSync(absolutePath)) {
      logger.info(`   ⚠️ Tworzę folder Okuc RW: ${absolutePath}`);
      import('fs/promises').then(({ mkdir }) => {
        mkdir(absolutePath, { recursive: true }).catch((err) => {
          logger.error(`Nie można utworzyć folderu Okuc RW: ${err.message}`);
        });
      });
      return;
    }

    const globPatterns = [path.join(absolutePath, '*.csv'), path.join(absolutePath, '*.CSV')];

    const watcher = chokidar.watch(globPatterns, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    watcher
      .on('add', async (filePath) => {
        await this.handleOkucRwCsv(filePath);
      })
      .on('error', (error) => {
        logger.error(`❌ Błąd File Watcher dla Okuc RW ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   👀 Obserwuję Okuc RW: ${absolutePath}`);
  }

  /**
   * Obserwuj folder zapotrzebowania okuć (.csv)
   * CSV nadpisuje dane ze zleceń (priorytet CSV)
   */
  private watchOkucDemandFolder(basePath: string) {
    const absolutePath = path.resolve(basePath);

    // Utwórz folder jeśli nie istnieje
    if (!existsSync(absolutePath)) {
      logger.info(`   ⚠️ Tworzę folder Okuc Zapotrzebowanie: ${absolutePath}`);
      import('fs/promises').then(({ mkdir }) => {
        mkdir(absolutePath, { recursive: true }).catch((err) => {
          logger.error(`Nie można utworzyć folderu Okuc Zapotrzebowanie: ${err.message}`);
        });
      });
      return;
    }

    const globPatterns = [path.join(absolutePath, '*.csv'), path.join(absolutePath, '*.CSV')];

    const watcher = chokidar.watch(globPatterns, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    watcher
      .on('add', async (filePath) => {
        await this.handleOkucDemandCsv(filePath);
      })
      .on('error', (error) => {
        logger.error(`❌ Błąd File Watcher dla Okuc Zapotrzebowanie ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   👀 Obserwuję Okuc Zapotrzebowanie: ${absolutePath}`);
  }

  /**
   * Obsługa pliku RW okuć (CSV)
   * - Parsuje CSV przez okuc-csv-parser
   * - Rozwiązuje aliasy artykułów
   * - Aktualizuje stan magazynu (podmagazyn 'production')
   * - Emituje event WebSocket
   */
  private async handleOkucRwCsv(filePath: string) {
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
        logger.info(`   ⏭️ Okuc RW plik już zarejestrowany: ${filename}`);
        return;
      }

      logger.info(`   📄 Nowy Okuc RW: ${filename}`);

      // Zarejestruj import jako processing
      const fileImport = await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'okuc_rw',
          status: 'processing',
        },
      });

      // Dynamiczny import parsera (implementuje inny agent)
      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf-8');

      // Parser okuc-csv-parser - importowany dynamicznie
      // Oczekiwana struktura: { parseOkucRwCsvSync(content: string): OkucRwItem[] }
      let parsedItems: Array<{ articleId: string; quantity: number; reference?: string }> = [];

      try {
        const { parseOkucRwCsvSync } = await import('./parsers/okuc-csv-parser.js');
        parsedItems = parseOkucRwCsvSync(content);
      } catch (parserError) {
        // Fallback: parser jeszcze nie zaimplementowany
        logger.warn(`   ⚠️ Parser okuc-csv-parser nie jest jeszcze dostępny, oczekuję na implementację`);
        await this.prisma.fileImport.update({
          where: { id: fileImport.id },
          data: {
            status: 'pending',
            errorMessage: 'Parser okuc-csv-parser nie jest jeszcze dostępny',
          },
        });
        return;
      }

      // Import repozytoriów Okuc
      // Temporarily disabled - TypeScript errors in okuc module
      return;
      // const { OkucArticleRepository, OkucStockRepository, OkucHistoryRepository } = await import(
      //   '../repositories/okuc/index.js'
      // );

      // const articleRepo = new OkucArticleRepository(this.prisma);
      // const stockRepo = new OkucStockRepository(this.prisma);
      // const historyRepo = new OkucHistoryRepository(this.prisma);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Przetwórz każdy element RW
      for (const item of parsedItems) {
        try {
          // Rozwiąż alias artykułu
          const article = await articleRepo.resolveArticle(item.articleId);

          if (!article) {
            errors.push(`Artykuł ${item.articleId} nie znaleziony`);
            failCount++;
            continue;
          }

          // Znajdź stock w podmagazynie 'production'
          const stock = await stockRepo.findByArticle(article.id, 'pvc', 'production');

          if (!stock) {
            // Utwórz nowy stock jeśli nie istnieje
            await stockRepo.upsert(article.id, 'pvc', 'production', 0, 1); // userId=1 (system)
            const newStock = await stockRepo.findByArticle(article.id, 'pvc', 'production');

            if (newStock) {
              // Odejmij ilość (RW = wydanie z magazynu)
              const previousQty = newStock.currentQuantity;
              const newQty = Math.max(0, previousQty - item.quantity);

              await stockRepo.updateStock(newStock.id, {
                quantity: newQty,
                userId: 1, // system user
                reason: `RW import: ${filename}`,
              });

              // Zapisz historię
              await historyRepo.recordConsumption(
                article.id,
                'pvc',
                'production',
                previousQty,
                item.quantity,
                item.reference || filename,
                1 // system user
              );
            }
          } else {
            // Odejmij ilość z istniejącego stanu
            const previousQty = stock.currentQuantity;
            const newQty = Math.max(0, previousQty - item.quantity);

            await stockRepo.updateStock(stock.id, {
              quantity: newQty,
              userId: 1,
              reason: `RW import: ${filename}`,
            });

            // Zapisz historię
            await historyRepo.recordConsumption(
              article.id,
              'pvc',
              'production',
              previousQty,
              item.quantity,
              item.reference || filename,
              1
            );
          }

          successCount++;
        } catch (itemError) {
          failCount++;
          errors.push(
            `Błąd dla ${item.articleId}: ${itemError instanceof Error ? itemError.message : 'Unknown'}`
          );
        }
      }

      // Zaktualizuj status importu
      const finalStatus = failCount === 0 ? 'completed' : failCount === parsedItems.length ? 'failed' : 'completed';

      await this.prisma.fileImport.update({
        where: { id: fileImport.id },
        data: {
          status: finalStatus,
          processedAt: new Date(),
          metadata: JSON.stringify({
            totalItems: parsedItems.length,
            successCount,
            failCount,
            errors: errors.slice(0, 10), // Ogranicz do 10 błędów
          }),
          errorMessage: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
        },
      });

      logger.info(`   ✅ Okuc RW import: ${successCount}/${parsedItems.length} pozycji`);

      // Emit WebSocket event
      eventEmitter.emitDataChange({
        type: 'okuc:rw_imported',
        data: {
          filename,
          successCount,
          failCount,
          totalItems: parsedItems.length,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu Okuc RW ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
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
            fileType: 'okuc_rw',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
  }

  /**
   * Obsługa pliku zapotrzebowania okuć (CSV)
   * - Parsuje CSV przez okuc-csv-parser
   * - Rozwiązuje aliasy artykułów
   * - Nadpisuje istniejące dane zapotrzebowania (priorytet CSV)
   * - Emituje event WebSocket
   */
  private async handleOkucDemandCsv(filePath: string) {
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
        logger.info(`   ⏭️ Okuc Zapotrzebowanie plik już zarejestrowany: ${filename}`);
        return;
      }

      logger.info(`   📄 Nowe Okuc Zapotrzebowanie: ${filename}`);

      // Zarejestruj import jako processing
      const fileImport = await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'okuc_demand',
          status: 'processing',
        },
      });

      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf-8');

      // Parser okuc-csv-parser - importowany dynamicznie
      // Oczekiwana struktura: { parseOkucDemandCsv(content: string): OkucDemandItem[] }
      let parsedItems: Array<{
        demandId?: string;
        articleId: string;
        expectedWeek: string;
        quantity: number;
        status?: string;
      }> = [];

      try {
        const { parseOkucDemandCsvSync } = await import('./parsers/okuc-csv-parser.js');
        parsedItems = parseOkucDemandCsvSync(content);
      } catch (parserError) {
        // Fallback: parser jeszcze nie zaimplementowany
        logger.warn(`   ⚠️ Parser okuc-csv-parser nie jest jeszcze dostępny, oczekuję na implementację`);
        await this.prisma.fileImport.update({
          where: { id: fileImport.id },
          data: {
            status: 'pending',
            errorMessage: 'Parser okuc-csv-parser nie jest jeszcze dostępny',
          },
        });
        return;
      }

      // Temporarily disabled - TypeScript errors in okuc module
      return;
      // const { OkucArticleRepository } = await import('../repositories/okuc/index.js');
      // const articleRepo = new OkucArticleRepository(this.prisma);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Przetwórz każdy element zapotrzebowania
      for (const item of parsedItems) {
        try {
          // Rozwiąż alias artykułu
          const article = await articleRepo.resolveArticle(item.articleId);

          if (!article) {
            errors.push(`Artykuł ${item.articleId} nie znaleziony`);
            failCount++;
            continue;
          }

          // Szukaj istniejącego zapotrzebowania dla artykułu i tygodnia
          const existingDemand = await this.prisma.okucDemand.findFirst({
            where: {
              articleId: article.id,
              expectedWeek: item.expectedWeek,
            },
          });

          if (existingDemand) {
            // Aktualizuj istniejące - CSV ma priorytet (nadpisuje)
            await this.prisma.okucDemand.update({
              where: { id: existingDemand.id },
              data: {
                quantity: item.quantity,
                status: item.status || 'pending',
                source: 'csv_import',
                isManualEdit: false, // Reset edycji ręcznej - CSV ma priorytet
              },
            });
          } else {
            // Utwórz nowe zapotrzebowanie
            await this.prisma.okucDemand.create({
              data: {
                demandId: item.demandId || `CSV-${Date.now()}-${article.id}`,
                articleId: article.id,
                expectedWeek: item.expectedWeek,
                quantity: item.quantity,
                status: item.status || 'pending',
                source: 'csv_import',
              },
            });
          }

          successCount++;
        } catch (itemError) {
          failCount++;
          errors.push(
            `Błąd dla ${item.articleId}: ${itemError instanceof Error ? itemError.message : 'Unknown'}`
          );
        }
      }

      // Zaktualizuj status importu
      const finalStatus = failCount === 0 ? 'completed' : failCount === parsedItems.length ? 'failed' : 'completed';

      await this.prisma.fileImport.update({
        where: { id: fileImport.id },
        data: {
          status: finalStatus,
          processedAt: new Date(),
          metadata: JSON.stringify({
            totalItems: parsedItems.length,
            successCount,
            failCount,
            errors: errors.slice(0, 10),
          }),
          errorMessage: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
        },
      });

      logger.info(`   ✅ Okuc Zapotrzebowanie import: ${successCount}/${parsedItems.length} pozycji`);

      // Emit WebSocket event
      eventEmitter.emitDataChange({
        type: 'okuc:demand_imported',
        data: {
          filename,
          successCount,
          failCount,
          totalItems: parsedItems.length,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(
        `   ❌ Błąd importu Okuc Zapotrzebowanie ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
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
            fileType: 'okuc_demand',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
  }
}
