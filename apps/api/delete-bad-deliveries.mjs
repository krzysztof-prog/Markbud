import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('🗑️  Usuwam dostawy z nieprawidłowymi nazwami...\n');

// Find deliveries with only roman numerals (I, II, III, etc.)
const badDeliveries = await prisma.delivery.findMany({
  where: {
    deliveryNumber: {
      in: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    }
  }
});

console.log(`Znaleziono ${badDeliveries.length} dostaw do usunięcia:\n`);

for (const d of badDeliveries) {
  console.log(`  - ID ${d.id}: "${d.deliveryNumber}" (${d.deliveryDate.toISOString().split('T')[0]})`);

  // Delete the delivery
  await prisma.delivery.delete({
    where: { id: d.id }
  });
}

console.log(`\n✅ Usunięto ${badDeliveries.length} dostaw`);

await prisma.$disconnect();
