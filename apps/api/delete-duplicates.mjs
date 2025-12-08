import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('🗑️  Usuwam duplikaty utworzone podczas restartów...\n');

// For each date, keep only first 3 deliveries (I, II, III which are original)
// Delete IV, V, VI, etc. which were created by file-watcher on restarts

const dates = [
  '2025-12-03', // 04.12
  '2025-12-04', // 05.12
  '2025-12-07', // 08.12
  '2025-12-08', // 09.12
  '2025-12-10', // 11.12
  '2025-12-11', // 12.12
  '2025-12-14', // 15.12
  '2025-12-15', // 16.12
  '2025-12-17', // 18.12
];

let totalDeleted = 0;

for (const dateStr of dates) {
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const deliveries = await prisma.delivery.findMany({
    where: {
      deliveryDate: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: { id: 'asc' },
    include: {
      deliveryOrders: true
    }
  });

  if (deliveries.length > 3) {
    console.log(`📅 ${dateStr}: Znaleziono ${deliveries.length} dostaw`);
    
    // Keep first 3, delete rest if they're empty
    const toDelete = deliveries.slice(3);
    
    for (const d of toDelete) {
      if (d.deliveryOrders.length === 0) {
        console.log(`   ❌ Usuwam pustą dostawę ID ${d.id}: "${d.deliveryNumber}"`);
        await prisma.delivery.delete({ where: { id: d.id } });
        totalDeleted++;
      } else {
        console.log(`   ⚠️  Pomijam dostawę ID ${d.id} (ma ${d.deliveryOrders.length} zamówień): "${d.deliveryNumber}"`);
      }
    }
  }
}

console.log(`\n✅ Usunięto ${totalDeleted} pustych duplikatów`);

await prisma.$disconnect();
