/**
 * Skrypt do importu stanu początkowego profili z pliku Excel
 *
 * Transformacja kodów:
 * - PR9679452 → numer artykułu: 19679452 (PR→1, uzupełnij do 8 cyfr)
 * - PR967705 → numer artykułu: 19677050 (dodaj 0 na końcu)
 *
 * Parsowanie:
 * - 19679452 → profil: 9679, kolor: 452
 * - 19677050 → profil: 9677, kolor: 050
 *
 * Dla kodów z literami (np. PR9016CA) → kolor: 999
 *
 * Ilość w metrach → przelicz na bele (6m = 1 bela)
 */

import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stała: długość beli w metrach
const BEAM_LENGTH_METERS = 6;

// Data stanu początkowego
const INITIAL_STOCK_DATE = new Date('2026-01-01');

interface ExcelRow {
  kod: string;
  nazwa: string;
  ilosc: number;
}

/**
 * Transformuje kod PR na 8-cyfrowy numer artykułu
 * PR9679452 → 19679452
 * PR967705 → 19677050
 */
function transformPRCode(prCode: string): string {
  // Usuń "PR" z początku
  let code = prCode.replace(/^PR/i, '');

  // Zamień pierwszy znak na "1"
  code = '1' + code;

  // Dopełnij zerami do 8 cyfr
  while (code.length < 8) {
    code = code + '0';
  }

  return code;
}

/**
 * Parsuje numer artykułu na profil i kolor
 * 19679452 → profil: 9679, kolor: 452
 */
function parseArticleNumber(articleNumber: string): { profileNumber: string; colorCode: string } {
  // Usuń pierwszy znak (prefix "1")
  const withoutPrefix = articleNumber.substring(1);

  // Ostatnie 3 znaki to kod koloru
  const colorCode = withoutPrefix.slice(-3);

  // Reszta to numer profilu
  const profileNumber = withoutPrefix.slice(0, -3);

  return { profileNumber, colorCode };
}

/**
 * Sprawdza czy kod koloru zawiera litery
 */
function hasLetters(str: string): boolean {
  return /[a-zA-Z]/.test(str);
}

/**
 * Przelicza metry na bele (zaokrąglone w górę)
 */
function metersToBeams(meters: number): number {
  return Math.ceil(meters / BEAM_LENGTH_METERS);
}

async function main() {
  const filePath = 'C:/DEV_DATA/profile.xlsx';

  console.log('📂 Czytanie pliku:', filePath);

  // Odczytaj plik Excel
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Konwertuj na JSON
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });

  // Parsuj dane (pomiń nagłówek)
  const rows: ExcelRow[] = [];
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[];
    if (!row || !row[0]) continue;

    const kod = String(row[0]).trim();
    const nazwa = String(row[1] || '').trim();
    const iloscRaw = row[2];

    // Parsuj ilość (może być "6,0000" lub 6)
    let ilosc = 0;
    if (typeof iloscRaw === 'number') {
      ilosc = iloscRaw;
    } else if (typeof iloscRaw === 'string') {
      ilosc = parseFloat(iloscRaw.replace(',', '.')) || 0;
    }

    if (kod.startsWith('PR') && ilosc > 0) {
      rows.push({ kod, nazwa, ilosc });
    }
  }

  console.log(`📊 Znaleziono ${rows.length} wierszy z danymi\n`);

  // Statystyki
  let created = { profiles: 0, colors: 0, stocks: 0 };
  let updated = { stocks: 0 };
  let skipped = 0;

  // Najpierw upewnij się że kolor 999 istnieje
  let color999 = await prisma.color.findFirst({ where: { code: '999' } });
  if (!color999) {
    color999 = await prisma.color.create({
      data: {
        code: '999',
        name: 'Nieznany (import)',
        type: 'akrobud',
      },
    });
    console.log('✅ Utworzono kolor 999 (Nieznany)');
    created.colors++;
  }

  // Przetwarzaj każdy wiersz
  for (const row of rows) {
    try {
      // Transformuj kod PR na numer artykułu
      const articleNumber = transformPRCode(row.kod);

      // Parsuj na profil i kolor
      let { profileNumber, colorCode } = parseArticleNumber(articleNumber);

      // Jeśli kod koloru zawiera litery, użyj 999
      if (hasLetters(colorCode)) {
        console.log(`⚠️  ${row.kod} → kolor "${colorCode}" zawiera litery → używam 999`);
        colorCode = '999';
      }

      // Przelicz metry na bele
      const beams = metersToBeams(row.ilosc);

      // Znajdź lub utwórz profil
      let profile = await prisma.profile.findFirst({
        where: { number: profileNumber },
      });

      if (!profile) {
        profile = await prisma.profile.create({
          data: {
            number: profileNumber,
            name: row.nazwa || profileNumber,
            articleNumber: articleNumber,
          },
        });
        console.log(`✅ Utworzono profil: ${profileNumber} (${row.nazwa})`);
        created.profiles++;
      }

      // Znajdź lub utwórz kolor
      let color = await prisma.color.findFirst({
        where: { code: colorCode },
      });

      if (!color) {
        color = await prisma.color.create({
          data: {
            code: colorCode,
            name: colorCode,
            type: 'akrobud',
          },
        });
        console.log(`✅ Utworzono kolor: ${colorCode}`);
        created.colors++;
      }

      // Znajdź lub utwórz WarehouseStock
      let stock = await prisma.warehouseStock.findFirst({
        where: {
          profileId: profile.id,
          colorId: color.id,
        },
      });

      if (stock) {
        // Aktualizuj istniejący
        await prisma.warehouseStock.update({
          where: { id: stock.id },
          data: {
            initialStockBeams: beams,
            currentStockBeams: beams, // Na start current = initial
          },
        });
        updated.stocks++;
        console.log(`📝 Zaktualizowano: ${profileNumber}/${colorCode} = ${beams} beli (${row.ilosc}m)`);
      } else {
        // Utwórz nowy
        await prisma.warehouseStock.create({
          data: {
            profileId: profile.id,
            colorId: color.id,
            initialStockBeams: beams,
            currentStockBeams: beams,
          },
        });
        created.stocks++;
        console.log(`➕ Utworzono: ${profileNumber}/${colorCode} = ${beams} beli (${row.ilosc}m)`);
      }

    } catch (error) {
      console.error(`❌ Błąd dla ${row.kod}:`, error);
      skipped++;
    }
  }

  // Podsumowanie
  console.log('\n' + '='.repeat(50));
  console.log('📊 PODSUMOWANIE');
  console.log('='.repeat(50));
  console.log(`Utworzono profili: ${created.profiles}`);
  console.log(`Utworzono kolorów: ${created.colors}`);
  console.log(`Utworzono stanów magazynowych: ${created.stocks}`);
  console.log(`Zaktualizowano stanów: ${updated.stocks}`);
  console.log(`Pominiętych (błędy): ${skipped}`);
  console.log(`Data stanu początkowego: ${INITIAL_STOCK_DATE.toISOString().split('T')[0]}`);
  console.log('='.repeat(50));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Błąd krytyczny:', error);
  await prisma.$disconnect();
  process.exit(1);
});
