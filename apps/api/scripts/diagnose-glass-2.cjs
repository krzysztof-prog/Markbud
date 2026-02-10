const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const allOrders = await p.order.findMany({ select: { orderNumber: true } });
  const orderSet = new Set(allOrders.map(o => o.orderNumber));

  const glassGroups = await p.glassOrderItem.groupBy({
    by: ['orderNumber'],
    _sum: { quantity: true }
  });

  // 5-cyfrowe osierocone
  const orphaned5 = glassGroups
    .filter(g => !orderSet.has(g.orderNumber) && g.orderNumber.length === 5)
    .map(g => g.orderNumber)
    .sort();

  // 5-cyfrowe w Order
  const order5 = allOrders
    .filter(o => o.orderNumber.length === 5)
    .map(o => o.orderNumber)
    .sort();

  // Zakres numerow
  const orphanedNums = orphaned5.filter(n => /^\d+$/.test(n)).map(Number).sort((a, b) => a - b);
  const orderNums = order5.filter(n => /^\d+$/.test(n)).map(Number).sort((a, b) => a - b);

  console.log('=== ZAKRESY NUMEROW 5-CYFROWYCH ===');
  console.log('Orphaned min:', orphanedNums[0], 'max:', orphanedNums[orphanedNums.length - 1], 'count:', orphanedNums.length);
  console.log('Order min:', orderNums[0], 'max:', orderNums[orderNums.length - 1], 'count:', orderNums.length);

  // Ile orphaned jest w zakresie istniejacych zlecen?
  const minOrder = orderNums[0];
  const maxOrder = orderNums[orderNums.length - 1];
  const inRange = orphanedNums.filter(n => n >= minOrder && n <= maxOrder);
  const belowRange = orphanedNums.filter(n => n < minOrder);
  const aboveRange = orphanedNums.filter(n => n > maxOrder);

  console.log('\nOrphaned w zakresie zlecen (' + minOrder + '-' + maxOrder + '):', inRange.length);
  console.log('Orphaned ponizej zakresu (stare zlecenia):', belowRange.length);
  console.log('Orphaned powyzej zakresu:', aboveRange.length);

  // Pokaz overlap
  console.log('\nOrphaned w zakresie zlecen (przyklady):', inRange.slice(0, 30));

  // Moze te numery to stare - sprobuj sprawdzic daty GlassOrder
  const glassOrders = await p.glassOrder.findMany({
    select: { id: true, glassOrderNumber: true, orderDate: true },
    orderBy: { orderDate: 'asc' }
  });
  console.log('\n=== GLASS ORDERS (zamowienia) ===');
  console.log('Total:', glassOrders.length);
  if (glassOrders.length > 0) {
    console.log('Oldest:', glassOrders[0].orderDate, glassOrders[0].glassOrderNumber);
    console.log('Newest:', glassOrders[glassOrders.length - 1].orderDate, glassOrders[glassOrders.length - 1].glassOrderNumber);
  }

  // Ile GlassOrderItems per GlassOrder?
  const itemsPerOrder = await p.glassOrderItem.groupBy({
    by: ['glassOrderId'],
    _count: true,
    _sum: { quantity: true }
  });

  // Sprawdz ile GlassOrders ma TYLKO osierocone numery vs mieszane
  let fullyOrphaned = 0;
  let fullyMatched = 0;
  let mixed = 0;

  for (const go of glassOrders) {
    const items = await p.glassOrderItem.findMany({
      where: { glassOrderId: go.id },
      select: { orderNumber: true }
    });
    const unique = [...new Set(items.map(i => i.orderNumber))];
    const matched = unique.filter(n => orderSet.has(n));
    const orphan = unique.filter(n => !orderSet.has(n));

    if (matched.length === 0) fullyOrphaned++;
    else if (orphan.length === 0) fullyMatched++;
    else mixed++;
  }

  console.log('\nGlassOrders w calosci dopasowane:', fullyMatched);
  console.log('GlassOrders w calosci osierocone:', fullyOrphaned);
  console.log('GlassOrders mieszane (czesc dopasowana, czesc nie):', mixed);

  // Sprawdz te 9-cyfrowe - to moze byc YYMMDD + orderSuffix (3 cyfry dostawcy)
  // np. 250120871 = 25-01-20 + 871 (numer dostawcy?)
  // Sprawdz czy suffix 871 to jakis profil/dostawca
  const suffixes9 = {};
  const orphaned9 = glassGroups
    .filter(g => !orderSet.has(g.orderNumber) && g.orderNumber.length === 9)
    .map(g => g.orderNumber);
  for (const n of orphaned9) {
    const suffix = n.slice(6);
    if (!suffixes9[suffix]) suffixes9[suffix] = 0;
    suffixes9[suffix]++;
  }
  console.log('\n=== 9-CYFROWE SUFFIKSY (YYMMDDXXX) ===');
  console.log(Object.entries(suffixes9).sort((a, b) => b[1] - a[1]).slice(0, 20));

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
