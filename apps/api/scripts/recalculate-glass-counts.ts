/**
 * Skrypt do przeliczenia deliveredGlassCount i glassOrderStatus
 * dla wszystkich zleceń które mają zamówione szyby (orderedGlassCount > 0)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculate() {
  console.log('=== PRZELICZANIE DELIVEREDGLASSCOUNT ===\n');

  // Pobierz wszystkie zlecenia które mają zamówione szyby
  const ordersWithGlass = await prisma.order.findMany({
    where: {
      orderedGlassCount: { gt: 0 }
    },
    select: {
      id: true,
      orderNumber: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      glassOrderStatus: true
    }
  });

  console.log(`Znaleziono ${ordersWithGlass.length} zleceń z zamówionymi szybami\n`);

  let updated = 0;
  let fixedOverDelivered = 0;
  const changes: Array<{
    orderNumber: string;
    oldDelivered: number;
    newDelivered: number;
    oldStatus: string;
    newStatus: string;
  }> = [];

  for (const order of ordersWithGlass) {
    // Policz RZECZYWISTĄ liczbę dostarczonych szyb (matched items)
    const matchedCount = await prisma.glassDeliveryItem.aggregate({
      where: {
        orderNumber: order.orderNumber,
        matchStatus: 'matched'
      },
      _sum: { quantity: true }
    });

    const actualDelivered = matchedCount._sum.quantity || 0;
    const ordered = order.orderedGlassCount || 0;

    // Oblicz poprawny status
    let correctStatus: string;
    if (actualDelivered === 0) {
      correctStatus = ordered > 0 ? 'ordered' : 'not_ordered';
    } else if (actualDelivered < ordered) {
      correctStatus = 'partially_delivered';
    } else if (actualDelivered === ordered) {
      correctStatus = 'delivered';
    } else {
      correctStatus = 'over_delivered';
    }

    // Sprawdź czy coś się zmieniło
    if (order.deliveredGlassCount !== actualDelivered || order.glassOrderStatus !== correctStatus) {
      const wasOverDelivered = order.glassOrderStatus === 'over_delivered';
      const isNowOverDelivered = correctStatus === 'over_delivered';

      await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveredGlassCount: actualDelivered,
          glassOrderStatus: correctStatus
        }
      });

      changes.push({
        orderNumber: order.orderNumber,
        oldDelivered: order.deliveredGlassCount || 0,
        newDelivered: actualDelivered,
        oldStatus: order.glassOrderStatus || 'null',
        newStatus: correctStatus
      });

      updated++;

      if (wasOverDelivered && !isNowOverDelivered) {
        fixedOverDelivered++;
      }
    }
  }

  // Wyświetl zmiany
  console.log('=== ZMIANY ===');
  if (changes.length === 0) {
    console.log('Brak zmian - wszystkie wartości są poprawne.');
  } else {
    console.log('Zlecenie | Było → Jest | Status');
    console.log('-'.repeat(60));
    for (const change of changes) {
      const statusChange = change.oldStatus !== change.newStatus
        ? `${change.oldStatus} → ${change.newStatus}`
        : change.oldStatus;
      console.log(`${change.orderNumber} | ${change.oldDelivered} → ${change.newDelivered} | ${statusChange}`);
    }
  }

  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Zaktualizowano: ${updated} zleceń`);
  console.log(`Naprawiono "over_delivered": ${fixedOverDelivered}`);

  // Sprawdź końcowy stan
  const finalStats = await prisma.order.groupBy({
    by: ['glassOrderStatus'],
    where: { orderedGlassCount: { gt: 0 } },
    _count: { id: true }
  });

  console.log('\n=== KOŃCOWY STAN STATUSÓW ===');
  for (const stat of finalStats) {
    console.log(`  ${stat.glassOrderStatus}: ${stat._count.id}`);
  }

  await prisma.$disconnect();
}

recalculate().catch(console.error);
