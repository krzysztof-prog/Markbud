/**
 * Skrypt do reimportu zapotrzebowania okuć z plików archiwalnych
 *
 * Ten skrypt odtwarza dane OkucDemand z plików CSV w folderze _archiwum
 * po przypadkowym uruchomieniu clear-imported-data.ts
 *
 * Uruchomienie: pnpm tsx apps/api/scripts/reimport-okuc-demand.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

// Ścieżka do archiwum - dostosuj do środowiska
const ARCHIVE_PATH = 'C:\\DEV_DATA\\okucia_zap\\_archiwum';

interface OkucDemandRow {
  articleId: string;
  name: string;
  quantity: number;
  unit?: string;
}

interface ImportStats {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalDemands: number;
  newArticles: number;
  errors: string[];
}

/**
 * Usuwa BOM z początku pliku (pliki eksportowane z Excela)
 */
function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * Wyodrębnij numer zlecenia z nazwy pliku
 * Format: 53762_okucia.csv lub 53762-a_okucia.csv
 */
function extractOrderNumber(filename: string): string | null {
  const baseName = path.basename(filename, path.extname(filename));
  const match = baseName.match(/^(\d+(?:-[a-zA-Z]+)?)/);
  return match ? match[1] : null;
}

/**
 * Pobierz numer tygodnia z daty
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Parsuj CSV z zapotrzebowaniem okuć
 */
function parseCsv(content: string): OkucDemandRow[] {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: [';', ','],
  }) as Record<string, string>[];

  return records.map((row) => ({
    articleId: row['Numer artykulu'] || row['Numer art.'] || row['Numer art'] || row.articleId || row.article_id || '',
    name: row['Nazwa'] || row.name || row.Name || '',
    quantity: parseInt(row['Ilosc'] || row['Ilość'] || row.quantity || row.Quantity || '0', 10),
    unit: row['Jednostka'] || row.unit || row.Unit || 'szt.',
  }));
}

/**
 * Przetwórz pojedynczy plik CSV
 */
async function processFile(filePath: string, stats: ImportStats): Promise<void> {
  const filename = path.basename(filePath);

  try {
    // Wyodrębnij numer zlecenia
    const orderNumber = extractOrderNumber(filename);
    if (!orderNumber) {
      stats.errors.push(`${filename}: Nie można wyodrębnić numeru zlecenia`);
      stats.failedFiles++;
      return;
    }

    // Wczytaj i parsuj CSV
    const rawContent = await readFile(filePath, 'utf-8');
    const content = stripBOM(rawContent);
    const rows = parseCsv(content);

    if (rows.length === 0) {
      stats.errors.push(`${filename}: Plik pusty lub nieprawidłowy format`);
      stats.failedFiles++;
      return;
    }

    // Znajdź zlecenie (opcjonalne)
    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    // Domyślny tydzień
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const defaultExpectedWeek = `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;

    let importedCount = 0;

    for (const row of rows) {
      if (!row.articleId || row.quantity <= 0) {
        continue;
      }

      // Znajdź lub utwórz artykuł
      let article = await prisma.okucArticle.findUnique({
        where: { articleId: row.articleId },
      });

      if (!article) {
        const articleName = row.name || row.articleId;
        article = await prisma.okucArticle.create({
          data: {
            articleId: row.articleId,
            name: articleName,
            usedInPvc: true,
            usedInAlu: false,
            orderClass: 'pending_review',
            sizeClass: 'standard',
            orderUnit: 'piece',
            leadTimeDays: 14,
            safetyDays: 3,
          },
        });
        stats.newArticles++;
        console.log(`   🆕 Nowy artykuł: ${row.articleId} - ${articleName}`);
      }

      // Utwórz zapotrzebowanie
      await prisma.okucDemand.create({
        data: {
          articleId: article.id,
          orderId: order?.id ?? null,
          quantity: row.quantity,
          expectedWeek: defaultExpectedWeek,
          status: 'pending',
          source: 'csv_import',
        },
      });

      importedCount++;
    }

    // Zaktualizuj status zlecenia jeśli istnieje
    if (order) {
      // Sprawdź czy są nietypowe okucia
      const atypicalCount = await prisma.okucDemand.count({
        where: {
          orderId: order.id,
          article: {
            orderClass: 'atypical',
          },
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          okucDemandStatus: atypicalCount > 0 ? 'has_atypical' : 'imported',
        },
      });
    }

    stats.totalDemands += importedCount;
    stats.successfulFiles++;

    const orderInfo = order ? `zlecenie ${orderNumber}` : `zlecenie ${orderNumber} (brak w bazie)`;
    console.log(`✅ ${filename}: ${importedCount} pozycji → ${orderInfo}`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    stats.errors.push(`${filename}: ${msg}`);
    stats.failedFiles++;
    console.error(`❌ ${filename}: ${msg}`);
  }
}

async function main() {
  console.log('========================================');
  console.log('REIMPORT ZAPOTRZEBOWANIA OKUĆ Z ARCHIWUM');
  console.log('========================================\n');
  console.log(`Źródło: ${ARCHIVE_PATH}\n`);

  const stats: ImportStats = {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    totalDemands: 0,
    newArticles: 0,
    errors: [],
  };

  try {
    // Sprawdź ile jest już rekordów OkucDemand
    const existingCount = await prisma.okucDemand.count();
    if (existingCount > 0) {
      console.log(`⚠️  UWAGA: W bazie jest już ${existingCount} rekordów OkucDemand.`);
      console.log(`   Skrypt może tworzyć duplikaty!`);
      console.log(`   Jeśli chcesz wyczyścić dane przed reimportem, uruchom najpierw:`);
      console.log(`   prisma.okucDemand.deleteMany()\n`);

      // Kontynuuj mimo to - użytkownik może chcieć dodać brakujące
    }

    // Pobierz listę plików CSV
    const files = await readdir(ARCHIVE_PATH);
    const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv'));
    stats.totalFiles = csvFiles.length;

    console.log(`Znaleziono ${csvFiles.length} plików CSV do przetworzenia.\n`);

    // Przetwórz każdy plik
    for (let i = 0; i < csvFiles.length; i++) {
      const filePath = path.join(ARCHIVE_PATH, csvFiles[i]);

      // Pokaż postęp co 20 plików
      if (i > 0 && i % 20 === 0) {
        console.log(`\n--- Postęp: ${i}/${csvFiles.length} ---\n`);
      }

      await processFile(filePath, stats);

      // Mały delay co 10 plików żeby SQLite miał czas
      if (i > 0 && i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Podsumowanie
    console.log('\n========================================');
    console.log('PODSUMOWANIE');
    console.log('========================================');
    console.log(`Pliki ogółem:      ${stats.totalFiles}`);
    console.log(`Pliki pomyślne:    ${stats.successfulFiles}`);
    console.log(`Pliki błędne:      ${stats.failedFiles}`);
    console.log(`Utworzone zapotrzebowania: ${stats.totalDemands}`);
    console.log(`Nowe artykuły:     ${stats.newArticles}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Błędy:');
      stats.errors.forEach(err => console.log(`   - ${err}`));
    }

    // Weryfikacja końcowa
    const finalCount = await prisma.okucDemand.count();
    console.log(`\n📊 Weryfikacja: ${finalCount} rekordów OkucDemand w bazie.`);

  } catch (error) {
    console.error('\n❌ BŁĄD KRYTYCZNY:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
