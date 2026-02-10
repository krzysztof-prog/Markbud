/**
 * Script: fix-4-orders-complete.cjs
 *
 * Kompletna naprawa 4 zleceń z błędnymi cenami:
 * 1. Naprawia cenę dla 53832 (jedyne bez PDF-a z poprzedniego fixu)
 * 2. Tworzy rekordy FileImport dla wszystkich 4 zleceń (aby "Brak PDF" zniknęło)
 *
 * Użycie: node scripts/fix-4-orders-complete.cjs [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const ARCHIVE_PATH = 'C:/DEV_DATA/ceny/_archiwum';

// Mapowanie: zlecenie → prawidłowy PDF w archiwum
const ORDER_PDF_MAP = [
  { orderNumber: '53630-a', file: 'D5667,D5668,D5669   19.01.pdf', alreadyFixed: true },
  { orderNumber: '53709-a', file: 'D6012,D6014   23.01.pdf', alreadyFixed: true },
  { orderNumber: '53668',   file: 'HERWAARDEN  3.02.pdf', alreadyFixed: true },
  { orderNumber: '53832',   file: 'D585  RAMA  30.01.pdf', alreadyFixed: false },  // cena jeszcze nie naprawiona
];

function extractSumaNetto(text) {
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (towarMatch) return parseNumber(towarMatch[1]);

  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  if (eurPodsumowanieMatch) return parseNumber(eurPodsumowanieMatch[2]);

  const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (sumaEurMatch) return parseNumber(sumaEurMatch[1]);

  const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
  if (nettoMatch) return parseNumber(nettoMatch[1]);

  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  if (sklejoneMatch) return parseNumber(sklejoneMatch[2]);

  return 0;
}

function parseNumber(str) {
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function detectCurrency(text) {
  return (text.includes('€') || text.includes('EUR')) ? 'EUR' : 'PLN';
}

async function fix() {
  console.log('=== KOMPLETNA NAPRAWA 4 ZLECEŃ ===');
  console.log('Tryb:', DRY_RUN ? 'DRY RUN' : 'LIVE');
  console.log('');

  for (const entry of ORDER_PDF_MAP) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 Zlecenie: ${entry.orderNumber}`);

    // Znajdź zlecenie w bazie
    const order = await prisma.order.findFirst({
      where: { orderNumber: entry.orderNumber },
      select: { id: true, orderNumber: true, valueEur: true, valuePln: true }
    });

    if (!order) {
      console.log(`   ❌ Nie znaleziono w bazie!`);
      continue;
    }

    const pdfPath = path.join(ARCHIVE_PATH, entry.file);
    if (!fs.existsSync(pdfPath)) {
      console.log(`   ❌ PDF nie istnieje: ${entry.file}`);
      continue;
    }

    // === KROK 1: Naprawa ceny (tylko dla 53832) ===
    if (!entry.alreadyFixed) {
      console.log(`   📄 Parsowanie: ${entry.file}`);
      const dataBuffer = await fs.promises.readFile(pdfPath);
      const data = await pdf(dataBuffer);
      const valueNetto = extractSumaNetto(data.text);
      const currency = detectCurrency(data.text);
      const valueInCents = Math.round(valueNetto * 100);

      console.log(`   💰 Wartość: ${valueNetto} ${currency}`);

      if (valueNetto > 0 && !DRY_RUN) {
        const updateData = currency === 'EUR'
          ? { valueEur: valueInCents }
          : { valuePln: valueInCents };
        await prisma.order.update({
          where: { id: order.id },
          data: updateData
        });
        console.log(`   ✅ Cena zaktualizowana: ${valueNetto} ${currency}`);
      }
    } else {
      const eurVal = order.valueEur ? (order.valueEur / 100).toFixed(2) : 'brak';
      console.log(`   💰 Cena już naprawiona: ${eurVal} EUR`);
    }

    // === KROK 2: Tworzenie rekordu FileImport ===
    // Sprawdź czy już istnieje FileImport z orderId
    const existingImport = await prisma.fileImport.findFirst({
      where: {
        fileType: 'ceny_pdf',
        status: 'completed',
        metadata: { contains: `"orderId":${order.id}` }
      }
    });

    if (existingImport) {
      console.log(`   📁 FileImport już istnieje (id: ${existingImport.id})`);
      continue;
    }

    // Metadane w formacie zgodnym z CenyProcessor
    const metadata = JSON.stringify({
      orderId: order.id,
      orderNumber: entry.orderNumber,
      autoImported: true,
      manualFix: true,
      fixDate: new Date().toISOString(),
      parsed: {
        orderNumber: entry.orderNumber.replace(/-[a-z]$/i, ''),
        currency: 'EUR'
      }
    });

    if (!DRY_RUN) {
      const fileImport = await prisma.fileImport.create({
        data: {
          filename: entry.file,
          filepath: pdfPath,
          fileType: 'ceny_pdf',
          status: 'completed',
          processedAt: new Date(),
          metadata: metadata
        }
      });
      console.log(`   ✅ FileImport stworzony (id: ${fileImport.id})`);
    } else {
      console.log(`   📁 [DRY RUN] Stworzę FileImport: ${entry.file}`);
    }
  }

  // Weryfikacja końcowa
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 WERYFIKACJA KOŃCOWA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const entry of ORDER_PDF_MAP) {
    const order = await prisma.order.findFirst({
      where: { orderNumber: entry.orderNumber },
      select: { id: true, orderNumber: true, valueEur: true, valuePln: true }
    });

    if (!order) continue;

    const hasImport = await prisma.fileImport.findFirst({
      where: {
        fileType: 'ceny_pdf',
        status: 'completed',
        metadata: { contains: `"orderId":${order.id}` }
      }
    });

    const eurVal = order.valueEur ? (order.valueEur / 100).toFixed(2) : 'brak';
    const plnVal = order.valuePln ? (order.valuePln / 100).toFixed(2) : 'brak';
    const pdfStatus = hasImport ? '✅ PDF' : '❌ Brak PDF';

    console.log(`  ${order.orderNumber}: EUR=${eurVal}, PLN=${plnVal} | ${pdfStatus}`);
  }

  console.log('');
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN - żadne zmiany nie zostały zapisane.');
  } else {
    console.log('✅ GOTOWE - wszystkie 4 zlecenia naprawione!');
  }

  await prisma.$disconnect();
}

fix().catch(e => {
  console.error('Błąd:', e);
  prisma.$disconnect();
});
