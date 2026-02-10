/**
 * Sprawdza totalGlasses dla zlecenia
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const orderNumber = process.argv[2] || '53653';

async function main() {
  const o = await p.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      totalGlasses: true,  // STORED FIELD
      totalWindows: true,
      totalSashes: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      glassOrderStatus: true,
      glassDeliveryDate: true,
      _count: { select: { glasses: true } }
    }
  });

  console.log('=== Order', orderNumber, '===');
  console.log(JSON.stringify(o, null, 2));

  if (o) {
    // Sprawdź OrderGlass records (szyby potrzebne w zleceniu)
    const glasses = await p.orderGlass.findMany({
      where: { orderId: o.id },
      select: { id: true, quantity: true }
    });
    console.log('\nOrderGlass records (szyby w zleceniu):', glasses.length);
    const totalGlasses = glasses.reduce((s, g) => s + (g.quantity || 1), 0);
    console.log('Total quantity from OrderGlass:', totalGlasses);

    // Sprawdź GlassOrderItems (szyby zamówione u dostawcy)
    const items = await p.glassOrderItem.findMany({
      where: { orderNumber },
      select: { id: true, quantity: true }
    });
    console.log('\nGlassOrderItems (zamówione u dostawcy):', items.length);
    const totalOrdered = items.reduce((s, i) => s + i.quantity, 0);
    console.log('Total quantity from GlassOrderItems:', totalOrdered);

    console.log('\n=== Analiza ===');
    console.log('totalGlasses (potrzebne):', totalGlasses);
    console.log('orderedGlassCount (w bazie):', o.orderedGlassCount);
    console.log('deliveredGlassCount:', o.deliveredGlassCount);
    console.log('glassDeliveryDate:', o.glassDeliveryDate);

    if (totalGlasses === 0) {
      console.log('\n⚠️ PROBLEM: totalGlasses = 0 (brak OrderGlass records)');
      console.log('   Frontend pokaże "-" zamiast daty dostawy!');
    }
  }

  await p.$disconnect();
}

main();
