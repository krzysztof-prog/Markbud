/**
 * Script: fix-missing-prices-from-archive.cjs
 *
 * Naprawia brakujące ceny dla wyprodukowanych zleceń przez:
 * 1. Znalezienie zleceń bez ceny
 * 2. Wyszukanie pasujących PDF-ów w archiwum (po numerze lub projekcie)
 * 3. Re-parsowanie PDF-ów i przypisanie cen
 *
 * Użycie: node scripts/fix-missing-prices-from-archive.cjs [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// Konfiguracja
const ARCHIVE_PATH = 'C:/DEV_DATA/ceny/_archiwum';

/**
 * Wyciąga numer zlecenia Akrobud (5-cyfrowy) z tekstu PDF
 * Kopia logiki z pdf-parser.ts
 */
function extractAkrobudOrderNumber(text, filename) {
  // Strategia 1: Po "SUMA:" (format Schuco/POLY)
  const sumaMatch = text.match(/SUMA:.*?(\d{5})/s);
  if (sumaMatch) return sumaMatch[1];

  // Strategia 2: 5 cyfr + ZAMÓWIENIE (format Schuco)
  const beforeZamMatch = text.match(/(\d{5})\s*ZAMÓWIENIE/);
  if (beforeZamMatch) return beforeZamMatch[1];

  // Strategia 3: 5-cyfrowy numer na osobnej linii (w pierwszych 40 liniach)
  const lines = text.split('\n');
  for (const line of lines.slice(0, 40)) {
    const match = line.match(/^\s*(\d{5})\s*$/);
    if (match) return match[1];
  }

  // Strategia 4: Dokładnie 5-cyfrowy numer w zakresie 40000-99999
  const allFiveDigit = text.match(/(?<!\d)(\d{5})(?!\d)/g);
  if (allFiveDigit) {
    for (const num of allFiveDigit) {
      const n = parseInt(num);
      if (n >= 40000 && n <= 99999) return num;
    }
  }

  // Strategia 5: Numer zlecenia z nazwy pliku (np. "ZAM 53810.pdf")
  if (filename) {
    const zamMatch = filename.match(/ZAM\s+(\d{5})/i);
    if (zamMatch) return zamMatch[1];

    const fiveDigitMatch = filename.match(/(?<!\d)(\d{5})(?!\d)/);
    if (fiveDigitMatch) {
      const n = parseInt(fiveDigitMatch[1]);
      if (n >= 40000 && n <= 99999) return fiveDigitMatch[1];
    }
  }

  return null;
}

/**
 * Wyciąga sumę netto z tekstu PDF
 * Kopia logiki z pdf-parser.ts
 */
function extractSumaNetto(text) {
  // Wzorzec 1: Wiersz "Towar"
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (towarMatch) return parseNumber(towarMatch[1]);

  // Wzorzec 2: Format EUR z Podsumowania
  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  if (eurPodsumowanieMatch) return parseNumber(eurPodsumowanieMatch[2]);

  // Wzorzec 3: Format z EUR - "Suma    1 147,00    263,81    1 410,81"
  const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (sumaEurMatch) return parseNumber(sumaEurMatch[1]);

  // Wzorzec 4: "Suma netto"
  const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
  if (nettoMatch) return parseNumber(nettoMatch[1]);

  // Wzorzec 5: Sklejone wartości
  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  if (sklejoneMatch) return parseNumber(sklejoneMatch[2]);

  // Wzorzec 6: Trzy liczby w wierszu
  const tripleMatch = text.match(/([\d]+[,.][\\d]{2})\s+([\d]+[,.][\\d]{2})\s+([\d]+[,.][\\d]{2})/);
  if (tripleMatch) return parseNumber(tripleMatch[1]);

  return 0;
}

function parseNumber(str) {
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function detectCurrency(text) {
  const isEur = text.includes('€') || text.includes('EUR');
  return isEur ? 'EUR' : 'PLN';
}

/**
 * Parsuje PDF i zwraca dane
 */
async function parsePdfFile(filepath, filename) {
  try {
    const dataBuffer = await fs.promises.readFile(filepath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const orderNumber = extractAkrobudOrderNumber(text, filename);
    const valueNetto = extractSumaNetto(text);
    const currency = detectCurrency(text);

    return { orderNumber, valueNetto, currency, success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Główna funkcja
 */
async function fixMissingPrices() {
  console.log('=== NAPRAWA BRAKUJĄCYCH CEN ===');
  console.log('Tryb:', DRY_RUN ? 'DRY RUN (bez zmian)' : 'LIVE (zmiany będą zapisane!)');
  console.log('');

  // 1. Znajdź zlecenia bez ceny
  const ordersWithoutPrice = await prisma.order.findMany({
    where: {
      productionDate: { not: null },
      valuePln: null,
      valueEur: null,
      deletedAt: null
    },
    select: {
      id: true,
      orderNumber: true,
      project: true,
      productionDate: true
    },
    orderBy: { productionDate: 'desc' }
  });

  console.log(`Znaleziono ${ordersWithoutPrice.length} zleceń bez ceny`);

  // 2. Wczytaj listę PDF-ów z archiwum
  let pdfFiles = [];
  try {
    pdfFiles = fs.readdirSync(ARCHIVE_PATH).filter(f => f.toLowerCase().endsWith('.pdf'));
    console.log(`Znaleziono ${pdfFiles.length} plików PDF w archiwum`);
  } catch (e) {
    console.error('Błąd odczytu archiwum:', e.message);
    return;
  }

  console.log('');

  let fixed = 0;
  let notFound = 0;
  let parseErrors = 0;
  let alreadyHasPrice = 0;

  const results = [];

  // 3. Dla każdego zlecenia bez ceny
  for (const order of ordersWithoutPrice) {
    const baseNum = order.orderNumber.replace(/-[a-z]$/i, '');
    const project = order.project || '';

    // Szukaj pasującego PDF po numerze zlecenia lub projekcie
    const matchingFiles = pdfFiles.filter(f => {
      const fname = f.toLowerCase();
      const fnameNormalized = f.replace(/\s+/g, '');

      // Dopasowanie po numerze zlecenia
      if (fname.includes(baseNum) || fnameNormalized.includes(baseNum)) return true;

      // Dopasowanie po projekcie (np. D5486)
      if (project && fname.includes(project.toLowerCase())) return true;

      return false;
    });

    if (matchingFiles.length === 0) {
      notFound++;
      continue;
    }

    // Parsuj pierwszy pasujący PDF
    const pdfFilename = matchingFiles[0];
    const pdfPath = path.join(ARCHIVE_PATH, pdfFilename);
    const parsed = await parsePdfFile(pdfPath, pdfFilename);

    if (!parsed.success) {
      parseErrors++;
      results.push({
        order: order.orderNumber,
        status: 'PARSE_ERROR',
        file: pdfFilename,
        error: parsed.error
      });
      continue;
    }

    if (parsed.valueNetto === 0) {
      parseErrors++;
      results.push({
        order: order.orderNumber,
        status: 'NO_VALUE',
        file: pdfFilename
      });
      continue;
    }

    // Konwertuj do groszy/centów
    const valueInSmallestUnit = Math.round(parsed.valueNetto * 100);

    // Sprawdź czy zlecenie nadal nie ma ceny (ktoś mógł już naprawić)
    const currentOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: { valuePln: true, valueEur: true }
    });

    if (currentOrder.valuePln || currentOrder.valueEur) {
      alreadyHasPrice++;
      continue;
    }

    // Aktualizuj cenę
    if (!DRY_RUN) {
      await prisma.order.update({
        where: { id: order.id },
        data: parsed.currency === 'EUR'
          ? { valueEur: valueInSmallestUnit }
          : { valuePln: valueInSmallestUnit }
      });
    }

    fixed++;
    results.push({
      order: order.orderNumber,
      status: 'FIXED',
      file: pdfFilename,
      currency: parsed.currency,
      value: parsed.valueNetto
    });

    console.log(`✅ ${order.orderNumber} <- ${pdfFilename} (${parsed.currency} ${parsed.valueNetto})`);
  }

  // 4. Podsumowanie
  console.log('');
  console.log('=== PODSUMOWANIE ===');
  console.log(`Naprawiono: ${fixed}`);
  console.log(`Nie znaleziono PDF: ${notFound}`);
  console.log(`Błędy parsowania: ${parseErrors}`);
  console.log(`Już miały cenę: ${alreadyHasPrice}`);

  if (DRY_RUN && fixed > 0) {
    console.log('');
    console.log('⚠️  DRY RUN - żadne zmiany nie zostały zapisane.');
    console.log('    Uruchom bez --dry-run aby naprawić.');
  }

  // Zapisz szczegółowy raport
  const reportPath = 'scripts/fix-missing-prices-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log('');
  console.log(`Raport zapisany do: ${reportPath}`);

  await prisma.$disconnect();
}

fixMissingPrices().catch(e => {
  console.error('Błąd:', e);
  prisma.$disconnect();
});
