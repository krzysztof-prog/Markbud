import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Keep only first 3 deliveries per day, delete empty extras
const dates = ['2025-12-03', '2025-12-04', '2025-12-07', '2025-12-08', '2025-12-10', '2025-12-11', '2025-12-14', '2025-12-15', '2025-12-17'];

let totalDeleted = 0;

for (const dateStr of dates) {
  const startOfDay = new Date(dateStr);
  const endOfDay = new Date(dateStr);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const deliveries = await prisma.delivery.findMany({
    where: {
      deliveryDate: {
        gte: startOfDay,
        lt: endOfDay
      }
    },
    orderBy: { id: 'asc' },
    include: { deliveryOrders: true }
  });

  if (deliveries.length > 3) {
    console.log(`${dateStr}: ${deliveries.length} dostaw`);
    
    // Keep first 3, check rest
    const toCheck = deliveries.slice(3);
    
    for (const d of toCheck) {
      if (d.deliveryOrders.length === 0) {
        console.log(`  ❌ Usuwam ID ${d.id}: "${d.deliveryNumber}"`);
        await prisma.delivery.delete({ where: { id: d.id } });
        totalDeleted++;
      } else {
        console.log(`  ⚠️  Zachowuję ID ${d.id} (ma ${d.deliveryOrders.length} zamówień): "${d.deliveryNumber}"`);
      }
    }
  }
}

console.log(`\n✅ Usunięto ${totalDeleted} pustych duplikatów`);

await prisma.$disconnect();
