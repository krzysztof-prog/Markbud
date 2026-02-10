const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Zlecenia widoczne na screenie użytkownika
  const orderNumbers = ['53930', '53929', '53927', '53926', '53925', '53924', '53923', '53922', '53921', '53917', '53915'];

  const orders = await p.order.findMany({
    where: { orderNumber: { in: orderNumbers }, deletedAt: null },
    select: {
      orderNumber: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      totalGlasses: true,
      glassDeliveryDate: true,
      glassOrderNote: true
    }
  });

  console.log('Sprawdzam zlecenia widoczne na screenie:\n');
  orders.sort((a, b) => parseInt(b.orderNumber) - parseInt(a.orderNumber));

  orders.forEach(o => {
    const needed = o.totalGlasses || 0;
    const ordered = o.orderedGlassCount || 0;
    const delivered = o.deliveredGlassCount || 0;
    const hasDate = !!o.glassDeliveryDate;

    // Warunek na "Zamówione bez daty" (klikalny):
    // ordered > 0 && delivered === 0 && !glassDeliveryDate
    const isZamowioneWithoutDate = ordered > 0 && delivered === 0 && !hasDate;

    console.log(
      o.orderNumber,
      '| needed:', needed,
      '| ordered:', ordered,
      '| delivered:', delivered,
      '| hasDate:', hasDate,
      '| isZamowioneWithoutDate:', isZamowioneWithoutDate,
      '| note:', o.glassOrderNote || '-'
    );
  });

  await p.$disconnect();
}

main().catch(console.error);
