const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderNumbers = ['53626', '53627', '53628', '53629', '53630', '53631'];

  for (const orderNumber of orderNumbers) {
    console.log('\n========== ZLECENIE', orderNumber, '==========');

    // Order counts
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        totalGlasses: true,
        orderedGlassCount: true,
        deliveredGlassCount: true,
      }
    });
    if (!order) {
      console.log('Zlecenie nie istnieje');
      continue;
    }
    console.log('totalGlasses:', order.totalGlasses, '| orderedGlassCount:', order.orderedGlassCount, '| deliveredGlassCount:', order.deliveredGlassCount);

    // OrderWindow real count
    const windowSum = await prisma.orderWindow.aggregate({
      where: { order: { orderNumber } },
      _sum: { quantity: true }
    });
    console.log('OrderWindow sum(quantity):', windowSum._sum.quantity || 0);

    // GlassOrderItem - group by glassOrder
    const glassItems = await prisma.glassOrderItem.findMany({
      where: { orderNumber },
      include: { glassOrder: { select: { glassOrderNumber: true, deletedAt: true } } }
    });

    // Group by glass order number
    const byGlassOrder = {};
    for (const item of glassItems) {
      const key = item.glassOrder?.glassOrderNumber || 'unknown';
      if (!byGlassOrder[key]) byGlassOrder[key] = { count: 0, qty: 0, deleted: item.glassOrder?.deletedAt };
      byGlassOrder[key].count++;
      byGlassOrder[key].qty += item.quantity;
    }

    console.log('GlassOrderItems breakdown:');
    for (const [glassOrderNum, data] of Object.entries(byGlassOrder)) {
      console.log('  -', glassOrderNum, ':', data.count, 'pozycji, qty:', data.qty, data.deleted ? '(DELETED)' : '');
    }
  }

  // Sprawdź również zamówienia szyb które mają te numery w nazwie
  console.log('\n\n========== ZAMÓWIENIA SZYB ZAWIERAJĄCE 536XX ==========');
  const glassOrders = await prisma.glassOrder.findMany({
    where: {
      glassOrderNumber: { contains: '536' }
    },
    select: {
      id: true,
      glassOrderNumber: true,
      deletedAt: true,
      _count: { select: { items: true } }
    }
  });

  for (const go of glassOrders) {
    console.log(go.glassOrderNumber, '- items:', go._count.items, go.deletedAt ? '(DELETED)' : '');
  }

  // Sprawdź zamówienia 02572
  console.log('\n\n========== ZAMÓWIENIA SZYB ZAWIERAJĄCE 02572 ==========');
  const glassOrders02572 = await prisma.glassOrder.findMany({
    where: {
      glassOrderNumber: { contains: '02572' }
    },
    select: {
      id: true,
      glassOrderNumber: true,
      deletedAt: true,
      _count: { select: { items: true } }
    }
  });

  for (const go of glassOrders02572) {
    console.log(go.glassOrderNumber, '- items:', go._count.items, go.deletedAt ? '(DELETED)' : '');
  }

  // Sprawdź jakie unikalne orderNumber są w GlassOrderItem dla zamówień 02572
  console.log('\n\n========== UNIKALNE orderNumber W POZYCJACH ZAMÓWIEŃ 02572 ==========');
  const items02572 = await prisma.glassOrderItem.findMany({
    where: {
      glassOrder: { glassOrderNumber: { contains: '02572' } }
    },
    select: {
      orderNumber: true,
      quantity: true,
    }
  });

  const uniqueOrders = {};
  for (const item of items02572) {
    if (!uniqueOrders[item.orderNumber]) uniqueOrders[item.orderNumber] = 0;
    uniqueOrders[item.orderNumber] += item.quantity;
  }

  for (const [on, qty] of Object.entries(uniqueOrders).sort()) {
    console.log('  ', on, ':', qty, 'szt.');
  }
}

async function compareDetails() {
  console.log('\n\n========== SZCZEGÓŁY DLA 53629 ==========');

  // Sprawdź OrderWindow
  const windows = await prisma.orderWindow.findMany({
    where: { order: { orderNumber: '53629' } },
    select: { id: true, quantity: true, widthMm: true, heightMm: true, profileType: true, position: true }
  });
  console.log('\nOrderWindow:', windows.length, 'rekordów');
  for (const w of windows) {
    console.log('  -', w.widthMm, 'x', w.heightMm, 'qty:', w.quantity, 'pos:', w.position, 'profile:', w.profileType || 'brak');
  }

  // Sprawdź GlassOrderItem
  console.log('\nGlassOrderItem (35 pozycji):');
  const items = await prisma.glassOrderItem.findMany({
    where: { orderNumber: '53629' },
    select: { widthMm: true, heightMm: true, quantity: true, glassType: true, position: true },
    orderBy: { position: 'asc' }
  });
  for (const item of items) {
    console.log('  -', item.widthMm, 'x', item.heightMm, 'qty:', item.quantity, 'poz:', item.position, '|', (item.glassType || '').substring(0, 30));
  }
  console.log('Suma z GlassOrderItem:', items.reduce((s, i) => s + i.quantity, 0));
}

main()
  .then(() => compareDetails())
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
