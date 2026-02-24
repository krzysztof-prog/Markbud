/**
 * Skrypt do przeliczenia totalGlasses dla wszystkich zleceń
 * na podstawie liczby POZYCJI (rekordów) szyb z tabeli OrderGlass,
 * wykluczając panele i wypełnienia.
 *
 * totalGlasses = liczba unikalnych pozycji szyb (nie suma quantity/sztuk fizycznych)
 *
 * Użycie: npx tsx scripts/recalculate-total-glasses.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynam przeliczenie totalGlasses...\n');

  // Pobierz wszystkie zlecenia z ich szybami
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
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

  console.log(`Znaleziono ${orders.length} zleceń do sprawdzenia.\n`);

  let updatedCount = 0;
  const changes: Array<{ orderNumber: string; old: number; new: number }> = [];

  for (const order of orders) {
    // Policz liczbę POZYCJI szyb (rekordów), wykluczając panele i wypełnienia
    const calculatedTotal = order.glasses.filter((g) => {
      const pkg = (g.packageType || '').toLowerCase();
      return !pkg.includes('panel') && !pkg.includes('wypełnienie') && !pkg.includes('wypelnienie');
    }).length;

    const currentTotal = order.totalGlasses ?? 0;

    // Aktualizuj tylko jeśli się różni
    if (calculatedTotal !== currentTotal) {
      await prisma.order.update({
        where: { id: order.id },
        data: { totalGlasses: calculatedTotal > 0 ? calculatedTotal : null },
      });

      changes.push({
        orderNumber: order.orderNumber,
        old: currentTotal,
        new: calculatedTotal,
      });
      updatedCount++;
    }
  }

  console.log(`\nZaktualizowano ${updatedCount} zleceń.\n`);

  if (changes.length > 0) {
    console.log('Szczegóły zmian:');
    console.log('─'.repeat(50));
    for (const change of changes.slice(0, 50)) {
      // Pokaż max 50 zmian
      console.log(`  ${change.orderNumber}: ${change.old} → ${change.new}`);
    }
    if (changes.length > 50) {
      console.log(`  ... i ${changes.length - 50} więcej`);
    }
  }

  console.log('\nGotowe!');
}

main()
  .catch((e) => {
    console.error('Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
