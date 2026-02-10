/**
 * Script: verify-price-matches.cjs
 *
 * Weryfikuje czy skrypt fix-missing-prices-from-archive.cjs
 * poprawnie dopasował PDF-y do zleceń.
 *
 * Dla każdego "FIXED" wpisu z raportu:
 * 1. Re-parsuje PDF z archiwum
 * 2. Wyciąga numer zlecenia z WNĘTRZA PDF-a
 * 3. Porównuje z docelowym zleceniem
 * 4. Raportuje rozbieżności
 *
 * Użycie: node scripts/verify-price-matches.cjs
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const prisma = new PrismaClient();
const ARCHIVE_PATH = 'C:/DEV_DATA/ceny/_archiwum';
const REPORT_PATH = path.join(__dirname, 'fix-missing-prices-report.json');

/**
 * Wyciąga numer zlecenia Akrobud z tekstu PDF (kopia z fix skryptu)
 */
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
 */
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

async function parsePdfFile(filepath, filename) {
  try {
    const dataBuffer = await fs.promises.readFile(filepath);
    const data = await pdf(dataBuffer);
    return { text: data.text, success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function verify() {
  console.log('=== WERYFIKACJA DOPASOWAŃ PDF → ZLECENIE ===\n');

  // Wczytaj raport
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
  const fixedEntries = report.filter(r => r.status === 'FIXED');
  console.log(`Znaleziono ${fixedEntries.length} wpisów FIXED do zweryfikowania\n`);

  const mismatches = [];
  const matches = [];
  const errors = [];
  const noOrderInPdf = [];

  for (const entry of fixedEntries) {
    const pdfPath = path.join(ARCHIVE_PATH, entry.file);

    if (!fs.existsSync(pdfPath)) {
      errors.push({ ...entry, reason: 'PDF nie istnieje w archiwum' });
      continue;
    }

    const parsed = await parsePdfFile(pdfPath, entry.file);
    if (!parsed.success) {
      errors.push({ ...entry, reason: `Błąd parsowania: ${parsed.error}` });
      continue;
    }

    const pdfOrderNumber = extractAkrobudOrderNumber(parsed.text, entry.file);
    const targetBaseNum = entry.order.replace(/-[a-z]$/i, '');

    // Weryfikacja wartości
    const pdfValue = extractSumaNetto(parsed.text);

    if (!pdfOrderNumber) {
      noOrderInPdf.push({
        targetOrder: entry.order,
        file: entry.file,
        assignedValue: entry.value,
        reparsedValue: pdfValue,
        valueMatch: Math.abs(pdfValue - entry.value) < 1
      });
      continue;
    }

    if (pdfOrderNumber !== targetBaseNum) {
      // Sprawdź też z bazy - czy zlecenie o tym numerze w ogóle istnieje
      const actualOrder = await prisma.order.findFirst({
        where: { orderNumber: { startsWith: pdfOrderNumber } },
        select: { id: true, orderNumber: true, valueEur: true, valuePln: true }
      });

      mismatches.push({
        targetOrder: entry.order,
        pdfOrderNumber: pdfOrderNumber,
        file: entry.file,
        assignedValue: entry.value,
        reparsedValue: pdfValue,
        actualOrderExists: !!actualOrder,
        actualOrderNumber: actualOrder?.orderNumber || null,
        actualOrderHasPrice: actualOrder ? !!(actualOrder.valueEur || actualOrder.valuePln) : false
      });
    } else {
      matches.push({
        order: entry.order,
        file: entry.file,
        value: entry.value,
        reparsedValue: pdfValue,
        valueMatch: Math.abs(pdfValue - entry.value) < 1
      });
    }
  }

  // Raport
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 WYNIKI WERYFIKACJI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Poprawne dopasowania: ${matches.length}`);
  console.log(`❌ BŁĘDNE dopasowania (inny nr zlecenia w PDF): ${mismatches.length}`);
  console.log(`⚠️  Brak nr zlecenia w PDF (nie można zweryfikować): ${noOrderInPdf.length}`);
  console.log(`🔧 Błędy parsowania/brak pliku: ${errors.length}`);
  console.log('');

  if (mismatches.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ BŁĘDNE DOPASOWANIA (KRYTYCZNE!)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const m of mismatches) {
      console.log(`\n  Zlecenie docelowe: ${m.targetOrder}`);
      console.log(`  PDF plik:          ${m.file}`);
      console.log(`  Nr zlecenia w PDF: ${m.pdfOrderNumber} ← INNE!`);
      console.log(`  Przypisana wartość: ${m.assignedValue} EUR`);
      console.log(`  Re-parsowana wart.: ${m.reparsedValue} EUR`);
      if (m.actualOrderExists) {
        console.log(`  Zlecenie ${m.pdfOrderNumber} istnieje: ${m.actualOrderNumber} (ma cenę: ${m.actualOrderHasPrice})`);
      }
    }
    console.log('');
  }

  if (noOrderInPdf.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  BRAK NR ZLECENIA W PDF (nie można zweryfikować)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const n of noOrderInPdf) {
      console.log(`  ${n.targetOrder} ← ${n.file} (${n.assignedValue} EUR, wartość OK: ${n.valueMatch})`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 BŁĘDY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const e of errors) {
      console.log(`  ${e.order} ← ${e.file}: ${e.reason}`);
    }
    console.log('');
  }

  // Sprawdź aktualne wartości w bazie vs raport
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 AKTUALNY STAN W BAZIE DLA BŁĘDNYCH DOPASOWAŃ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const m of mismatches) {
    const order = await prisma.order.findFirst({
      where: { orderNumber: m.targetOrder },
      select: { id: true, orderNumber: true, valueEur: true, valuePln: true, project: true }
    });
    if (order) {
      const eurZloty = order.valueEur ? (order.valueEur / 100).toFixed(2) : 'brak';
      const plnZloty = order.valuePln ? (order.valuePln / 100).toFixed(2) : 'brak';
      console.log(`  ${order.orderNumber}: EUR=${eurZloty}, PLN=${plnZloty}, projekt=${order.project || 'brak'}`);
    } else {
      console.log(`  ${m.targetOrder}: NIE ZNALEZIONO W BAZIE`);
    }
  }

  // Zapisz pełny raport
  const verificationReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: fixedEntries.length,
      correct: matches.length,
      mismatched: mismatches.length,
      unverifiable: noOrderInPdf.length,
      errors: errors.length
    },
    mismatches,
    noOrderInPdf,
    matches,
    errors
  };

  const outputPath = path.join(__dirname, 'verify-price-matches-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(verificationReport, null, 2));
  console.log(`\n📄 Pełny raport zapisany do: ${outputPath}`);

  await prisma.$disconnect();
}

verify().catch(e => {
  console.error('Błąd:', e);
  prisma.$disconnect();
});
