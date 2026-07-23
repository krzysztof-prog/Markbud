const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  console.log('=== ZAMÓWIENIA 53898 ===');
  const orders = await p.order.findMany({
    where: { orderNumber: { contains: '53898' } },
    select: {
      id: true, orderNumber: true, orderSuffix: true,
      glassDeliveryDate: true, glassOrderStatus: true,
      orderedGlassCount: true, deliveredGlassCount: true,
      glassOrderNote: true
    }
  });
  console.log(JSON.stringify(orders, null, 2));

  console.log('\n=== GLASS ORDER ITEMS dla 53898 ===');
  const glassItems = await p.glassOrderItem.findMany({
    where: { orderNumber: { contains: '53898' } },
    include: {
      glassOrder: {
        select: {
          glassOrderNumber: true, expectedDeliveryDate: true,
          actualDeliveryDate: true, status: true
        }
      }
    }
  });
  console.log(JSON.stringify(glassItems, null, 2));

  console.log('\n=== GLASS DELIVERY ITEMS dla 53898 ===');
  const delivItems = await p.glassDeliveryItem.findMany({
    where: { orderNumber: { contains: '53898' } },
    include: {
      delivery: { select: { deliveryDate: true, rackNumber: true } }
    }
  });
  console.log(JSON.stringify(delivItems, null, 2));
}

check().catch(console.error).finally(() => p.$disconnect());
