/**
 * Skrypt do wyzerowania wszystkich danych paletówek
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️ Zerowanie danych paletówek...\n');

  // 1. Usuń wpisy dnia paletowego
  const deletedEntries = await prisma.palletStockEntry.deleteMany();
  console.log(`✅ Usunięto ${deletedEntries.count} wpisów PalletStockEntry`);

  // 2. Usuń dni paletowe
  const deletedDays = await prisma.palletStockDay.deleteMany();
  console.log(`✅ Usunięto ${deletedDays.count} dni PalletStockDay`);

  // 3. Usuń konfiguracje alertów
  const deletedAlerts = await prisma.palletAlertConfig.deleteMany();
  console.log(`✅ Usunięto ${deletedAlerts.count} konfiguracji alertów PalletAlertConfig`);

  // 4. Usuń stany początkowe
  const deletedInitial = await prisma.palletInitialStock.deleteMany();
  console.log(`✅ Usunięto ${deletedInitial.count} stanów początkowych PalletInitialStock`);

  console.log('\n✅ Wszystkie dane paletówek zostały wyzerowane!');
}

main()
  .catch((e) => {
    console.error('❌ Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
