/**
 * Skrypt migracyjny: Przenosi szyby z wzorcem ALxx z LooseGlass do AluminumGlass
 *
 * Uruchomienie: npx tsx scripts/migrate-alxx-to-aluminum.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Szukam szyb z wzorcem ALxx w tabeli LooseGlass...\n');

  // Znajdź wszystkie szyby z wzorcem ALxx (AL + 2 cyfry)
  const looseGlasses = await prisma.looseGlass.findMany();

  // Filtruj te z wzorcem ALxx
  const alxxPattern = /AL\d{2}/i;
  const toMigrate = looseGlasses.filter(glass =>
    alxxPattern.test(glass.customerOrderNumber)
  );

  if (toMigrate.length === 0) {
    console.log('✅ Brak szyb do przeniesienia. Wszystko jest już poprawnie skategoryzowane.');
    return;
  }

  console.log(`📦 Znaleziono ${toMigrate.length} szyb do przeniesienia:\n`);

  // Pokaż przykłady
  const examples = toMigrate.slice(0, 5);
  examples.forEach(glass => {
    console.log(`  - ID: ${glass.id}, Zamówienie: "${glass.customerOrderNumber}", Klient: ${glass.clientName || '(brak)'}`);
  });
  if (toMigrate.length > 5) {
    console.log(`  ... i ${toMigrate.length - 5} więcej\n`);
  }

  // Wykonaj migrację w transakcji
  console.log('\n🚀 Rozpoczynam migrację...\n');

  await prisma.$transaction(async (tx) => {
    // Dodaj do AluminumGlass
    for (const glass of toMigrate) {
      await tx.aluminumGlass.create({
        data: {
          glassDeliveryId: glass.glassDeliveryId,
          customerOrderNumber: glass.customerOrderNumber,
          clientName: glass.clientName,
          widthMm: glass.widthMm,
          heightMm: glass.heightMm,
          quantity: glass.quantity,
          orderNumber: glass.orderNumber,
          glassComposition: glass.glassComposition,
          createdAt: glass.createdAt
        }
      });
    }

    // Usuń z LooseGlass
    await tx.looseGlass.deleteMany({
      where: {
        id: {
          in: toMigrate.map(g => g.id)
        }
      }
    });
  });

  console.log(`✅ Migracja zakończona!`);
  console.log(`   - Przeniesiono: ${toMigrate.length} szyb`);
  console.log(`   - Z: LooseGlass → Do: AluminumGlass`);
}

main()
  .catch((e) => {
    console.error('❌ Błąd migracji:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
