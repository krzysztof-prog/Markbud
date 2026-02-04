/**
 * Skrypt do testowania parsera PDF zamówień szyb (format WH-Okna)
 *
 * Użycie:
 *   npx tsx scripts/test-glass-pdf-parser.ts <ścieżka-do-pdf>
 *
 * Przykład:
 *   npx tsx scripts/test-glass-pdf-parser.ts "C:/DEV_DATA/zamowienia_szyb/53731 AKR SZPROSY.pdf"
 */

import { readFile } from 'fs/promises';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Użycie: npx tsx scripts/test-glass-pdf-parser.ts <ścieżka-do-pdf>');
    console.log('');
    console.log('Przykład:');
    console.log('  npx tsx scripts/test-glass-pdf-parser.ts "C:/sciezka/53731 AKR SZPROSY.pdf"');
    process.exit(1);
  }

  const pdfPath = args[0];
  const filename = path.basename(pdfPath);

  console.log('='.repeat(60));
  console.log('Test parsera PDF zamówień szyb');
  console.log('='.repeat(60));
  console.log(`Plik: ${pdfPath}`);
  console.log(`Nazwa: ${filename}`);
  console.log('');

  try {
    // Wczytaj plik
    console.log('1. Wczytywanie pliku PDF...');
    const buffer = await readFile(pdfPath);
    console.log(`   Rozmiar: ${buffer.length} bytes`);

    // Importuj parser
    console.log('2. Importowanie parsera...');
    const { parseGlassOrderPdf } = await import('../src/services/parsers/glass-order-pdf-parser.js');

    // Parsuj
    console.log('3. Parsowanie PDF...');
    const result = await parseGlassOrderPdf(buffer, filename);

    // Wyświetl wyniki
    console.log('');
    console.log('='.repeat(60));
    console.log('WYNIKI PARSOWANIA');
    console.log('='.repeat(60));
    console.log('');

    console.log('METADATA:');
    console.log(`  - glassOrderNumber: ${result.metadata.glassOrderNumber}`);
    console.log(`  - orderDate: ${result.metadata.orderDate.toISOString()}`);
    console.log(`  - supplier: ${result.metadata.supplier}`);
    console.log(`  - orderedBy: ${result.metadata.orderedBy || '(brak)'}`);
    console.log(`  - expectedDeliveryDate: ${result.metadata.expectedDeliveryDate.toISOString()}`);
    console.log('');

    console.log('POZYCJE:');
    if (result.items.length === 0) {
      console.log('  (brak pozycji - sprawdź format PDF!)');
    } else {
      for (const item of result.items) {
        console.log(`  [${item.position}] ${item.glassType}`);
        console.log(`      Wymiary: ${item.widthMm} x ${item.heightMm} mm`);
        console.log(`      Ilość: ${item.quantity}`);
        console.log(`      Order: ${item.orderNumber}`);
        console.log(`      Ref: ${item.fullReference}`);
        console.log('');
      }
    }

    console.log('PODSUMOWANIE:');
    console.log(`  - Liczba pozycji: ${result.summary.totalItems}`);
    console.log(`  - Łączna ilość: ${result.summary.totalQuantity}`);
    console.log(`  - Zlecenia: ${Object.keys(result.summary.orderBreakdown).join(', ')}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('PARSOWANIE ZAKOŃCZONE SUKCESEM');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('BŁĄD PARSOWANIA:');
    console.error(error instanceof Error ? error.message : error);
    console.error('');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
