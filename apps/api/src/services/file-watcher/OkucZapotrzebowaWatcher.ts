import chokidar from 'chokidar';
import path from 'path';
import { readFile } from 'fs/promises';
import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';
import { logger } from '../../utils/logger.js';
import { archiveFile } from './utils.js';
import type { IFileWatcher, WatcherConfig } from './types.js';
import { DEFAULT_WATCHER_CONFIG } from './types.js';
import { parse } from 'csv-parse/sync';
import { stripBOM } from '../../utils/string-utils.js';

/**
 * Format pliku CSV:
 * 53762_okucia.csv lub 53762-a_okucia.csv
 * Numer zlecenia na początku nazwy pliku (przed _okucia)
 *
 * Struktura CSV (rzeczywista):
 * Numer art.;Nazwa;Ilosc;Jednostka
 * 25492900;KLAMKA SCHUCO KREMOWA;3;szt.
 */

interface OkucDemandRow {
  articleId: string;
  name: string;
  quantity: number;
  unit?: string;
}

interface NewArticleInfo {
  articleId: string;
  name: string;
  quantity: number;
}

interface ImportResult {
  imported: number;
  atypicalCount: number;
  hasAtypical: boolean;
  errors: string[];
  newArticles: NewArticleInfo[];
  newArticlesCreated: number;
}

/**
 * Watcher odpowiedzialny za monitorowanie folderu zapotrzebowania okuć:
 * - Pliki CSV z zapotrzebowaniem na okucia
 * - Automatyczne przypisanie do zlecenia (nr zlecenia w nazwie pliku)
 * - Wykrywanie nietypowych okuć (orderClass = 'atypical')
 */
export class OkucZapotrzebowaWatcher implements IFileWatcher {
  private prisma: PrismaClient;
  private watchers: FSWatcher[] = [];
  private config: WatcherConfig;

  constructor(prisma: PrismaClient, config: WatcherConfig = DEFAULT_WATCHER_CONFIG) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * Uruchamia watcher dla folderu zapotrzebowania okuć
   * @param okucZapPath - sciezka do folderu z plikami CSV
   */
  async start(okucZapPath: string): Promise<void> {
    this.watchOkucZapFolder(okucZapPath);
  }

  async stop(): Promise<void> {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
    logger.info('OkucZapotrzebowaWatcher zatrzymany');
  }

  getWatchers(): FSWatcher[] {
    return this.watchers;
  }

  /**
   * Obserwuj folder zapotrzebowania okuc (.csv)
   * UWAGA: Na udziałach sieciowych Windows (UNC paths) glob patterns nie działają
   * Dlatego obserwujemy cały folder i filtrujemy pliki po rozszerzeniu
   */
  private watchOkucZapFolder(basePath: string): void {
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
      .on('add', async (filePath) => {
        // Filtruj tylko pliki CSV
        const lowerName = path.basename(filePath).toLowerCase();
        if (!lowerName.endsWith('.csv')) {
          return;
        }
        await this.handleNewOkucZapCsv(filePath);
      })
      .on('error', (error) => {
        logger.error(`Blad File Watcher dla okuc zapotrzebowania ${basePath}: ${error}`);
      });

    this.watchers.push(watcher);
    logger.info(`   👀 Obserwuje zapotrzebowanie okuc: ${absolutePath}`);
  }

  /**
   * Wyodrebnij numer zlecenia z nazwy pliku
   * Format: 53762_okucia.csv lub 53762-a_okucia.csv
   * Zwraca np. "53762" lub "53762-a"
   */
  private extractOrderNumber(filename: string): string | null {
    // Usun rozszerzenie i weź część przed _okucia
    const baseName = path.basename(filename, path.extname(filename));
    const match = baseName.match(/^(\d+(?:-[a-zA-Z]+)?)/);
    return match ? match[1] : null;
  }

  /**
   * Parsuj CSV z zapotrzebowaniem okuc
   * Format: Numer art.;Nazwa;Ilosc;Jednostka
   */
  private parseCsv(content: string): OkucDemandRow[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: [';', ','], // Najpierw srednik (rzeczywisty format), potem przecinek
    }) as Record<string, string>[];

    return records.map((row) => ({
      // Obsluga roznych nazw kolumn (polskie i angielskie)
      articleId: row['Numer artykulu'] || row['Numer art.'] || row['Numer art'] || row.articleId || row.article_id || '',
      name: row['Nazwa'] || row.name || row.Name || '',
      quantity: parseInt(row['Ilosc'] || row['Ilość'] || row.quantity || row.Quantity || '0', 10),
      unit: row['Jednostka'] || row.unit || row.Unit || 'szt.',
    }));
  }

  /**
   * Obsluga nowego pliku CSV z zapotrzebowaniem okuc
   */
  private async handleNewOkucZapCsv(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    try {
      // Sprawdz czy plik juz byl importowany
      const existing = await this.prisma.fileImport.findFirst({
        where: {
          filepath: filePath,
          status: { in: ['pending', 'completed', 'processing'] },
        },
      });

      if (existing) {
        logger.info(`   ⏭️ Plik okuc zapotrzebowania juz zarejestrowany: ${filename}`);
        return;
      }

      logger.info(`   📦 Nowe zapotrzebowanie okuc: ${filename}`);

      // Wyodrebnij numer zlecenia z nazwy pliku
      const orderNumber = this.extractOrderNumber(filename);
      if (!orderNumber) {
        throw new Error(`Nie mozna wyodrebnic numeru zlecenia z nazwy pliku: ${filename}`);
      }

      // Znajdz zlecenie lub ustaw status 'pending'
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
      });

      // Zarejestruj import jako processing
      const fileImport = await this.prisma.fileImport.create({
        data: {
          filename,
          filepath: filePath,
          fileType: 'okuc_zapotrzebowanie',
          status: 'processing',
        },
      });

      // Parsuj CSV - usun BOM jesli istnieje (pliki eksportowane z Excela)
      const rawContent = await readFile(filePath, 'utf-8');
      const content = stripBOM(rawContent);
      const rows = this.parseCsv(content);

      if (rows.length === 0) {
        throw new Error('Plik CSV jest pusty lub ma nieprawidlowy format');
      }

      // Importuj zapotrzebowanie
      const result = await this.importOkucDemand(rows, order?.id ?? null, orderNumber);

      // Zaktualizuj status zlecenia jesli istnieje
      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            okucDemandStatus: result.hasAtypical ? 'has_atypical' : 'imported',
          },
        });
      }

      // Zaktualizuj status importu
      // Status 'pending_review' jesli sa nowe artykuly do weryfikacji, inaczej 'completed'
      const importStatus = result.newArticlesCreated > 0 ? 'pending_review' : 'completed';

      await this.prisma.fileImport.update({
        where: { id: fileImport.id },
        data: {
          status: importStatus,
          processedAt: new Date(),
          metadata: JSON.stringify({
            orderNumber,
            orderId: order?.id ?? null,
            orderExists: !!order,
            itemsCount: result.imported,
            atypicalCount: result.atypicalCount,
            hasAtypical: result.hasAtypical,
            errors: result.errors,
            // Nowe artykuly - do weryfikacji przez uzytkownika
            newArticlesCreated: result.newArticlesCreated,
            newArticles: result.newArticles,
          }),
        },
      });

      // Log wynik
      const newArticlesInfo = result.newArticlesCreated > 0
        ? ` (🆕 ${result.newArticlesCreated} nowych artykulow)`
        : '';
      const atypicalInfo = result.hasAtypical
        ? ` (⚠️ ${result.atypicalCount} nietypowych!)`
        : '';

      if (order) {
        logger.info(
          `   ✅ Zaimportowano ${result.imported} pozycji dla zlecenia ${orderNumber}${atypicalInfo}${newArticlesInfo}`
        );
      } else {
        logger.warn(
          `   ⏳ Zaimportowano ${result.imported} pozycji - zlecenie ${orderNumber} nie istnieje (status: pending)${newArticlesInfo}`
        );
      }

      // Informacja o wymaganych akcjach
      if (result.newArticlesCreated > 0) {
        logger.warn(
          `   ⚡ WYMAGANA AKCJA: ${result.newArticlesCreated} nowych artykulow wymaga weryfikacji orderClass w panelu administracyjnym`
        );
      }

      // Archiwizuj plik po pomyslnym imporcie
      await archiveFile(filePath);
    } catch (error) {
      logger.error(
        `   ❌ Blad importu okuc ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`
      );

      // Znajdz istniejacy import lub utworz nowy
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
            fileType: 'okuc_zapotrzebowanie',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }

      // NIE archiwizuj pliku jesli byl blad
      logger.warn(`   ⚠️ Plik NIE zostal zarchiwizowany - blad importu`);
    }
  }

  /**
   * Importuj zapotrzebowanie okuc do bazy
   * Automatycznie tworzy brakujace artykuly z orderClass='pending_review'
   * Zwraca informacje o imporcie, nietypowych okuciach i nowych artykulach
   */
  private async importOkucDemand(
    rows: OkucDemandRow[],
    orderId: number | null,
    orderNumber: string
  ): Promise<ImportResult> {
    let imported = 0;
    let atypicalCount = 0;
    let newArticlesCreated = 0;
    const errors: string[] = [];
    const newArticles: NewArticleInfo[] = [];

    // Pobierz aktualna date w formacie tygodnia (domyslna wartosc)
    const now = new Date();
    const weekNumber = this.getWeekNumber(now);
    const defaultExpectedWeek = `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;

    for (const row of rows) {
      try {
        if (!row.articleId || row.quantity <= 0) {
          errors.push(`Nieprawidlowy wiersz: articleId=${row.articleId}, quantity=${row.quantity}`);
          continue;
        }

        // Znajdz artykul lub utworz nowy
        let article = await this.prisma.okucArticle.findUnique({
          where: { articleId: row.articleId },
        });

        if (!article) {
          // Automatycznie utworz nowy artykul
          const articleName = row.name || row.articleId; // Nazwa z CSV lub articleId jako fallback

          article = await this.prisma.okucArticle.create({
            data: {
              articleId: row.articleId,
              name: articleName,
              usedInPvc: true, // Domyslnie PVC zgodnie z wymaganiami
              usedInAlu: false,
              orderClass: 'pending_review', // Status do weryfikacji przez uzytkownika
              sizeClass: 'standard',
              orderUnit: 'piece',
              leadTimeDays: 14,
              safetyDays: 3,
            },
          });

          newArticlesCreated++;
          newArticles.push({
            articleId: row.articleId,
            name: articleName,
            quantity: row.quantity,
          });

          logger.info(`   🆕 Utworzono nowy artykul: ${row.articleId} - ${articleName}`);
        }

        // Sprawdz czy nietypowy (pomijamy pending_review - to nowe artykuly)
        const isAtypical = article.orderClass === 'atypical';
        if (isAtypical) {
          atypicalCount++;
        }

        // Utworz zapotrzebowanie
        await this.prisma.okucDemand.create({
          data: {
            articleId: article.id,
            orderId: orderId,
            quantity: row.quantity,
            expectedWeek: defaultExpectedWeek,
            status: 'pending',
            source: 'csv_import',
          },
        });

        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Blad dla ${row.articleId}: ${msg}`);
      }
    }

    // Jesli zlecenie nie istnieje, zapisz informacje do pozniejszego przypisania
    if (!orderId && imported > 0) {
      logger.info(
        `   📋 Zapisano ${imported} pozycji oczekujacych na zlecenie ${orderNumber}`
      );
    }

    // Log o nowych artykulach
    if (newArticlesCreated > 0) {
      logger.info(
        `   📦 Utworzono ${newArticlesCreated} nowych artykulow (wymagaja weryfikacji orderClass)`
      );
    }

    return {
      imported,
      atypicalCount,
      hasAtypical: atypicalCount > 0,
      errors,
      newArticles,
      newArticlesCreated,
    };
  }

  /**
   * Pobierz numer tygodnia z daty
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
