/**
 * Skrypt naprawczy dla FileImport.filepath
 *
 * Problem: Po archiwizacji pliku PDF filepath w bazie wskazywał na oryginalną lokalizację,
 * a plik został przeniesiony do _archiwum/. Przez to hasPdf zwracał false.
 *
 * Ten skrypt:
 * 1. Znajduje wszystkie FileImport z fileType='ceny_pdf' i status='completed'
 * 2. Sprawdza czy plik istnieje w oryginalnej lokalizacji
 * 3. Jeśli nie - szuka w _archiwum/ i aktualizuje filepath
 *
 * Uruchomienie: npx tsx scripts/fix-ceny-filepath.ts
 */

import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function fixCenyFilepaths() {
  console.log('🔧 Rozpoczynam naprawę ścieżek do plików PDF cen...\n');

  // Znajdź wszystkie importy cen PDF
  const cenyImports = await prisma.fileImport.findMany({
    where: {
      fileType: 'ceny_pdf',
      status: 'completed',
    },
  });

  console.log(`📊 Znaleziono ${cenyImports.length} importów cen PDF\n`);

  let fixed = 0;
  let alreadyOk = 0;
  let notFound = 0;

  for (const fileImport of cenyImports) {
    const { id, filename, filepath } = fileImport;

    // Sprawdź czy plik istnieje w oryginalnej lokalizacji
    if (existsSync(filepath)) {
      alreadyOk++;
      continue;
    }

    // Plik nie istnieje - sprawdź w _archiwum/
    const directory = path.dirname(filepath);
    const archivePath = path.join(directory, '_archiwum', filename);

    if (existsSync(archivePath)) {
      // Znaleziono w archiwum - zaktualizuj filepath
      await prisma.fileImport.update({
        where: { id },
        data: { filepath: archivePath },
      });
      console.log(`✅ Naprawiono: ${filename}`);
      console.log(`   Stara ścieżka: ${filepath}`);
      console.log(`   Nowa ścieżka: ${archivePath}\n`);
      fixed++;
    } else {
      // Plik nie istnieje ani w oryginale ani w archiwum
      console.log(`⚠️ Nie znaleziono pliku: ${filename}`);
      console.log(`   Sprawdzono: ${filepath}`);
      console.log(`   Sprawdzono: ${archivePath}\n`);
      notFound++;
    }
  }

  console.log('\n📊 Podsumowanie:');
  console.log(`   ✅ Naprawiono: ${fixed}`);
  console.log(`   ✓ Już OK: ${alreadyOk}`);
  console.log(`   ⚠️ Nie znaleziono: ${notFound}`);
  console.log(`   📁 Razem: ${cenyImports.length}`);
}

fixCenyFilepaths()
  .catch((error) => {
    console.error('❌ Błąd:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
