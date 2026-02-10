const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const zamowione = await p.order.findMany({
    where: { orderedGlassCount: { gt: 0 }, glassDeliveryDate: null, deletedAt: null },
    select: { id: true, orderNumber: true, orderedGlassCount: true, deliveredGlassCount: true, glassDeliveryDate: true, glassOrderNote: true, totalGlasses: true },
    take: 10
  });
  console.log('Zamowione bez daty:', zamowione.length);
  zamowione.forEach(o => console.log(' ', o.orderNumber, '| ordered:', o.orderedGlassCount, '| delivered:', o.deliveredGlassCount, '| needed:', o.totalGlasses, '| note:', o.glassOrderNote));

  const withNote = await p.order.findMany({
    where: { glassOrderNote: { not: null }, deletedAt: null },
    select: { orderNumber: true, glassOrderNote: true },
    take: 10
  });
  console.log('\nZ notatka:', withNote.length);
  withNote.forEach(o => console.log(' ', o.orderNumber, '|', o.glassOrderNote));

  const anyOrdered = await p.order.count({ where: { orderedGlassCount: { gt: 0 }, deletedAt: null } });
  console.log('\nLacznie z orderedGlassCount > 0:', anyOrdered);

  const withDate = await p.order.findMany({
    where: { glassDeliveryDate: { not: null }, deletedAt: null, orderedGlassCount: { gt: 0 } },
    select: { orderNumber: true, glassDeliveryDate: true, orderedGlassCount: true },
    take: 5
  });
  console.log('\nZ glassDeliveryDate:', withDate.length);
  withDate.forEach(o => console.log(' ', o.orderNumber, '| date:', o.glassDeliveryDate, '| ordered:', o.orderedGlassCount));

  await p.$disconnect();
}

main().catch(console.error);
