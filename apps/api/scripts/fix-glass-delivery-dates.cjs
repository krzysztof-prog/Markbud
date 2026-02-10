/**
 * Naprawia glassDeliveryDate dla zleceń które mają GlassOrderItems
 * ale nie mają ustawionej daty dostawy szyb.
 *
 * Używa daty expectedDeliveryDate z GlassOrder.
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(APPLY ? '=== TRYB ZAPISU (--apply) ===' : '=== DRY RUN (bez --apply nie zapisuje) ===');
  console.log('');

  // Znajdź zlecenia które mają GlassOrderItems ale nie mają glassDeliveryDate
  const ordersWithoutDate = await p.order.findMany({
    where: {
      glassDeliveryDate: null,
      orderedGlassCount: { gt: 0 },
    },
    select: {
      id: true,
      orderNumber: true,
      glassDeliveryDate: true,
      orderedGlassCount: true,
    }
  });

  console.log(`Znaleziono ${ordersWithoutDate.length} zleceń z zamówionymi szybami ale bez daty dostawy.`);
  console.log('');

  const changes = [];

  for (const order of ordersWithoutDate) {
    // Znajdź GlassOrder dla tego zlecenia
    const glassOrderItem = await p.glassOrderItem.findFirst({
      where: { orderNumber: order.orderNumber },
      include: {
        glassOrder: {
          select: {
            id: true,
            glassOrderNumber: true,
            expectedDeliveryDate: true,
            deletedAt: true,
          }
        }
      }
    });

    if (!glassOrderItem || !glassOrderItem.glassOrder || glassOrderItem.glassOrder.deletedAt) {
      console.log(`⚠️ ${order.orderNumber}: Brak aktywnego GlassOrder`);
      continue;
    }

    const expectedDate = glassOrderItem.glassOrder.expectedDeliveryDate;
    if (!expectedDate) {
      console.log(`⚠️ ${order.orderNumber}: GlassOrder bez daty dostawy`);
      continue;
    }

    console.log(`✅ ${order.orderNumber}: ustawiam datę ${expectedDate.toLocaleDateString('pl-PL')} (z ${glassOrderItem.glassOrder.glassOrderNumber})`);

    changes.push({
      orderNumber: order.orderNumber,
      orderId: order.id,
      newDate: expectedDate,
      glassOrderNumber: glassOrderItem.glassOrder.glassOrderNumber,
    });

    if (APPLY) {
      await p.order.update({
        where: { id: order.id },
        data: { glassDeliveryDate: expectedDate },
      });
    }
  }

  console.log('');
  console.log('=== PODSUMOWANIE ===');
  console.log(`Zaktualizowano: ${changes.length} zleceń`);

  if (changes.length > 0) {
    console.table(changes.map(c => ({
      'Zlecenie': c.orderNumber,
      'Data dostawy': c.newDate.toLocaleDateString('pl-PL'),
      'Z zamówienia': c.glassOrderNumber,
    })));
  }

  if (!APPLY && changes.length > 0) {
    console.log('');
    console.log('⚠️ DRY RUN - uruchom z --apply aby zapisać zmiany');
  }

  await p.$disconnect();
}

main().catch(e => {
  console.error('BŁĄD:', e);
  process.exit(1);
});
