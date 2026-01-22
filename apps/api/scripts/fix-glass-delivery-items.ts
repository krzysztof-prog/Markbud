/**
 * Skrypt do naprawy istniejących GlassDeliveryItem
 * Kopiuje customerOrderNumber i rackNumber z parent GlassDelivery do items
 * które mają te pola puste (null)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGlassDeliveryItems() {
  console.log('🔧 Naprawianie GlassDeliveryItem - kopiowanie customerOrderNumber i rackNumber z parent...\n');

  // Pobierz wszystkie dostawy z items
  const deliveries = await prisma.glassDelivery.findMany({
    include: {
      items: true,
    },
  });

  console.log(`📦 Znaleziono ${deliveries.length} dostaw szyb\n`);

  let totalUpdated = 0;
  let totalItems = 0;

  for (const delivery of deliveries) {
    const itemsToFix = delivery.items.filter(
      item => item.customerOrderNumber === null || item.rackNumber === null
    );

    if (itemsToFix.length === 0) {
      continue;
    }

    console.log(`📋 Dostawa #${delivery.id} (${delivery.customerOrderNumber}, stojak ${delivery.rackNumber}):`);
    console.log(`   - ${itemsToFix.length} items do naprawy`);

    // Aktualizuj wszystkie items tej dostawy
    const result = await prisma.glassDeliveryItem.updateMany({
      where: {
        glassDeliveryId: delivery.id,
        OR: [
          { customerOrderNumber: null },
          { rackNumber: null },
        ],
      },
      data: {
        customerOrderNumber: delivery.customerOrderNumber,
        rackNumber: delivery.rackNumber,
      },
    });

    totalUpdated += result.count;
    totalItems += delivery.items.length;
    console.log(`   ✅ Zaktualizowano ${result.count} items\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ GOTOWE!`);
  console.log(`   - Sprawdzono: ${totalItems} items`);
  console.log(`   - Zaktualizowano: ${totalUpdated} items`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

fixGlassDeliveryItems()
  .catch((error) => {
    console.error('❌ Błąd:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
