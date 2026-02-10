const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Szczegoly zlecen ze szprosami
  const szprosy = await p.order.findMany({
    where: { glassOrderNote: { not: null }, deletedAt: null },
    select: {
      orderNumber: true,
      glassOrderNote: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      totalGlasses: true,
      glassDeliveryDate: true,
      archivedAt: true,
      status: true
    }
  });
  console.log('Zlecenia ze szprosami:');
  szprosy.forEach(o => console.log(
    ' ', o.orderNumber,
    '| note:', o.glassOrderNote,
    '| ordered:', o.orderedGlassCount,
    '| delivered:', o.deliveredGlassCount,
    '| needed:', o.totalGlasses,
    '| deliveryDate:', o.glassDeliveryDate,
    '| archived:', o.archivedAt ? 'TAK' : 'NIE',
    '| status:', o.status
  ));

  await p.$disconnect();
}

main().catch(console.error);
