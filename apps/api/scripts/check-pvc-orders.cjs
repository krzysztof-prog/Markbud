const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Symulacja nowego query (bez shippedQty > 0)
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-01-31T23:59:59.999Z');

  const items = await prisma.schucoOrderItem.findMany({
    where: {
      deliveryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      schucoDelivery: {
        select: {
          orderNumber: true,
          shippingStatus: true,
        },
      },
    },
    orderBy: { deliveryDate: 'asc' },
  });

  console.log('=== PO ZMIANIE (bez filtra shippedQty > 0) ===');
  console.log('Liczba pozycji w styczniu 2026:', items.length);

  // Grupuj po tygodniu
  const byWeek = {};
  for (const item of items) {
    if (!item.deliveryDate) continue;
    const date = new Date(item.deliveryDate);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    const weekKey = monday.toISOString().split('T')[0];

    if (byWeek[weekKey] === undefined) byWeek[weekKey] = [];
    byWeek[weekKey].push(item);
  }

  console.log('');
  console.log('=== TYGODNIE ===');
  for (const week of Object.keys(byWeek).sort()) {
    const weekItems = byWeek[week];
    const uniqueOrders = new Set(weekItems.map(i => i.schucoDelivery.orderNumber));
    console.log(`Tydzień od ${week}: ${weekItems.length} pozycji, ${uniqueOrders.size} zamówień`);
  }

  // Unikalne zamówienia
  const uniqueOrders = new Set(items.map(i => i.schucoDelivery.orderNumber));
  console.log('');
  console.log('=== PODSUMOWANIE ===');
  console.log('Unikalnych zamówień:', uniqueOrders.size);
  console.log('Łącznie pozycji:', items.length);

  await prisma.$disconnect();
}

check().catch(console.error);
