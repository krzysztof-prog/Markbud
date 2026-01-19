import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // 1. Sprawdź zlecenia z nadwyżką
  const overDelivered = await prisma.order.findMany({
    where: { glassOrderStatus: 'over_delivered' },
    select: { orderNumber: true, orderedGlassCount: true, deliveredGlassCount: true },
    orderBy: { orderNumber: 'desc' },
    take: 10
  });

  console.log('=== ZLECENIA Z NADWYŻKĄ (over_delivered) ===');
  console.log('Zlecenie | Zamówiono | Dostarczono | Różnica');
  for (const o of overDelivered) {
    const diff = (o.deliveredGlassCount || 0) - (o.orderedGlassCount || 0);
    console.log(`${o.orderNumber} | ${o.orderedGlassCount || 0} | ${o.deliveredGlassCount || 0} | +${diff}`);
  }

  // 2. Weź jedno zlecenie i sprawdź jego dostawy
  if (overDelivered.length > 0) {
    const sampleOrder = overDelivered[0].orderNumber;
    console.log('');
    console.log(`=== DOSTAWY DLA ZLECENIA ${sampleOrder} ===`);

    const deliveryItems = await prisma.glassDeliveryItem.findMany({
      where: { orderNumber: sampleOrder },
      include: {
        glassDelivery: {
          select: { rackNumber: true, customerOrderNumber: true, deliveryDate: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Znaleziono ${deliveryItems.length} pozycji dostaw:`);
    for (const item of deliveryItems) {
      console.log(`  Rack: ${item.glassDelivery.rackNumber} | CustomerOrder: ${item.glassDelivery.customerOrderNumber} | qty: ${item.quantity} | status: ${item.matchStatus} | import: ${item.glassDelivery.createdAt.toISOString().split('T')[0]}`);
    }

    // Suma dostarczonych
    const totalDelivered = deliveryItems.reduce((sum, i) => sum + i.quantity, 0);
    console.log('');
    console.log(`Suma dostarczonych: ${totalDelivered}`);

    // 3. Sprawdź czy są duplikaty (ten sam rack + position)
    console.log('');
    console.log('=== SPRAWDZENIE DUPLIKATÓW ===');
    const byRackAndPosition = new Map<string, number>();
    for (const item of deliveryItems) {
      const key = `${item.glassDelivery.rackNumber}|${item.position}`;
      byRackAndPosition.set(key, (byRackAndPosition.get(key) || 0) + 1);
    }

    const duplicates = Array.from(byRackAndPosition.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('ZNALEZIONO DUPLIKATY:');
      for (const [key, count] of duplicates) {
        console.log(`  ${key}: ${count}x`);
      }
    } else {
      console.log('Brak duplikatów pozycji w tym samym racku');
    }

    // 4. Sprawdź różne racki dla tego samego zlecenia
    const uniqueRacks = [...new Set(deliveryItems.map(i => i.glassDelivery.rackNumber))];
    console.log('');
    console.log(`Unikalne racki dla tego zlecenia: ${uniqueRacks.length}`);
    console.log(uniqueRacks.join(', '));
  }

  // 5. Sprawdź ile razy ten sam plik CSV mógł być zaimportowany
  console.log('');
  console.log('=== SPRAWDZENIE DUPLIKATÓW DOSTAW (po rackNumber) ===');
  const rackCounts = await prisma.glassDelivery.groupBy({
    by: ['rackNumber'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  if (rackCounts.length > 0) {
    console.log('ZNALEZIONO ZDUPLIKOWANE RACKI (importowane wielokrotnie):');
    for (const r of rackCounts) {
      console.log(`  ${r.rackNumber}: ${r._count.id}x`);
    }
  } else {
    console.log('Brak zduplikowanych racków');
  }

  await prisma.$disconnect();
}

check().catch(console.error);
