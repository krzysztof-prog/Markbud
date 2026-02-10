/**
 * Script: fix-4-mismatched-prices.cjs
 *
 * Naprawia 4 zlecenia z błędnie dopasowanymi cenami z fix-missing-prices-from-archive.cjs:
 * 1. 53668 - przypisano PDF z 53526 (1850 EUR)
 * 2. 53832 - przypisano PDF z 53632 (2592 EUR)
 * 3. 53709-a - przypisano PDF z 53545 (838 EUR)
 * 4. 53630-a - przypisano PDF z 52737 (577 EUR)
 *
 * Dla każdego:
 * - Szuka prawidłowego PDF w archiwum
 * - Parsuje i weryfikuje nr zlecenia wewnątrz PDF
 * - Aktualizuje valueEur na poprawną wartość (lub zeruje jeśli nie znaleziono)
 *
 * Użycie: node scripts/fix-4-mismatched-prices.cjs [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const ARCHIVE_PATH = 'C:/DEV_DATA/ceny/_archiwum';

// Kandydaci na poprawne PDF-y dla każdego błędnego zlecenia
const ORDERS_TO_FIX = [
  {
    orderNumber: '53630-a',
    wrongValue: 577,
    candidateFiles: ['D5667,D5668,D5669   19.01.pdf']
  },
  {
    orderNumber: '53709-a',
    wrongValue: 838,
    candidateFiles: ['D6012,D6014   23.01.pdf']
  },
  {
    orderNumber: '53668',
    wrongValue: 1850,
    candidateFiles: ['HERWAARDEN  3.02.pdf', 'D4827,D5366,D5463   8.01   II.pdf']
  },
  {
    orderNumber: '53832',
    wrongValue: 2592,
    candidateFiles: [] // Brak kandydatów - D5712,D5858 to ten sam błędny plik
  }
];

function extractAkrobudOrderNumber(text, filename) {
  const sumaMatch = text.match(/SUMA:.*?(\d{5})/s);
  if (sumaMatch) return sumaMatch[1];

  const beforeZamMatch = text.match(/(\d{5})\s*ZAMÓWIENIE/);
  if (beforeZamMatch) return beforeZamMatch[1];

  const lines = text.split('\n');
  for (const line of lines.slice(0, 40)) {
    const match = line.match(/^\s*(\d{5})\s*$/);
    if (match) return match[1];
  }

  const allFiveDigit = text.match(/(?<!\d)(\d{5})(?!\d)/g);
  if (allFiveDigit) {
    for (const num of allFiveDigit) {
      const n = parseInt(num);
      if (n >= 40000 && n <= 99999) return num;
    }
  }

  return null;
}

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

async function parsePdfFile(filepath, filename) {
  try {
    const dataBuffer = await fs.promises.readFile(filepath);
    const data = await pdf(dataBuffer);
    return { text: data.text, success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fix() {
  console.log('=== NAPRAWA 4 BŁĘDNYCH DOPASOWAŃ CEN ===');
  console.log('Tryb:', DRY_RUN ? 'DRY RUN' : 'LIVE');
  console.log('');

  for (const entry of ORDERS_TO_FIX) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 Zlecenie: ${entry.orderNumber} (błędna wartość: ${entry.wrongValue} EUR)`);

    // Znajdź zlecenie w bazie
    const order = await prisma.order.findFirst({
      where: { orderNumber: entry.orderNumber },
      select: { id: true, orderNumber: true, valueEur: true, valuePln: true, project: true }
    });

    if (!order) {
      console.log(`   ❌ Nie znaleziono w bazie!`);
      continue;
    }

    const currentEur = order.valueEur ? (order.valueEur / 100).toFixed(2) : 'brak';
    console.log(`   Stan w bazie: EUR=${currentEur}, projekt=${order.project || 'brak'}`);

    if (entry.candidateFiles.length === 0) {
      console.log(`   ⚠️  Brak kandydatów na poprawny PDF`);
      console.log(`   → Zeruję valueEur (usuwam błędną wartość)`);

      if (!DRY_RUN) {
        await prisma.order.update({
          where: { id: order.id },
          data: { valueEur: null }
        });
      }
      console.log(`   ✅ valueEur = null (trzeba ręcznie reimportować PDF)`);
      continue;
    }

    // Próbuj każdy kandydat
    let fixed = false;
    const baseNum = entry.orderNumber.replace(/-[a-z]$/i, '');

    for (const candidateFile of entry.candidateFiles) {
      const pdfPath = path.join(ARCHIVE_PATH, candidateFile);

      if (!fs.existsSync(pdfPath)) {
        console.log(`   ⚠️  Plik nie istnieje: ${candidateFile}`);
        continue;
      }

      const parsed = await parsePdfFile(pdfPath, candidateFile);
      if (!parsed.success) {
        console.log(`   ⚠️  Błąd parsowania: ${candidateFile}`);
        continue;
      }

      const pdfOrderNumber = extractAkrobudOrderNumber(parsed.text, candidateFile);
      const pdfValue = extractSumaNetto(parsed.text);
      const pdfCurrency = detectCurrency(parsed.text);

      console.log(`   📄 ${candidateFile}:`);
      console.log(`      Nr zlecenia w PDF: ${pdfOrderNumber || 'nie znaleziono'}`);
      console.log(`      Wartość netto: ${pdfValue} ${pdfCurrency}`);

      if (pdfOrderNumber === baseNum) {
        console.log(`      ✅ MATCH! Numer zgadza się z ${baseNum}`);

        const valueInCents = Math.round(pdfValue * 100);

        if (!DRY_RUN) {
          const updateData = pdfCurrency === 'EUR'
            ? { valueEur: valueInCents }
            : { valuePln: valueInCents };

          await prisma.order.update({
            where: { id: order.id },
            data: updateData
          });
        }

        console.log(`      → ${entry.wrongValue} EUR → ${pdfValue} ${pdfCurrency}`);
        fixed = true;
        break;
      } else {
        console.log(`      ❌ Nr zlecenia (${pdfOrderNumber}) nie zgadza się z ${baseNum}`);
      }
    }

    if (!fixed) {
      console.log(`   ⚠️  Nie znaleziono pasującego PDF - zeruję błędną wartość`);
      if (!DRY_RUN) {
        await prisma.order.update({
          where: { id: order.id },
          data: { valueEur: null }
        });
      }
      console.log(`   → valueEur = null (trzeba ręcznie zaimportować)`);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ GOTOWE');
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN - żadne zmiany nie zostały zapisane.');
  }

  await prisma.$disconnect();
}

fix().catch(e => {
  console.error('Błąd:', e);
  prisma.$disconnect();
});
