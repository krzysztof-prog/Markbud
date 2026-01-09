import path from 'path';
import { fileURLToPath } from 'url';
import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';
import type { IFileWatcher, WatcherPaths } from './types.js';
import { getSetting } from './utils.js';
import { GlassWatcher } from './GlassWatcher.js';
import { UzyteBeleWatcher } from './UzyteBeleWatcher.js';
import { UzyteBelePrywatneWatcher } from './UzyteBelePrywatneWatcher.js';
import { CenyWatcher } from './CenyWatcher.js';
import { OkucZapotrzebowaWatcher } from './OkucZapotrzebowaWatcher.js';

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
  private uzyteBelePrywatneWatcher: UzyteBelePrywatneWatcher;
  private cenyWatcher: CenyWatcher;
  private okucZapotrzebowaWatcher: OkucZapotrzebowaWatcher;
  private projectRoot: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.projectRoot = path.resolve(__dirname, '../../../../../');
    this.glassWatcher = new GlassWatcher(prisma);
    this.uzyteBeleWatcher = new UzyteBeleWatcher(prisma);
    this.uzyteBelePrywatneWatcher = new UzyteBelePrywatneWatcher(prisma);
    this.cenyWatcher = new CenyWatcher(prisma);
    this.okucZapotrzebowaWatcher = new OkucZapotrzebowaWatcher(prisma);
  }

  async start(): Promise<void> {
    const paths = await this.resolvePaths();

    console.log('👀 Uruchamiam File Watcher...');
    console.log(`   📁 Folder "użyte bele": ${paths.watchFolderUzyteBele}`);
    console.log(`   📁 Folder "użyte bele prywatne": ${paths.watchFolderUzyteBelePrywatne}`);
    console.log(`   📁 Folder "ceny": ${paths.watchFolderCeny}`);
    console.log(`   📁 Folder "zamówienia szyb": ${paths.watchFolderGlassOrders}`);
    console.log(`   📁 Folder "dostawy szyb": ${paths.watchFolderGlassDeliveries}`);
    console.log(`   📁 Folder "okuc zapotrzebowanie": ${paths.watchFolderOkucZapotrzebowanie}`);

    // Najpierw zeskanuj istniejące foldery użyte bele
    await this.uzyteBeleWatcher.scanExistingFolders(paths.watchFolderUzyteBele);

    // Uruchom poszczególne watchery
    await this.uzyteBeleWatcher.start(paths.watchFolderUzyteBele);
    await this.uzyteBelePrywatneWatcher.start(paths.watchFolderUzyteBelePrywatne);
    await this.glassWatcher.start(paths.watchFolderGlassOrders, paths.watchFolderGlassDeliveries);
    await this.cenyWatcher.start(paths.watchFolderCeny);
    await this.okucZapotrzebowaWatcher.start(paths.watchFolderOkucZapotrzebowanie);

    // Zbierz wszystkie watchery
    this.watchers = [
      ...this.glassWatcher.getWatchers(),
      ...this.uzyteBeleWatcher.getWatchers(),
      ...this.uzyteBelePrywatneWatcher.getWatchers(),
      ...this.cenyWatcher.getWatchers(),
      ...this.okucZapotrzebowaWatcher.getWatchers(),
    ];
  }

  async stop(): Promise<void> {
    await this.glassWatcher.stop();
    await this.uzyteBeleWatcher.stop();
    await this.uzyteBelePrywatneWatcher.stop();
    await this.cenyWatcher.stop();
    await this.okucZapotrzebowaWatcher.stop();

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

    const watchFolderUzyteBelePrywatne = process.env.WATCH_FOLDER_UZYTE_BELE_PRYWATNE
      || await getSetting(this.prisma, 'watchFolderUzyteBelePrywatne')
      || path.join(this.projectRoot, 'uzyte_bele_prywatne');

    const watchFolderCeny = process.env.WATCH_FOLDER_CENY
      || await getSetting(this.prisma, 'watchFolderCeny')
      || path.join(this.projectRoot, 'ceny');

    const watchFolderGlassOrders = process.env.WATCH_FOLDER_GLASS_ORDERS
      || await getSetting(this.prisma, 'watchFolderGlassOrders')
      || path.join(this.projectRoot, 'zamowienia_szyb');

    const watchFolderGlassDeliveries = process.env.WATCH_FOLDER_GLASS_DELIVERIES
      || await getSetting(this.prisma, 'watchFolderGlassDeliveries')
      || path.join(this.projectRoot, 'dostawy_szyb');

    const watchFolderOkucZapotrzebowanie = process.env.WATCH_FOLDER_OKUC_ZAPOTRZEBOWANIE
      || await getSetting(this.prisma, 'watchFolderOkucZapotrzebowanie')
      || path.join(this.projectRoot, 'okuc_zapotrzebowanie');

    return {
      watchFolderUzyteBele,
      watchFolderUzyteBelePrywatne,
      watchFolderCeny,
      watchFolderGlassOrders,
      watchFolderGlassDeliveries,
      watchFolderOkucZapotrzebowanie,
      importsBasePath: '',
      importsCenyPath: '',
    };
  }

}
