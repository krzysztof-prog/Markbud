const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const orderNumber = process.argv[2] || '53653';

async function main() {
  const order = await p.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      glassOrderStatus: true,
      glassDeliveryDate: true,
    }
  });

  console.log(`=== Zlecenie ${orderNumber} ===`);
  console.log(order || 'NIE ZNALEZIONO');

  const items = await p.glassOrderItem.findMany({
    where: { orderNumber },
    include: {
      glassOrder: {
        select: {
          id: true,
          glassOrderNumber: true,
          deletedAt: true,
          expectedDeliveryDate: true,
        }
      }
    }
  });

  console.log('');
  console.log(`=== GlassOrderItems dla ${orderNumber} ===`);
  console.log('Znaleziono:', items.length, 'pozycji');
  if (items.length > 0) {
    console.log('GlassOrder:', items[0].glassOrder);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    console.log('Suma ilości:', totalQty);
  }

  await p.$disconnect();
}
main();
