/**
 * Skrypt do czyszczenia zduplikowanych dostaw szyb
 *
 * Problem: Te same pliki CSV zostały zaimportowane wielokrotnie,
 * co spowodowało że deliveredGlassCount jest 2x lub 3x większy niż powinien być.
 *
 * Rozwiązanie:
 * 1. Znajdź wszystkie racki które występują więcej niż raz
 * 2. Dla każdego zduplikowanego racka - zostaw tylko najstarszy wpis
 * 3. Usuń pozostałe duplikaty (wraz z GlassDeliveryItem)
 * 4. Przelicz deliveredGlassCount dla dotkniętych zleceń
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateRack {
  rackNumber: string;
  count: number;
  deliveryIds: number[];
  keepId: number;
  deleteIds: number[];
}

async function cleanupDuplicates() {
  console.log('=== CZYSZCZENIE ZDUPLIKOWANYCH DOSTAW SZYB ===\n');

  // 1. Znajdź zduplikowane racki
  console.log('1. Szukam zduplikowanych racków...');

  const rackCounts = await prisma.glassDelivery.groupBy({
    by: ['rackNumber'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } }
  });

  if (rackCounts.length === 0) {
    console.log('✅ Nie znaleziono żadnych duplikatów!');
    await prisma.$disconnect();
    return;
  }

  console.log(`Znaleziono ${rackCounts.length} zduplikowanych racków\n`);

  // 2. Dla każdego racka - pobierz wszystkie dostawy i wybierz którą zostawić
  const duplicates: DuplicateRack[] = [];

  for (const rack of rackCounts) {
    const deliveries = await prisma.glassDelivery.findMany({
      where: { rackNumber: rack.rackNumber },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' } // najstarszy pierwszy
    });

    const keepId = deliveries[0].id; // zostawiamy najstarszy
    const deleteIds = deliveries.slice(1).map(d => d.id);

    duplicates.push({
      rackNumber: rack.rackNumber,
      count: rack._count.id,
      deliveryIds: deliveries.map(d => d.id),
      keepId,
      deleteIds
    });

    console.log(`  Rack ${rack.rackNumber}: ${rack._count.id}x (zostawiam ID=${keepId}, usuwam: ${deleteIds.join(', ')})`);
  }

  // 3. Zbierz wszystkie numery zleceń które będą dotknięte (do przeliczenia)
  console.log('\n2. Zbieram numery zleceń do przeliczenia...');

  const allDeleteIds = duplicates.flatMap(d => d.deleteIds);

  const affectedOrderNumbers = await prisma.glassDeliveryItem.findMany({
    where: { glassDeliveryId: { in: allDeleteIds } },
    select: { orderNumber: true },
    distinct: ['orderNumber']
  });

  const orderNumbers = [...new Set(affectedOrderNumbers.map(i => i.orderNumber))];
  console.log(`Dotknięte zlecenia: ${orderNumbers.length}`);

  // 4. Usuń duplikaty w transakcji
  console.log('\n3. Usuwam duplikaty...');

  await prisma.$transaction(async (tx) => {
    // Najpierw usuń kategoryzowane szyby
    const looseDeleted = await tx.looseGlass.deleteMany({
      where: { glassDeliveryId: { in: allDeleteIds } }
    });
    console.log(`   Usunięto ${looseDeleted.count} LooseGlass`);

    const aluminumDeleted = await tx.aluminumGlass.deleteMany({
      where: { glassDeliveryId: { in: allDeleteIds } }
    });
    console.log(`   Usunięto ${aluminumDeleted.count} AluminumGlass`);

    const reclamationDeleted = await tx.reclamationGlass.deleteMany({
      where: { glassDeliveryId: { in: allDeleteIds } }
    });
    console.log(`   Usunięto ${reclamationDeleted.count} ReclamationGlass`);

    // Usuń GlassDeliveryItem
    const itemsDeleted = await tx.glassDeliveryItem.deleteMany({
      where: { glassDeliveryId: { in: allDeleteIds } }
    });
    console.log(`   Usunięto ${itemsDeleted.count} GlassDeliveryItem`);

    // Usuń GlassDelivery
    const deliveriesDeleted = await tx.glassDelivery.deleteMany({
      where: { id: { in: allDeleteIds } }
    });
    console.log(`   Usunięto ${deliveriesDeleted.count} GlassDelivery`);
  });

  // 5. Przelicz deliveredGlassCount dla dotkniętych zleceń
  console.log('\n4. Przeliczam deliveredGlassCount dla dotkniętych zleceń...');

  let updatedOrders = 0;
  let fixedOverDelivered = 0;

  for (const orderNumber of orderNumbers) {
    // Policz ile szyb jest naprawdę dostarczonych (matched items)
    const matchedCount = await prisma.glassDeliveryItem.aggregate({
      where: {
        orderNumber,
        matchStatus: 'matched'
      },
      _sum: { quantity: true }
    });

    const deliveredCount = matchedCount._sum.quantity || 0;

    // Pobierz aktualne dane zlecenia
    const order = await prisma.order.findFirst({
      where: { orderNumber },
      select: { id: true, orderedGlassCount: true, deliveredGlassCount: true, glassOrderStatus: true }
    });

    if (order && order.deliveredGlassCount !== deliveredCount) {
      const oldStatus = order.glassOrderStatus;

      // Oblicz nowy status
      let newStatus: string;
      const ordered = order.orderedGlassCount || 0;

      if (deliveredCount === 0) {
        newStatus = ordered > 0 ? 'ordered' : 'not_ordered';
      } else if (deliveredCount < ordered) {
        newStatus = 'partially_delivered';
      } else if (deliveredCount === ordered) {
        newStatus = 'delivered';
      } else {
        newStatus = 'over_delivered';
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveredGlassCount: deliveredCount,
          glassOrderStatus: newStatus
        }
      });

      updatedOrders++;

      if (oldStatus === 'over_delivered' && newStatus !== 'over_delivered') {
        fixedOverDelivered++;
        console.log(`   ${orderNumber}: ${order.deliveredGlassCount} → ${deliveredCount} (${oldStatus} → ${newStatus}) ✅`);
      }
    }
  }

  console.log(`\n✅ Zaktualizowano ${updatedOrders} zleceń`);
  console.log(`✅ Naprawiono ${fixedOverDelivered} zleceń z "over_delivered"`);

  // 6. Podsumowanie
  console.log('\n=== PODSUMOWANIE ===');
  console.log(`Usunięto ${allDeleteIds.length} zduplikowanych dostaw`);
  console.log(`Zaktualizowano ${updatedOrders} zleceń`);
  console.log(`Naprawiono ${fixedOverDelivered} błędnych statusów "nadwyżka"`);

  // Sprawdź ile zostało over_delivered
  const remainingOverDelivered = await prisma.order.count({
    where: { glassOrderStatus: 'over_delivered' }
  });
  console.log(`\nPozostało zleceń z over_delivered: ${remainingOverDelivered}`);

  await prisma.$disconnect();
}

cleanupDuplicates().catch(console.error);
