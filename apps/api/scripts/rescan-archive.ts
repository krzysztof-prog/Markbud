/**
 * Skrypt re-skanowania archiwum PDF cen
 *
 * Skanuje folder _archiwum, parsuje kazdy PDF i probuje dopasowac do zamowien AKROBUD bez EUR.
 * Dwa tryby:
 *   --dry-run  (domyslny) - tylko raport, bez zmian w bazie
 *   --apply               - zapisz dopasowane wartosci EUR do zamowien
 *
 * Uruchom:
 *   pnpm --filter @markbud/api tsx scripts/rescan-archive.ts
 *   pnpm --filter @markbud/api tsx scripts/rescan-archive.ts --apply
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const prisma = new PrismaClient();

const APPLY_MODE = process.argv.includes('--apply');
const ARCHIVE_PATH = process.env.WATCH_FOLDER_CENY
  ? path.join(process.env.WATCH_FOLDER_CENY, '_archiwum')
  : 'Y:/Markbud_import/ceny/_archiwum';

// -- PDF parsing logic (standalone, bez zaleznosci od index.js) --

function parseNumber(str: string): number {
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function extractSumaNetto(text: string): number {
  // Wzorzec 1: Wiersz "Towar"
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (towarMatch) return parseNumber(towarMatch[1]);

  // Wzorzec 2: EUR Podsumowanie
  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  if (eurPodsumowanieMatch) return parseNumber(eurPodsumowanieMatch[2]);

  // Wzorzec 3: "Suma netto VAT brutto"
  const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (sumaEurMatch) return parseNumber(sumaEurMatch[1]);

  // Wzorzec 4: "Suma netto" z wartoscia
  const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
  if (nettoMatch) return parseNumber(nettoMatch[1]);

  // Wzorzec 5: Sklejone wartosci
  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  if (sklejoneMatch) return parseNumber(sklejoneMatch[2]);

  // Wzorzec 6: Trzy liczby w wierszu
  const tripleMatch = text.match(/([\d]+[,.][\d]{2})\s+([\d]+[,.][\d]{2})\s+([\d]+[,.][\d]{2})/);
  if (tripleMatch) return parseNumber(tripleMatch[1]);

  return 0;
}

function extractOrderNumber(text: string, filename: string): string {
  // Strategia 1: Po "SUMA:"
  const sumaMatch = text.match(/SUMA:.*?(\d{5})/s);
  if (sumaMatch) return sumaMatch[1];

  // Strategia 2: 5 cyfr + ZAMOWIENIE
  const beforeZamMatch = text.match(/(\d{5})\s*ZAM[OÓ]WIENIE/);
  if (beforeZamMatch) return beforeZamMatch[1];

  // Strategia 3: Standalone 5-cyfrowy numer w pierwszych 40 liniach
  const lines = text.split('\n');
  for (const line of lines.slice(0, 40)) {
    const match = line.match(/^\s*(\d{5})\s*$/);
    if (match) return match[1];
  }

  // Strategia 4: 5-cyfrowy numer w zakresie 40000-99999
  const allFiveDigit = text.match(/(?<!\d)(\d{5})(?!\d)/g);
  if (allFiveDigit) {
    for (const num of allFiveDigit) {
      const n = parseInt(num);
      if (n >= 40000 && n <= 99999) return num;
    }
  }

  // Strategia 5: Z nazwy pliku "ZAM 53810.pdf"
  const zamMatch = filename.match(/ZAM\s+(\d{5})/i);
  if (zamMatch) return zamMatch[1];

  // Strategia 6: 5-cyfrowy numer z nazwy pliku
  const fiveDigitMatch = filename.match(/(?<!\d)(\d{5})(?!\d)/);
  if (fiveDigitMatch) {
    const n = parseInt(fiveDigitMatch[1]);
    if (n >= 40000 && n <= 99999) return fiveDigitMatch[1];
  }

  return 'UNKNOWN';
}

function detectCurrency(text: string): 'EUR' | 'PLN' {
  return text.includes('\u20ac') || text.includes('EUR') ? 'EUR' : 'PLN';
}

async function parsePdf(filepath: string, filename: string) {
  const dataBuffer = await fs.promises.readFile(filepath);
  const data = await pdf(dataBuffer);
  const text = data.text || '';

  if (text.trim().length < 50) {
    return { orderNumber: 'SCAN_NO_TEXT', currency: 'EUR' as const, valueNetto: 0, text: '' };
  }

  return {
    orderNumber: extractOrderNumber(text, filename),
    currency: detectCurrency(text),
    valueNetto: extractSumaNetto(text),
    text,
  };
}

// -- Helpers --

function pad(s: string, len: number): string {
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

// -- Main --

interface MatchResult {
  filename: string;
  parsedOrderNumber: string;
  currency: string;
  valueNetto: number;
  valueInCents: number;
  matchedOrderId: number | null;
  matchedOrderNumber: string | null;
  matchType: 'exact' | 'prefix' | 'none';
  currentEur: number | null;
  action: 'update' | 'skip_has_eur' | 'skip_no_match' | 'skip_zero' | 'skip_pln' | 'skip_scan';
}

async function main() {
  console.log('');
  console.log('='.repeat(70));
  console.log('  RE-SKAN ARCHIWUM PDF CEN');
  console.log('  Tryb: ' + (APPLY_MODE ? 'APPLY (zapis do bazy!)' : 'DRY-RUN (tylko raport)'));
  console.log('  Archiwum: ' + ARCHIVE_PATH);
  console.log('='.repeat(70));
  console.log('');

  // 1. Wczytaj zamowienia AKROBUD bez EUR
  const ordersWithoutEur = await prisma.order.findMany({
    where: {
      client: { contains: 'AKROBUD' },
      deletedAt: null,
      OR: [{ valueEur: null }, { valueEur: 0 }],
    },
    select: { id: true, orderNumber: true, valueEur: true },
  });
  console.log('Zamowienia AKROBUD bez EUR: ' + ordersWithoutEur.length);

  // Zbuduj mapy
  const allAkrobudOrders = await prisma.order.findMany({
    where: { client: { contains: 'AKROBUD' }, deletedAt: null },
    select: { id: true, orderNumber: true, valueEur: true },
  });
  const orderByExact = new Map(allAkrobudOrders.map((o) => [o.orderNumber, o]));

  // 2. Wczytaj pliki z archiwum
  if (!fs.existsSync(ARCHIVE_PATH)) {
    console.error('Folder archiwum nie istnieje: ' + ARCHIVE_PATH);
    return;
  }
  const files = fs.readdirSync(ARCHIVE_PATH).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log('Pliki PDF w archiwum: ' + files.length);
  console.log('');

  // 3. Parsuj kazdy PDF
  const results: MatchResult[] = [];
  let processed = 0;
  let errors = 0;

  for (const filename of files) {
    processed++;
    if (processed % 50 === 0) {
      process.stdout.write('  Przetworzono ' + processed + '/' + files.length + '...\r');
    }

    const filepath = path.join(ARCHIVE_PATH, filename);
    try {
      const parsed = await parsePdf(filepath, filename);

      // Pomin nie-EUR
      if (parsed.currency !== 'EUR') {
        results.push({
          filename, parsedOrderNumber: parsed.orderNumber, currency: parsed.currency,
          valueNetto: parsed.valueNetto, valueInCents: 0,
          matchedOrderId: null, matchedOrderNumber: null, matchType: 'none',
          currentEur: null, action: 'skip_pln',
        });
        continue;
      }

      // Pomin skany bez tekstu
      if (parsed.orderNumber === 'SCAN_NO_TEXT') {
        results.push({
          filename, parsedOrderNumber: 'SCAN', currency: 'EUR',
          valueNetto: 0, valueInCents: 0,
          matchedOrderId: null, matchedOrderNumber: null, matchType: 'none',
          currentEur: null, action: 'skip_scan',
        });
        continue;
      }

      // Pomin zerowe wartosci
      if (parsed.valueNetto <= 0) {
        results.push({
          filename, parsedOrderNumber: parsed.orderNumber, currency: 'EUR',
          valueNetto: 0, valueInCents: 0,
          matchedOrderId: null, matchedOrderNumber: null, matchType: 'none',
          currentEur: null, action: 'skip_zero',
        });
        continue;
      }

      const valueInCents = Math.round(parsed.valueNetto * 100);

      // Probuj dopasowac do zamowienia
      let matchedOrder: { id: number; orderNumber: string; valueEur: number | null } | null = null;
      let matchType: 'exact' | 'prefix' | 'none' = 'none';

      if (parsed.orderNumber !== 'UNKNOWN') {
        // Exact match
        const exact = orderByExact.get(parsed.orderNumber);
        if (exact) {
          matchedOrder = exact;
          matchType = 'exact';
        } else {
          // Prefix match: 53914 -> 53914-a, 53914-b etc.
          const prefixMatches = allAkrobudOrders.filter((o) =>
            o.orderNumber.startsWith(parsed.orderNumber)
          );
          if (prefixMatches.length === 1) {
            matchedOrder = prefixMatches[0];
            matchType = 'prefix';
          } else if (prefixMatches.length > 1) {
            // Wez pierwszy bez EUR
            const withoutEur = prefixMatches.find(
              (o) => o.valueEur === null || o.valueEur === 0
            );
            if (withoutEur) {
              matchedOrder = withoutEur;
              matchType = 'prefix';
            }
          }
        }
      }

      // Okresl akcje
      let action: MatchResult['action'] = 'skip_no_match';
      if (matchedOrder) {
        if (matchedOrder.valueEur && matchedOrder.valueEur > 0) {
          action = 'skip_has_eur';
        } else {
          action = 'update';
        }
      }

      results.push({
        filename, parsedOrderNumber: parsed.orderNumber, currency: 'EUR',
        valueNetto: parsed.valueNetto, valueInCents,
        matchedOrderId: matchedOrder?.id || null,
        matchedOrderNumber: matchedOrder?.orderNumber || null,
        matchType, currentEur: matchedOrder?.valueEur || null, action,
      });
    } catch (err) {
      errors++;
      results.push({
        filename, parsedOrderNumber: 'ERROR', currency: 'EUR',
        valueNetto: 0, valueInCents: 0,
        matchedOrderId: null, matchedOrderNumber: null, matchType: 'none',
        currentEur: null, action: 'skip_no_match',
      });
    }
  }

  console.log('');
  console.log('Przetworzono ' + processed + ' plikow (' + errors + ' bledow)');
  console.log('');

  // 4. Raport
  const toUpdate = results.filter((r) => r.action === 'update');
  const hasEur = results.filter((r) => r.action === 'skip_has_eur');
  const noMatch = results.filter((r) => r.action === 'skip_no_match');
  const zeroes = results.filter((r) => r.action === 'skip_zero');
  const plns = results.filter((r) => r.action === 'skip_pln');
  const scans = results.filter((r) => r.action === 'skip_scan');

  console.log('-'.repeat(70));
  console.log('PODSUMOWANIE:');
  console.log('-'.repeat(70));
  console.log('  Do aktualizacji (order bez EUR + PDF z wartoscia):  ' + toUpdate.length);
  console.log('  Zamowienie juz ma EUR:                              ' + hasEur.length);
  console.log('  Brak dopasowania do zamowienia:                     ' + noMatch.length);
  console.log('  Wartosc = 0 (parser nie wyciagnal kwoty):           ' + zeroes.length);
  console.log('  PLN (nie EUR):                                      ' + plns.length);
  console.log('  Skan bez tekstu:                                    ' + scans.length);
  console.log('-'.repeat(70));
  console.log('');

  // 5. Pokaz zamowienia do aktualizacji
  if (toUpdate.length > 0) {
    console.log('ZAMOWIENIA DO AKTUALIZACJI (' + toUpdate.length + '):');
    console.log('');
    console.log('  ' + pad('Zamowienie', 14) + pad('EUR (centy)', 14) + pad('EUR', 12) + pad('Typ', 8) + 'Plik PDF');
    console.log('  ' + '-'.repeat(66));
    for (const r of toUpdate) {
      const eurFormatted = (r.valueInCents / 100).toFixed(2) + ' EUR';
      console.log(
        '  ' + pad(r.matchedOrderNumber || '?', 14) +
        pad(String(r.valueInCents), 14) +
        pad(eurFormatted, 12) +
        pad(r.matchType, 8) +
        r.filename
      );
    }
    console.log('');
  }

  // 6. Pokaz niedopasowane (UNKNOWN lub brak zamowienia)
  const unknownOrNoMatch = results.filter(
    (r) => r.action === 'skip_no_match' && r.parsedOrderNumber !== 'ERROR' && r.valueNetto > 0
  );
  if (unknownOrNoMatch.length > 0) {
    console.log('');
    console.log('NIEDOPASOWANE PDF z wartoscia EUR (' + unknownOrNoMatch.length + '):');
    console.log('');
    console.log('  ' + pad('Wyciagniety nr', 14) + pad('EUR', 12) + 'Plik PDF');
    console.log('  ' + '-'.repeat(60));
    for (const r of unknownOrNoMatch.slice(0, 40)) {
      const eurFormatted = r.valueNetto.toFixed(2) + ' EUR';
      console.log('  ' + pad(r.parsedOrderNumber, 14) + pad(eurFormatted, 12) + r.filename);
    }
    if (unknownOrNoMatch.length > 40) {
      console.log('  ... i ' + (unknownOrNoMatch.length - 40) + ' wiecej');
    }
    console.log('');
  }

  // 7. APPLY mode - zapisz do bazy
  if (APPLY_MODE && toUpdate.length > 0) {
    console.log('');
    console.log('ZAPISUJE ' + toUpdate.length + ' aktualizacji do bazy...');
    console.log('');
    let updated = 0;
    let failed = 0;

    for (const r of toUpdate) {
      if (!r.matchedOrderId || r.valueInCents <= 0) continue;
      try {
        await prisma.order.update({
          where: { id: r.matchedOrderId },
          data: {
            valueEur: r.valueInCents,
            windowsNetValue: r.valueInCents,
          },
        });
        updated++;
        console.log('  OK ' + r.matchedOrderNumber + ': valueEur = ' + r.valueInCents + ' (' + (r.valueInCents / 100).toFixed(2) + ' EUR)');
      } catch (err) {
        failed++;
        console.log('  FAIL ' + r.matchedOrderNumber + ': ' + (err instanceof Error ? err.message : 'blad'));
      }
    }

    console.log('');
    console.log('Zaktualizowano: ' + updated + ', Bledy: ' + failed);
  } else if (toUpdate.length > 0) {
    console.log('Aby zastosowac zmiany, uruchom ponownie z flaga --apply');
    console.log('  pnpm --filter @markbud/api tsx scripts/rescan-archive.ts --apply');
    console.log('');
  }

  // 8. Podsumowanie
  const stillMissing = ordersWithoutEur.length - toUpdate.length;
  console.log('');
  console.log('Po aktualizacji:');
  console.log('  Naprawione: ' + toUpdate.length + ' zamowien');
  console.log('  Nadal bez EUR: ' + stillMissing + ' zamowien (brak PDF w archiwum)');
}

main()
  .catch((error) => {
    console.error('Blad:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
