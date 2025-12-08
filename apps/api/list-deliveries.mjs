import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const deliveries = await prisma.delivery.findMany({
  orderBy: [{ deliveryDate: 'asc' }, { id: 'asc' }],
  select: { id: true, deliveryNumber: true, deliveryDate: true }
});

console.log('Wszystkie dostawy:', deliveries.length);
console.log('');

let currentDate = null;
for (const d of deliveries) {
  const date = d.deliveryDate.toISOString().split('T')[0];
  if (date !== currentDate) {
    console.log('');
    console.log(date + ':');
    currentDate = date;
  }
  const num = d.deliveryNumber || 'NULL';
  console.log('  ID ' + d.id + ': ' + num);
}

await prisma.$disconnect();
