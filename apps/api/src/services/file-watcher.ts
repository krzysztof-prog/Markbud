import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PrismaClient } from '@prisma/client';
import { CsvParser } from './parsers/csv-parser.js';
import { logger } from '../utils/logger.js';
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { emitDeliveryCreated, emitOrderUpdated } from './event-emitter.js';

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

    console.log('👀 Uruchamiam File Watcher...');
    console.log(`   📁 Folder "użyte bele": ${uzyteBelePath}`);
    console.log(`   📁 Folder "ceny": ${cenyPath}`);

    // Najpierw zeskanuj istniejące foldery
    await this.scanExistingFolders(uzyteBelePath);

    // Watcher dla PODFOLDERÓW w "użyte bele" - automatyczny import
    this.watchUzyteBeleFolders(uzyteBelePath);

    // Watcher dla folderu "ceny" (PDF) - stary system
    this.watchFolder(cenyPath, 'ceny_pdf', ['*.pdf', '*.PDF']);
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
    importsBasePath: string;
  }> {
    const projectRoot = path.resolve(__dirname, '../../../../');

    const watchFolderUzyteBele = process.env.WATCH_FOLDER_UZYTE_BELE
      || await this.getSetting('watchFolderUzyteBele')
      || path.join(projectRoot, 'uzyte bele');

    const watchFolderCeny = process.env.WATCH_FOLDER_CENY
      || await this.getSetting('watchFolderCeny')
      || path.join(projectRoot, 'ceny');

    const importsBasePath = await this.getSetting('importsBasePath')
      || process.env.IMPORTS_BASE_PATH
      || 'C:\\Dostawy';

    return {
      watchFolderUzyteBele,
      watchFolderCeny,
      importsBasePath,
    };
  }
}
