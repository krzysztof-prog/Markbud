import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';
import type { IFileWatcher, WatcherPaths } from './types.js';
import { getSetting } from './utils.js';
import { GlassWatcher } from './GlassWatcher.js';
import { UzyteBeleWatcher } from './UzyteBeleWatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fabryka i orkiestrator wszystkich file watcherów
 * Odpowiada za uruchamianie, zatrzymywanie i restartowanie watcherów
 */
export class FileWatcherFactory implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private glassWatcher: GlassWatcher;
  private uzyteBeleWatcher: UzyteBeleWatcher;
  private projectRoot: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.projectRoot = path.resolve(__dirname, '../../../../../');
    this.glassWatcher = new GlassWatcher(prisma);
    this.uzyteBeleWatcher = new UzyteBeleWatcher(prisma);
  }

  async start(): Promise<void> {
    const paths = await this.resolvePaths();

    console.log('👀 Uruchamiam File Watcher...');
    console.log(`   📁 Folder "użyte bele": ${paths.watchFolderUzyteBele}`);
    console.log(`   📁 Folder "ceny": ${paths.watchFolderCeny}`);
    console.log(`   📁 Folder "zamówienia szyb": ${paths.watchFolderGlassOrders}`);
    console.log(`   📁 Folder "dostawy szyb": ${paths.watchFolderGlassDeliveries}`);

    // Najpierw zeskanuj istniejące foldery użyte bele
    await this.uzyteBeleWatcher.scanExistingFolders(paths.watchFolderUzyteBele);

    // Uruchom poszczególne watchery
    await this.uzyteBeleWatcher.start(paths.watchFolderUzyteBele);
    await this.glassWatcher.start(paths.watchFolderGlassOrders, paths.watchFolderGlassDeliveries);

    // Watcher dla folderu "ceny" (PDF) - stary system, zostawiamy tutaj
    this.watchCenyFolder(paths.watchFolderCeny);

    // Zbierz wszystkie watchery
    this.watchers = [
      ...this.glassWatcher.getWatchers(),
      ...this.uzyteBeleWatcher.getWatchers(),
    ];
  }

  async stop(): Promise<void> {
    await this.glassWatcher.stop();
    await this.uzyteBeleWatcher.stop();

    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
    console.log('👀 File Watcher zatrzymany');
  }

  async restart(): Promise<void> {
    console.log('🔄 Restartuję File Watcher...');
    await this.stop();
    await this.start();
  }

  getWatchers(): FSWatcher[] {
    return this.watchers;
  }

  /**
   * Zwraca aktualne ścieżki monitorowanych folderów
   */
  async getCurrentPaths(): Promise<WatcherPaths & { importsBasePath: string; importsCenyPath: string }> {
    const paths = await this.resolvePaths();

    const importsBasePath = await getSetting(this.prisma, 'importsBasePath')
      || process.env.IMPORTS_BASE_PATH
      || 'C:\\Dostawy';

    const importsCenyPath = await getSetting(this.prisma, 'importsCenyPath')
      || process.env.IMPORTS_CENY_PATH
      || 'C:\\Ceny';

    return {
      ...paths,
      importsBasePath,
      importsCenyPath,
    };
  }

  /**
   * Rozwiązuje ścieżki do folderów monitorowanych
   */
  private async resolvePaths(): Promise<WatcherPaths> {
    const watchFolderUzyteBele = process.env.WATCH_FOLDER_UZYTE_BELE
      || await getSetting(this.prisma, 'watchFolderUzyteBele')
      || path.join(this.projectRoot, 'uzyte bele');

    const watchFolderCeny = process.env.WATCH_FOLDER_CENY
      || await getSetting(this.prisma, 'watchFolderCeny')
      || path.join(this.projectRoot, 'ceny');

    const watchFolderGlassOrders = process.env.WATCH_FOLDER_GLASS_ORDERS
      || await getSetting(this.prisma, 'watchFolderGlassOrders')
      || path.join(this.projectRoot, 'zamowienia_szyb');

    const watchFolderGlassDeliveries = process.env.WATCH_FOLDER_GLASS_DELIVERIES
      || await getSetting(this.prisma, 'watchFolderGlassDeliveries')
      || path.join(this.projectRoot, 'dostawy_szyb');

    return {
      watchFolderUzyteBele,
      watchFolderCeny,
      watchFolderGlassOrders,
      watchFolderGlassDeliveries,
      importsBasePath: '',
      importsCenyPath: '',
    };
  }

  /**
   * Watcher dla folderu "ceny" (PDF) - legacy, zostawiamy tutaj
   */
  private watchCenyFolder(folderPath: string): void {
    const absolutePath = path.resolve(folderPath);
    const globPatterns = [path.join(absolutePath, '*.pdf'), path.join(absolutePath, '*.PDF')];

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
        console.log(`📄 Wykryto nowy plik PDF: ${filePath}`);
        await this.handleNewCenyFile(filePath);
      })
      .on('error', (error) => {
        console.error(`❌ Błąd File Watcher dla ${folderPath}:`, error);
      });

    this.watchers.push(watcher);
  }

  /**
   * Obsługa nowego pliku PDF w folderze ceny
   */
  private async handleNewCenyFile(filePath: string): Promise<void> {
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
        fileType: 'ceny_pdf',
        status: 'pending',
      },
    });

    console.log(`   ✅ Zarejestrowano do importu: ${filename} (ID: ${fileImport.id})`);
  }
}
