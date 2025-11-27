import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PrismaClient } from '@prisma/client';

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
    const uzyteBelePath = await this.getSetting('watchFolderUzyteBele') || path.join(projectRoot, 'uzyte bele');
    const cenyPath = await this.getSetting('watchFolderCeny') || path.join(projectRoot, 'ceny');

    console.log('👀 Uruchamiam File Watcher...');
    console.log(`   📁 Folder "użyte bele": ${uzyteBelePath}`);
    console.log(`   📁 Folder "ceny": ${cenyPath}`);

    // Watcher dla folderu "użyte bele" (CSV)
    this.watchFolder(uzyteBelePath, 'uzyte_bele', ['*.csv']);

    // Watcher dla folderu "ceny" (PDF)
    this.watchFolder(cenyPath, 'ceny_pdf', ['*.pdf', '*.PDF']);
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

  async stop() {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
    console.log('👀 File Watcher zatrzymany');
  }
}
