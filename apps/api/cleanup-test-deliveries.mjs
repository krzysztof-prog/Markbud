import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('🗑️  Usuwam testowe dostawy utworzone podczas implementacji...\n');

// Delete the test delivery I just created
const testDelivery = await prisma.delivery.findUnique({
  where: { id: 52 }
});

if (testDelivery) {
  await prisma.delivery.delete({
    where: { id: 52 }
  });
  console.log(`✅ Usunięto testową dostawę ID 52: "${testDelivery.deliveryNumber}"`);
} else {
  console.log('⏭️  Testowa dostawa ID 52 nie istnieje');
}

// Also check if there are any other test deliveries on 2025-12-20
const deliveriesOn20th = await prisma.delivery.findMany({
  where: {
    deliveryDate: {
      gte: new Date('2025-12-20T00:00:00'),
      lte: new Date('2025-12-20T23:59:59')
    }
  }
});

if (deliveriesOn20th.length > 0) {
  console.log(`\nZnaleziono ${deliveriesOn20th.length} dostaw na 20.12.2025:`);
  for (const d of deliveriesOn20th) {
    console.log(`  - ID ${d.id}: "${d.deliveryNumber}"`);
    await prisma.delivery.delete({ where: { id: d.id } });
    console.log(`    ✅ Usunięto`);
  }
}

console.log('\n✨ Zakończono czyszczenie testowych dostaw');

await prisma.$disconnect();
