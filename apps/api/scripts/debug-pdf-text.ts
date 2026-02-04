/**
 * Skrypt do debugowania - pokazuje surowy tekst z PDF
 *
 * Użycie:
 *   npx tsx scripts/debug-pdf-text.ts <ścieżka-do-pdf>
 */

import { readFile } from 'fs/promises';
import pdf from 'pdf-parse';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Użycie: npx tsx scripts/debug-pdf-text.ts <ścieżka-do-pdf>');
    process.exit(1);
  }

  const pdfPath = args[0];

  console.log('='.repeat(80));
  console.log('DEBUG - Surowy tekst z PDF');
  console.log('='.repeat(80));
  console.log(`Plik: ${pdfPath}`);
  console.log('');

  try {
    const buffer = await readFile(pdfPath);
    const pdfData = await pdf(buffer);

    console.log('INFO:');
    console.log(`  - Liczba stron: ${pdfData.numpages}`);
    console.log(`  - Liczba znaków: ${pdfData.text.length}`);
    console.log('');

    console.log('='.repeat(80));
    console.log('SUROWY TEKST (z numerami linii):');
    console.log('='.repeat(80));

    const lines = pdfData.text.split('\n');
    lines.forEach((line, index) => {
      // Pokaż linię z numerem i wizualizacją białych znaków
      const displayLine = line
        .replace(/\t/g, '→TAB→')
        .replace(/  +/g, (match) => `[${match.length}sp]`);
      console.log(`${String(index + 1).padStart(4, ' ')} | ${displayLine}`);
    });

    console.log('');
    console.log('='.repeat(80));
    console.log('SZUKANIE WZORCÓW:');
    console.log('='.repeat(80));

    // Szukaj wzorców które mogą być pozycjami
    const text = pdfData.text;

    // Wzorzec: liczba x liczba (wymiary)
    const dimensionPattern = /(\d{3,4})\s*[xX×]\s*(\d{3,4})/g;
    let dimMatch;
    console.log('\nWymiary (NNN x NNN):');
    while ((dimMatch = dimensionPattern.exec(text)) !== null) {
      const context = text.substring(Math.max(0, dimMatch.index - 50), dimMatch.index + dimMatch[0].length + 20);
      console.log(`  - ${dimMatch[0]} (context: "${context.replace(/\n/g, '↵')}")`);
    }

    // Wzorzec: numer pozycji (1. lub 2. na początku)
    const posPattern = /^(\d+)\./gm;
    let posMatch;
    console.log('\nNumery pozycji (N.):');
    while ((posMatch = posPattern.exec(text)) !== null) {
      const context = text.substring(posMatch.index, Math.min(text.length, posMatch.index + 100));
      console.log(`  - Pozycja ${posMatch[1]}: "${context.replace(/\n/g, '↵').substring(0, 80)}..."`);
    }

    // Wzorzec: typ szyby (4/16/4S3 itp.)
    const glassPattern = /\d+\/\d+\/\d+\S*/g;
    let glassMatch;
    console.log('\nTypy szyb (N/N/N...):');
    while ((glassMatch = glassPattern.exec(text)) !== null) {
      const context = text.substring(Math.max(0, glassMatch.index - 20), glassMatch.index + glassMatch[0].length + 30);
      console.log(`  - ${glassMatch[0]} (context: "${context.replace(/\n/g, '↵')}")`);
    }

  } catch (error) {
    console.error('BŁĄD:', error);
    process.exit(1);
  }
}

main();
