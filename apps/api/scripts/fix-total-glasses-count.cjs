/**
 * Fix: totalGlasses zliczało POZYCJE (linie) zamiast SZTUK (quantity)
 *
 * Bug: UzyteBeleParser.ts linia 1345 robiła realGlassCount += 1 zamiast += glass.quantity
 * Efekt: zlecenia z wieloma szybami na jednej pozycji miały zaniżone totalGlasses
 *
 * Skrypt przelicza totalGlasses dla WSZYSTKICH zleceń na podstawie rekordów OrderGlass,
 * sumując quantity (z wykluczeniem paneli/wypełnień).
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fix() {
  // Znajdź wszystkie zlecenia które mają rekordy w order_glasses
  const orders = await p.order.findMany({
    where: {
      glasses: { some: {} },
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

  console.log(`Znaleziono ${orders.length} zleceń z rekordami szyb`);

  let fixedCount = 0;
  const changes = [];

  for (const order of orders) {
    // Policz szyby sumując quantity, z wykluczeniem paneli/wypełnień
    let realGlassCount = 0;
    for (const glass of order.glasses) {
      const pkg = (glass.packageType || '').toLowerCase();
      if (!pkg.includes('panel') && !pkg.includes('wypełnienie') && !pkg.includes('wypelnienie')) {
        realGlassCount += glass.quantity;
      }
    }

    const oldValue = order.totalGlasses;

    if (oldValue !== realGlassCount) {
      changes.push({
        orderNumber: order.orderNumber,
        old: oldValue,
        new: realGlassCount,
        positions: order.glasses.length,
      });

      await p.order.update({
        where: { id: order.id },
        data: { totalGlasses: realGlassCount },
      });

      fixedCount++;
    }
  }

  console.log(`\nNaprawiono ${fixedCount} zleceń:`);
  for (const c of changes) {
    console.log(`  ${c.orderNumber}: ${c.old} → ${c.new} (${c.positions} pozycji w pliku)`);
  }

  if (fixedCount === 0) {
    console.log('  Wszystkie wartości były już poprawne.');
  }

  await p.$disconnect();
}

fix().catch(e => { console.error(e); process.exit(1); });
