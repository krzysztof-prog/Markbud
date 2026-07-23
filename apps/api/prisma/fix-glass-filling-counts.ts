/**
 * Fix script - Przelicza totalGlasses dla zleceń z wypełnieniami/panelami
 *
 * Dla zleceń które mają pozycje szklane tylko typu "wypełnienie" lub "panel",
 * ustawia totalGlasses = 0 (bo to nie są prawdziwe szyby).
 *
 * Uruchom: pnpm --filter @markbud/api tsx prisma/fix-glass-filling-counts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Przeliczanie totalGlasses - wykluczanie wypełnień i paneli...');

  // Pobierz wszystkie zlecenia które mają pozycje szklane
  const ordersWithGlass = await prisma.order.findMany({
    where: {
      glasses: {
        some: {},
      },
    },
    select: {
      id: true,
      orderNumber: true,
      totalGlasses: true,
      glasses: {
        select: {
          quantity: true,
          packageType: true,
        },
      },
    },
  });

  console.log(`Znaleziono ${ordersWithGlass.length} zleceń z pozycjami szklanymi`);

  let updatedCount = 0;

  for (const order of ordersWithGlass) {
    // Policz tylko prawdziwe szyby (bez paneli i wypełnień)
    let realGlassCount = 0;
    for (const glass of order.glasses) {
      const packageTypeLower = (glass.packageType || '').toLowerCase();
      if (
        !packageTypeLower.includes('panel') &&
        !packageTypeLower.includes('wypełnienie') &&
        !packageTypeLower.includes('wypelnienie')
      ) {
        realGlassCount += glass.quantity;
      }
    }

    // Zaktualizuj jeśli się różni
    if (order.totalGlasses !== realGlassCount) {
      await prisma.order.update({
        where: { id: order.id },
        data: { totalGlasses: realGlassCount },
      });
      console.log(
        `  ✅ ${order.orderNumber}: ${order.totalGlasses} → ${realGlassCount} (miało ${order.glasses.length} pozycji szklanych)`
      );
      updatedCount++;
    }
  }

  console.log(`\n✅ Zaktualizowano ${updatedCount} zleceń`);
}

main()
  .catch((e) => {
    console.error('❌ Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });