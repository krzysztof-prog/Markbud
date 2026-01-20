/**
 * Skrypt do reimportu cen z archiwum dla zleceń z valueEur=0
 *
 * Użycie: npx tsx scripts/reimport-prices-from-archive.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const prisma = new PrismaClient();

const ARCHIVE_PATH = 'C:\\DEV_DATA\\ceny\\_archiwum';

interface ParsedPdfCeny {
  orderNumber: string;
  currency: 'EUR' | 'PLN';
  valueNetto: number;
  valueBrutto: number;
}

/**
 * Parsuje liczbę z formatu polskiego (przecinek jako separator dziesiętny)
 */
function parseNumber(str: string): number {
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Wyciąga numer zlecenia z tekstu PDF
 */
function extractOrderNumber(text: string): string {
  // Wzorzec 1: "SUMA: ... 5-cyfrowy"
  const orderNumberMatch = text.match(/SUMA:.*?(\d{5})/s) || text.match(/(\d{5})\s*ZAMÓWIENIE/);
  if (orderNumberMatch) {
    return orderNumberMatch[1];
  }

  // Szukaj 5-cyfrowego numeru na początku tekstu
  const lines = text.split('\n');
  for (const line of lines.slice(0, 20)) {
    const match = line.match(/^\s*(\d{5})\s*$/);
    if (match) {
      return match[1];
    }
  }

  // Alternatywnie szukaj wzorca "5XXXX"
  const fiveDigitMatch = text.match(/\b(5\d{4})\b/);
  if (fiveDigitMatch) {
    return fiveDigitMatch[1];
  }

  return 'UNKNOWN';
}

/**
 * Wyciąga sumę netto z tekstu PDF
 */
function extractSumaNetto(text: string): number {
  // Wzorzec 1: Wiersz "Towar" - format PLN
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (towarMatch) {
    return parseNumber(towarMatch[1]);
  }

  // Wzorzec 2: Format EUR z Podsumowania - "1 399,74\n1 138,00261,74\n23%"
  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  if (eurPodsumowanieMatch) {
    return parseNumber(eurPodsumowanieMatch[2]);
  }

  // Wzorzec 3: Format z EUR - "Suma    1 147,00    263,81    1 410,81"
  const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (sumaEurMatch) {
    return parseNumber(sumaEurMatch[1]);
  }

  // Wzorzec 4: "Suma netto" bezpośrednio z wartością
  const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
  if (nettoMatch) {
    return parseNumber(nettoMatch[1]);
  }

  // Wzorzec 5: Sklejone wartości - "575,64\n468,00107,64"
  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  if (sklejoneMatch) {
    return parseNumber(sklejoneMatch[2]);
  }

  return 0;
}

/**
 * Wyciąga sumę brutto z tekstu PDF
 */
function extractSumaBrutto(text: string): number {
  // Wzorzec 1: Wiersz "Towar" z brutto w następnej linii - format PLN
  const towarMatch = text.match(/Towar\s*[\d\s]+[,.]\d{2}\s+[\d\s]+[,.]\d{2}\s*\n\s*([\d\s]+[,.]\d{2})/i);
  if (towarMatch) {
    return parseNumber(towarMatch[1]);
  }

  // Wzorzec 2: Format EUR z Podsumowania - "1 399,74\n1 138,00261,74\n23%"
  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  if (eurPodsumowanieMatch) {
    return parseNumber(eurPodsumowanieMatch[1]);
  }

  // Wzorzec 3: Format z EUR - "Suma    1 147,00    263,81    1 410,81"
  const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (sumaEurMatch) {
    return parseNumber(sumaEurMatch[3]);
  }

  // Wzorzec 4: Sklejone wartości - "575,64\n468,00107,64"
  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  if (sklejoneMatch) {
    return parseNumber(sklejoneMatch[1]);
  }

  // Wzorzec 5: "brutto" z wartością
  const bruttoMatch = text.match(/brutto[:\s]*([\d\s,.]+)/i);
  if (bruttoMatch) {
    return parseNumber(bruttoMatch[1]);
  }

  return 0;
}

/**
 * Parsuje plik PDF z ceną
 */
async function parsePdf(filepath: string): Promise<ParsedPdfCeny | null> {
  try {
    const dataBuffer = await fs.promises.readFile(filepath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const orderNumber = extractOrderNumber(text);
    const isEur = text.includes('€') || text.includes('EUR');
    const currency: 'EUR' | 'PLN' = isEur ? 'EUR' : 'PLN';
    const valueNetto = extractSumaNetto(text);
    const valueBrutto = extractSumaBrutto(text);

    return {
      orderNumber,
      currency,
      valueNetto,
      valueBrutto,
    };
  } catch (error) {
    console.error(`Błąd parsowania ${filepath}:`, error);
    return null;
  }
}

async function main() {
  console.log('=== Reimport cen z archiwum ===\n');

  // 1. Znajdź WSZYSTKIE zlecenia (do mapowania)
  const allOrders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      valueEur: true,
      valuePln: true,
    },
  });

  // Mapa: orderNumber -> order
  const orderMap = new Map(allOrders.map(o => [o.orderNumber, o]));
  console.log(`Załadowano ${allOrders.length} zleceń z bazy\n`);

  // 2. Pobierz listę plików PDF z archiwum
  const archiveFiles = fs.readdirSync(ARCHIVE_PATH)
    .filter(f => f.toLowerCase().endsWith('.pdf'));

  console.log(`Znaleziono ${archiveFiles.length} plików PDF w archiwum\n`);

  // 3. Przetwórz KAŻDY PDF i sprawdź czy pasuje do zlecenia z valueEur=0
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let noOrder = 0;

  for (const file of archiveFiles) {
    const filepath = path.join(ARCHIVE_PATH, file);

    const parsed = await parsePdf(filepath);

    if (!parsed) {
      console.log(`⚠️ Błąd parsowania: ${file}`);
      failed++;
      continue;
    }

    if (parsed.orderNumber === 'UNKNOWN') {
      console.log(`⚠️ Nie znaleziono numeru zlecenia w: ${file}`);
      failed++;
      continue;
    }

    // Znajdź zlecenie w bazie
    const order = orderMap.get(parsed.orderNumber);

    if (!order) {
      // Spróbuj też bez myślnika (np. 53670-b -> 53670)
      const baseNumber = parsed.orderNumber.split('-')[0];
      const orderByBase = orderMap.get(baseNumber);
      if (!orderByBase) {
        console.log(`❓ Brak zlecenia ${parsed.orderNumber} w bazie: ${file}`);
        noOrder++;
        continue;
      }
    }

    const targetOrder = order || orderMap.get(parsed.orderNumber.split('-')[0])!;

    // Sprawdź czy zlecenie ma już cenę
    const hasEurPrice = targetOrder.valueEur !== null && targetOrder.valueEur > 0;
    const hasPlnPrice = targetOrder.valuePln !== null && targetOrder.valuePln > 0;

    if (parsed.currency === 'EUR' && hasEurPrice) {
      // Już ma cenę EUR, pomiń
      skipped++;
      continue;
    }

    if (parsed.currency === 'PLN' && hasPlnPrice) {
      // Już ma cenę PLN, pomiń
      skipped++;
      continue;
    }

    if (parsed.valueNetto === 0) {
      console.log(`⚠️ Parsed netto = 0: ${file}`);
      failed++;
      continue;
    }

    // Wartości w bazie są w groszach/centach
    const valueInSmallestUnit = Math.round(parsed.valueNetto * 100);

    // Aktualizuj zlecenie
    await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        ...(parsed.currency === 'EUR'
          ? { valueEur: valueInSmallestUnit }
          : { valuePln: valueInSmallestUnit }
        ),
      },
    });

    console.log(`✅ ${targetOrder.orderNumber}: ${parsed.currency} ${parsed.valueNetto} (z ${file})`);
    updated++;
  }

  console.log('\n=== Podsumowanie ===');
  console.log(`Zaktualizowano: ${updated}`);
  console.log(`Pominięto (już ma cenę): ${skipped}`);
  console.log(`Brak zlecenia w bazie: ${noOrder}`);
  console.log(`Błędy parsowania: ${failed}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
