const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const allOrders = await p.order.findMany({ select: { orderNumber: true } });
  const orderSet = new Set(allOrders.map(o => o.orderNumber));

  // Sprawdz GlassOrderItem dla zlecen ktore SA w bazie ale maja bledne statusy
  const matchedGroups = await p.glassOrderItem.groupBy({
    by: ['orderNumber'],
    _sum: { quantity: true }
  });
  const matchedInOrder = matchedGroups.filter(g => orderSet.has(g.orderNumber));

  // Pobierz orderedGlassCount z Order dla tych
  const ordersToCheck = await p.order.findMany({
    where: { orderNumber: { in: matchedInOrder.map(m => m.orderNumber) } },
    select: { orderNumber: true, orderedGlassCount: true, deliveredGlassCount: true, glassOrderStatus: true, glassDeliveryDate: true }
  });

  const orderMap = new Map(ordersToCheck.map(o => [o.orderNumber, o]));

  let needsUpdate = 0;
  let correct = 0;
  let statusWrong = 0;

  for (const g of matchedInOrder) {
    const order = orderMap.get(g.orderNumber);
    if (!order) continue;

    const expectedCount = g._sum.quantity;
    const actualCount = order.orderedGlassCount || 0;

    if (actualCount !== expectedCount) {
      needsUpdate++;
    } else {
      correct++;
    }

    if (expectedCount > 0 && (order.glassOrderStatus === 'not_ordered' || !order.glassOrderStatus)) {
      statusWrong++;
    }
  }

  console.log('=== ZLECENIA Z GLASS ORDER ITEMS ===');
  console.log('Zlecenia z dopasowanymi GlassOrderItems:', matchedInOrder.length);
  console.log('Poprawny orderedGlassCount:', correct);
  console.log('Bledny orderedGlassCount (wymaga update):', needsUpdate);
  console.log('Bledny status (not_ordered ale ma szyby):', statusWrong);

  // Sprawdz GlassDeliveryItems - ile ma dopasowane do Order?
  const deliveryGroups = await p.glassDeliveryItem.groupBy({
    by: ['orderNumber'],
    _sum: { quantity: true }
  });
  const deliveriesMatched = deliveryGroups.filter(d => orderSet.has(d.orderNumber));
  console.log('\n=== GLASS DELIVERY ITEMS ===');
  console.log('Unikalne orderNumbers w deliveryItems:', deliveryGroups.length);
  console.log('Dopasowane do Order:', deliveriesMatched.length);

  // Sprawdz deliveredGlassCount
  const ordersWithDeliveries = await p.order.findMany({
    where: { orderNumber: { in: deliveriesMatched.map(d => d.orderNumber) } },
    select: { orderNumber: true, deliveredGlassCount: true, glassOrderStatus: true }
  });
  const delivOrderMap = new Map(ordersWithDeliveries.map(o => [o.orderNumber, o]));

  let delivNeedsUpdate = 0;
  let delivCorrect = 0;
  for (const d of deliveriesMatched) {
    const order = delivOrderMap.get(d.orderNumber);
    if (!order) continue;
    if ((order.deliveredGlassCount || 0) !== d._sum.quantity) {
      delivNeedsUpdate++;
    } else {
      delivCorrect++;
    }
  }

  console.log('Poprawny deliveredGlassCount:', delivCorrect);
  console.log('Bledny deliveredGlassCount:', delivNeedsUpdate);

  // Podsumowanie: ile zlecen wymaga naprawy
  const allAffected = new Set();
  for (const g of matchedInOrder) {
    const order = orderMap.get(g.orderNumber);
    if (order && (order.orderedGlassCount || 0) !== g._sum.quantity) allAffected.add(g.orderNumber);
    if (order && g._sum.quantity > 0 && (order.glassOrderStatus === 'not_ordered' || !order.glassOrderStatus)) allAffected.add(g.orderNumber);
  }
  for (const d of deliveriesMatched) {
    const order = delivOrderMap.get(d.orderNumber);
    if (order && (order.deliveredGlassCount || 0) !== d._sum.quantity) allAffected.add(d.orderNumber);
  }

  console.log('\n=== PODSUMOWANIE NAPRAWY ===');
  console.log('Lacznie zlecen wymagajacych naprawy:', allAffected.size);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
