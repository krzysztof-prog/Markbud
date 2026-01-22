import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Szukaj items ze zleceniem 53727
  const items = await prisma.glassDeliveryItem.findMany({
    where: {
      orderNumber: '53727'
    },
    include: {
      glassDelivery: true
    }
  });

  console.log('Items ze zleceniem 53727:', items.length);
  for (const item of items) {
    console.log('Item #' + item.id + ':');
    console.log('  orderNumber:', item.orderNumber);
    console.log('  customerOrderNumber (item):', item.customerOrderNumber);
    console.log('  rackNumber (item):', item.rackNumber);
    console.log('  parent delivery ID:', item.glassDeliveryId);
    console.log('  parent customerOrderNumber:', item.glassDelivery.customerOrderNumber);
    console.log('  parent rackNumber:', item.glassDelivery.rackNumber);
    console.log('');
  }

  await prisma.$disconnect();
}
check();
