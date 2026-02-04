/**
 * Skrypt testowy - parsowanie pliku uzyte_bele dla zlecenia 53896
 */

import * as fs from 'fs';
import * as path from 'path';

// Szukamy pliku CSV z 53896
const baseDir = 'C:/DEV_DATA/uzyte_bele'; // lub ścieżka do prawdziwych danych

function findFile(dir: string, pattern: string): string | null {
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir, { recursive: true }) as string[];
  for (const file of files) {
    if (file.includes(pattern) && file.endsWith('.csv')) {
      return path.join(dir, file);
    }
  }
  return null;
}

function parseCsvLine(line: string): string[] {
  return line.split(';').map(s => s.trim());
}

async function main() {
  // Możliwe lokalizacje
  const dirs = [
    'C:/DEV_DATA/uzyte_bele',
    '//192.168.1.6/Public/Markbud_import/uzyte_bele',
    process.cwd() + '/uzyte bele',
  ];

  let filePath: string | null = null;

  for (const dir of dirs) {
    console.log(`Szukam w: ${dir}`);
    filePath = findFile(dir, '53896');
    if (filePath) {
      console.log(`Znaleziono: ${filePath}`);
      break;
    }
  }

  if (!filePath) {
    console.log('\nNie znaleziono pliku. Podaj ścieżkę ręcznie:');
    console.log('npx tsx scripts/test-parse-53896.ts <ścieżka-do-pliku>');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  console.log(`\nParsowanie pliku: ${filePath}`);
  console.log(`Liczba linii: ${lines.length}\n`);

  let inGlassSection = false;
  let glassRows: Array<{ lp: string; parts: string[] }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    const parts = parseCsvLine(line);

    // Wykryj sekcję szyb
    if (lineLower.includes('lista szyb')) {
      console.log(`[Linia ${i + 1}] Początek sekcji szyb`);
      inGlassSection = true;
      continue;
    }

    // Wykryj koniec sekcji (materiałówka lub podsumowanie)
    if (inGlassSection && (lineLower.includes('materialowka') || lineLower.includes('łączna lic'))) {
      console.log(`[Linia ${i + 1}] Koniec sekcji szyb`);
      break;
    }

    // W sekcji szyb
    if (inGlassSection && parts[0]) {
      // Nagłówek
      if (parts[0].toLowerCase().includes('lp') || parts[1]?.toLowerCase().includes('pozycja')) {
        console.log(`[Linia ${i + 1}] Nagłówek: ${parts.join(' | ')}`);
        continue;
      }

      // Wiersz danych
      if (parts[0].match(/^\d+$/)) {
        glassRows.push({ lp: parts[0], parts });
        console.log(`[Linia ${i + 1}] Lp=${parts[0]} Poz=${parts[1]} Szer=${parts[2]} Wys=${parts[3]} ILOSC=${parts[4]} Pakiet=${parts[5]}`);
      }
    }

    // Szukaj łącznej liczby szyb
    if (lineLower.includes('łączna liczba szyb') || lineLower.includes('laczna liczba szyb')) {
      console.log(`[Linia ${i + 1}] Łączna liczba szyb: ${parts[1]}`);
    }
  }

  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Liczba wierszy szyb: ${glassRows.length}`);

  const sumQty = glassRows.reduce((sum, r) => sum + (parseInt(r.parts[4]) || 1), 0);
  console.log(`Suma ilości (parts[4]): ${sumQty}`);

  console.log('\nSzczegóły ilości:');
  glassRows.forEach(r => {
    const qty = r.parts[4];
    console.log(`  Lp ${r.lp}: ilość = "${qty}" (parseInt = ${parseInt(qty) || 1})`);
  });
}

main();
