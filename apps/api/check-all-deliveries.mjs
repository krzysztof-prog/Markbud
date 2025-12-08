import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const deliveries = await prisma.delivery.findMany({
  orderBy: { deliveryDate: 'asc' },
  select: {
    id: true,
    deliveryNumber: true,
    deliveryDate: true
  }
});

console.log('All deliveries in database:');
console.log('============================\n');

// Group by date
const byDate = new Map();
for (const d of deliveries) {
  const dateKey = d.deliveryDate.toISOString().split('T')[0];
  if (!byDate.has(dateKey)) {
    byDate.set(dateKey, []);
  }
  byDate.get(dateKey).push(d);
}

for (const [date, dels] of byDate.entries()) {
  console.log(`📅 ${date}:`);
  for (const d of dels) {
    console.log(`   ID ${d.id}: "${d.deliveryNumber}"`);
  }
  console.log('');
}

console.log(`Total: ${deliveries.length} deliveries`);

await prisma.$disconnect();
