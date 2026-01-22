/**
 * Skrypt naprawiający wartości deliveredGlassCount w tabeli Order
 * Przelicza z rzeczywistej liczby matched GlassDeliveryItem
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Naprawianie deliveredGlassCount w zleceniach...\n');

  // Znajdź wszystkie zlecenia z deliveredGlassCount > 0
  const ordersWithDeliveries = await prisma.order.findMany({
    where: { deliveredGlassCount: { gt: 0 } },
    select: { orderNumber: true, deliveredGlassCount: true, orderedGlassCount: true },
  });

  console.log(`Znaleziono ${ordersWithDeliveries.length} zleceń z dostarczeniami.\n`);

  let fixedCount = 0;
  for (const order of ordersWithDeliveries) {
    // Policz rzeczywistą liczbę matched delivery items
    const actualDelivered = await prisma.glassDeliveryItem.aggregate({
      where: {
        orderNumber: order.orderNumber,
        matchStatus: 'matched',
      },
      _sum: { quantity: true },
    });

    const actualCount = actualDelivered._sum.quantity || 0;

    if (actualCount !== order.deliveredGlassCount) {
      console.log(
        `  ${order.orderNumber}: ${order.deliveredGlassCount} -> ${actualCount} ` +
          `(zamówiono: ${order.orderedGlassCount})`
      );

      await prisma.order.update({
        where: { orderNumber: order.orderNumber },
        data: { deliveredGlassCount: actualCount },
      });

      fixedCount++;
    }
  }

  console.log(`\nNaprawiono ${fixedCount} zleceń.`);
}

main()
  .catch((e) => {
    console.error('Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
