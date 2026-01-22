/**
 * Skrypt do pełnego re-importu wszystkich dostaw szyb
 * 1. Usuwa wszystkie GlassDeliveryItem i GlassDelivery
 * 2. Usuwa powiązane rekordy z LooseGlass, AluminumGlass, ReclamationGlass
 * 3. Importuje wszystkie pliki CSV z archiwum
 */

import { PrismaClient } from '@prisma/client';
import { GlassDeliveryService } from '../src/services/glass-delivery/index.js';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const glassDeliveryService = new GlassDeliveryService(prisma);

const ARCHIVE_PATH = 'C:/DEV_DATA/dostawy_szyb/_archiwum';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 RE-IMPORT WSZYSTKICH DOSTAW SZYB');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Usuń powiązane rekordy z kategoryzowanych tabel
  console.log('🗑️  Usuwanie kategoryzowanych szyb...');

  const looseDeleted = await prisma.looseGlass.deleteMany({});
  console.log(`   - LooseGlass: ${looseDeleted.count} rekordów`);

  const aluminumDeleted = await prisma.aluminumGlass.deleteMany({});
  console.log(`   - AluminumGlass: ${aluminumDeleted.count} rekordów`);

  const reclamationDeleted = await prisma.reclamationGlass.deleteMany({});
  console.log(`   - ReclamationGlass: ${reclamationDeleted.count} rekordów`);

  // 2. Usuń wszystkie GlassDeliveryItem
  console.log('\n🗑️  Usuwanie GlassDeliveryItem...');
  const itemsDeleted = await prisma.glassDeliveryItem.deleteMany({});
  console.log(`   - Usunięto ${itemsDeleted.count} items`);

  // 3. Usuń wszystkie GlassDelivery
  console.log('\n🗑️  Usuwanie GlassDelivery...');
  const deliveriesDeleted = await prisma.glassDelivery.deleteMany({});
  console.log(`   - Usunięto ${deliveriesDeleted.count} dostaw`);

  // 4. Pobierz listę plików CSV
  console.log('\n📂 Skanowanie archiwum...');
  const files = fs.readdirSync(ARCHIVE_PATH)
    .filter(f => f.endsWith('.csv'))
    .sort();

  console.log(`   Znaleziono ${files.length} plików CSV\n`);

  // 5. Importuj każdy plik
  console.log('📥 Importowanie plików...\n');

  let successCount = 0;
  let errorCount = 0;
  const errors: { file: string; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(ARCHIVE_PATH, file);

    process.stdout.write(`   [${i + 1}/${files.length}] ${file}... `);

    try {
      // Odczytaj plik jako Buffer (CP1250)
      const fileContent = fs.readFileSync(filePath);

      // Importuj używając serwisu (który obsługuje konwersję CP1250 → UTF-8)
      await glassDeliveryService.importFromCsv(fileContent, file);

      console.log('✅');
      successCount++;
    } catch (error) {
      console.log('❌');
      errorCount++;
      errors.push({
        file,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 6. Podsumowanie
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 PODSUMOWANIE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   ✅ Zaimportowano: ${successCount} plików`);
  console.log(`   ❌ Błędy: ${errorCount} plików`);

  if (errors.length > 0) {
    console.log('\n   Pliki z błędami:');
    for (const err of errors) {
      console.log(`   - ${err.file}: ${err.error.substring(0, 100)}`);
    }
  }

  // 7. Sprawdź wyniki
  const newDeliveries = await prisma.glassDelivery.count();
  const newItems = await prisma.glassDeliveryItem.count();

  console.log(`\n   📦 Nowe dostawy w bazie: ${newDeliveries}`);
  console.log(`   📋 Nowe items w bazie: ${newItems}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((error) => {
    console.error('❌ Krytyczny błąd:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
