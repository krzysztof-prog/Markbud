/**
 * Skrypt do ponownego dopasowania cen z zarchiwizowanych PDF-ów
 * do zamówień które nie mają przypisanej ceny.
 *
 * Bezpieczny - tylko dodaje ceny, nie nadpisuje istniejących.
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ARCHIVE_PATH = 'C:/DEV_DATA/ceny/_archiwum';

// Funkcje konwersji walut (z money.ts)
function eurToCenty(eur) {
  return Math.round(eur * 100);
}

function plnToGrosze(pln) {
  return Math.round(pln * 100);
}

/**
 * Parsuje liczbę z formatu polskiego (przecinek jako separator dziesiętny)
 */
function parseNumber(str) {
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Wyciąga numer zlecenia Akrobud z tekstu PDF
 * Obsługuje zarówno 5-cyfrowe numery jak i numery z sufiksami (np. 53738-a)
 *
 * WAŻNE: Numer zamówienia Akrobud to 5-cyfrowy numer z zakresu 50000-59999
 * lub numer z sufiksem literowym (np. 53738-a)
 */
function extractOrderNumber(text, filename) {
  // Strategia 1: Szukaj numeru z sufiksem (np. 53738-a, 53738-b) - NAJWAŻNIEJSZE
  // PDF często zawiera pełny numer z sufiksem na osobnej linii
  const suffixMatch = text.match(/\b(5\d{4}-[a-z])\b/i);
  if (suffixMatch) {
    return suffixMatch[1].toLowerCase(); // Normalizuj do lowercase
  }

  // Strategia 2: Szukaj 5-cyfrowego numeru z zakresu Akrobud (50000-59999)
  // To jest bardziej niezawodne niż wzorzec ZAMÓWIENIE który łapie NIP
  const fiveDigitMatches = text.match(/\b(5\d{4})\b/g);
  if (fiveDigitMatches) {
    for (const match of fiveDigitMatches) {
      const n = parseInt(match);
      // Zakres numerów zamówień Akrobud: 50000-59999
      // Wykluczamy numery które wyglądają jak NIP (zaczynające się od 529...)
      if (n >= 53000 && n <= 59999) {
        return match;
      }
    }
    // Jeśli nie znaleziono w głównym zakresie, sprawdź szerszy zakres
    for (const match of fiveDigitMatches) {
      const n = parseInt(match);
      if (n >= 50000 && n <= 52999) {
        return match;
      }
    }
  }

  // Strategia 3: Szukaj "Oferta nr" z numerem
  const ofertaMatch = text.match(/Oferta\s*nr\s*(\d{5})/i);
  if (ofertaMatch) {
    const n = parseInt(ofertaMatch[1]);
    if (n >= 50000 && n <= 59999) {
      return ofertaMatch[1];
    }
  }

  // Strategia 4: Szukaj w nazwie pliku
  const filenameMatch = filename.match(/(\d{5})/);
  if (filenameMatch) {
    const n = parseInt(filenameMatch[1]);
    if (n >= 50000 && n <= 59999) {
      return filenameMatch[1];
    }
  }

  return null;
}

/**
 * Wyciąga walutę z tekstu PDF
 */
function extractCurrency(text) {
  const isEur = text.includes('€') || text.includes('EUR');
  return isEur ? 'EUR' : 'PLN';
}

/**
 * Wyciąga sumę netto z tekstu PDF
 */
function extractSumaNetto(text) {
  // Wzorzec 1: Wiersz "Towar" - format PLN
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (towarMatch) {
    return parseNumber(towarMatch[1]);
  }

  // Wzorzec 2: Format EUR z Podsumowania - sklejone wartości
  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  if (eurPodsumowanieMatch) {
    return parseNumber(eurPodsumowanieMatch[2]);
  }

  // Wzorzec 3: "Suma" z trzema wartościami (netto, VAT, brutto)
  const sumaMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (sumaMatch) {
    return parseNumber(sumaMatch[1]);
  }

  // Wzorzec 4: Sklejone wartości
  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  if (sklejoneMatch) {
    return parseNumber(sklejoneMatch[2]);
  }

  return 0;
}

/**
 * Parsuje plik PDF i zwraca dane
 */
async function parsePdf(filepath, filename) {
  try {
    const dataBuffer = await fs.promises.readFile(filepath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const orderNumber = extractOrderNumber(text, filename);
    if (!orderNumber) return null;

    const currency = extractCurrency(text);
    const valueNetto = extractSumaNetto(text);

    if (valueNetto <= 0) return null;

    return {
      orderNumber,
      currency,
      valueNetto,
      filename
    };
  } catch (error) {
    console.error(`  Błąd parsowania ${filename}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('=== REMATCH ARCHIVED PRICES ===\n');

  // 1. Pobierz zamówienia bez ceny
  const ordersWithoutPrice = await prisma.order.findMany({
    where: {
      valueEur: null,
      valuePln: null,
      deletedAt: null,
      archivedAt: null
    },
    select: { id: true, orderNumber: true }
  });

  const orderNumbersWithoutPrice = new Set(ordersWithoutPrice.map(o => o.orderNumber));
  const orderMap = new Map(ordersWithoutPrice.map(o => [o.orderNumber, o.id]));

  console.log(`Zamówienia bez ceny: ${ordersWithoutPrice.length}`);

  // 2. Przeskanuj pliki PDF w archiwum
  const files = fs.readdirSync(ARCHIVE_PATH).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`Pliki PDF w archiwum: ${files.length}\n`);

  const matches = [];
  const errors = [];

  for (const filename of files) {
    const filepath = path.join(ARCHIVE_PATH, filename);
    const parsed = await parsePdf(filepath, filename);

    if (!parsed) continue;

    // Sprawdź czy zamówienie istnieje i nie ma ceny
    // Próbuj też prefix match (np. 53748 dla 53748-a)
    let matchedOrderNumber = null;
    let matchedOrderId = null;

    // Exact match
    if (orderNumbersWithoutPrice.has(parsed.orderNumber)) {
      matchedOrderNumber = parsed.orderNumber;
      matchedOrderId = orderMap.get(parsed.orderNumber);
    } else {
      // Prefix match - szukaj zamówień z sufixem
      for (const [orderNum, orderId] of orderMap.entries()) {
        if (orderNum.startsWith(parsed.orderNumber + '-')) {
          matchedOrderNumber = orderNum;
          matchedOrderId = orderId;
          break;
        }
      }
    }

    if (matchedOrderId) {
      matches.push({
        ...parsed,
        matchedOrderNumber,
        matchedOrderId
      });
    }
  }

  console.log(`Znalezione dopasowania: ${matches.length}\n`);

  if (matches.length === 0) {
    console.log('Brak zamówień do aktualizacji.');
    await prisma.$disconnect();
    return;
  }

  // 3. Wyświetl dopasowania
  console.log('=== DOPASOWANIA ===');
  for (const m of matches) {
    console.log(`  ${m.filename}`);
    console.log(`    -> Zamówienie: ${m.matchedOrderNumber} (id: ${m.matchedOrderId})`);
    console.log(`    -> ${m.currency} ${m.valueNetto.toFixed(2)} netto`);
    console.log(`    -> W centach/groszach: ${m.currency === 'EUR' ? eurToCenty(m.valueNetto) : plnToGrosze(m.valueNetto)}`);
    console.log('');
  }

  // 4. Aktualizuj zamówienia
  console.log('=== AKTUALIZACJA ZAMÓWIEŃ ===\n');

  let updated = 0;
  let failed = 0;

  for (const m of matches) {
    try {
      const valueInSmallestUnit = m.currency === 'EUR'
        ? eurToCenty(m.valueNetto)
        : plnToGrosze(m.valueNetto);

      await prisma.order.update({
        where: { id: m.matchedOrderId },
        data: m.currency === 'EUR'
          ? { valueEur: valueInSmallestUnit }
          : { valuePln: valueInSmallestUnit }
      });

      console.log(`✓ ${m.matchedOrderNumber}: ${m.currency} ${m.valueNetto.toFixed(2)} (${valueInSmallestUnit} centów/groszy)`);
      updated++;
    } catch (error) {
      console.error(`✗ ${m.matchedOrderNumber}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n=== PODSUMOWANIE ===');
  console.log(`Zaktualizowano: ${updated}`);
  console.log(`Błędów: ${failed}`);

  await prisma.$disconnect();
}

main().catch(console.error);
