/**
 * Skrypt naprawczy: Ustawia shippedQty = orderedQty dla pozycji zamówień
 * które mają status "Całkowicie dostarczone" lub "Potwierdzona dostawa"
 *
 * Problem: Schuco CSV zawsze eksportuje shippedQty=0, nawet dla dostarczonych zamówień.
 * Fix: Jeśli zamówienie ma status "dostarczone", to wszystkie pozycje powinny mieć
 * shippedQty = orderedQty.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DELIVERED_STATUSES = ['Całkowicie dostarczone', 'Potwierdzona dostawa'];

async function fixShippedQty() {
  console.log('=== Fix shippedQty dla dostarczonych zamówień ===\n');

  // 1. Znajdź wszystkie pozycje z shippedQty < orderedQty dla dostarczonych zamówień
  const itemsToFix = await prisma.schucoOrderItem.findMany({
    where: {
      schucoDelivery: {
        shippingStatus: { in: DELIVERED_STATUSES }
      },
      // Znajdź gdzie shippedQty != orderedQty (nie używamy lt bo może być null)
    },
    select: {
      id: true,
      shippedQty: true,
      orderedQty: true,
      articleNumber: true,
      schucoDelivery: {
        select: {
          orderNumber: true,
          shippingStatus: true
        }
      }
    }
  });

  // Filtruj tylko te gdzie shippedQty < orderedQty
  const toFix = itemsToFix.filter(item => item.shippedQty < item.orderedQty);

  console.log(`Znaleziono ${toFix.length} pozycji do naprawy\n`);

  if (toFix.length === 0) {
    console.log('Brak pozycji do naprawy.');
    await prisma.$disconnect();
    return;
  }

  // Pokaż przykłady
  console.log('Przykładowe pozycje do naprawy:');
  for (const item of toFix.slice(0, 5)) {
    console.log(`  - ${item.schucoDelivery.orderNumber}: ${item.articleNumber} (${item.shippedQty}/${item.orderedQty})`);
  }
  console.log('');

  // 2. Napraw wszystkie pozycje
  let fixed = 0;
  let errors = 0;

  for (const item of toFix) {
    try {
      await prisma.schucoOrderItem.update({
        where: { id: item.id },
        data: { shippedQty: item.orderedQty }
      });
      fixed++;
    } catch (error) {
      console.error(`Błąd przy pozycji ${item.id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n=== WYNIK ===`);
  console.log(`Naprawiono: ${fixed} pozycji`);
  console.log(`Błędy: ${errors}`);

  // 3. Weryfikacja
  const remaining = await prisma.schucoOrderItem.count({
    where: {
      schucoDelivery: {
        shippingStatus: { in: DELIVERED_STATUSES }
      },
      shippedQty: 0,
      orderedQty: { gt: 0 }
    }
  });

  console.log(`\nPozostało pozycji z shippedQty=0 dla dostarczonych zamówień: ${remaining}`);

  await prisma.$disconnect();
}

fixShippedQty().catch(console.error);
