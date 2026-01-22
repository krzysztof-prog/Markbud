/**
 * Skrypt naprawiający glassOrderStatus w zleceniach
 * Na podstawie orderedGlassCount vs deliveredGlassCount
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Naprawianie glassOrderStatus w zleceniach...\n');

  // Znajdź wszystkie zlecenia z orderedGlassCount > 0
  const ordersWithGlass = await prisma.order.findMany({
    where: { orderedGlassCount: { gt: 0 } },
    select: {
      orderNumber: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      glassOrderStatus: true,
    },
  });

  console.log(`Znaleziono ${ordersWithGlass.length} zleceń z zamówionymi szybami.\n`);

  let fixedCount = 0;
  for (const order of ordersWithGlass) {
    const ordered = order.orderedGlassCount || 0;
    const delivered = order.deliveredGlassCount || 0;

    // Oblicz prawidłowy status
    let correctStatus: string;
    if (delivered === 0) {
      correctStatus = 'ordered';
    } else if (delivered < ordered) {
      correctStatus = 'partially_delivered';
    } else if (delivered === ordered) {
      correctStatus = 'delivered';
    } else {
      correctStatus = 'over_delivered';
    }

    if (correctStatus !== order.glassOrderStatus) {
      console.log(
        `  ${order.orderNumber}: ${order.glassOrderStatus} -> ${correctStatus} ` +
          `(zamówiono: ${ordered}, dostarczono: ${delivered})`
      );

      await prisma.order.update({
        where: { orderNumber: order.orderNumber },
        data: { glassOrderStatus: correctStatus },
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
