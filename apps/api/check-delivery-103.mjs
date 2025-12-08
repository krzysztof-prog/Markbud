import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const d = await prisma.delivery.findUnique({
  where: { id: 103 },
  include: { deliveryOrders: true }
});

if (d) {
  console.log(`Dostawa ${d.deliveryNumber} (ID: ${d.id})`);
  console.log(`Zamówień: ${d.deliveryOrders.length}`);
  
  if (d.deliveryOrders.length === 0) {
    await prisma.delivery.delete({ where: { id: 103 } });
    console.log('✅ Usunięto pustą dostawę');
  }
}

await prisma.$disconnect();
