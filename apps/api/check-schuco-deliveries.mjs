import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Sprawdź dostawy Schuco zawierające numery zleceń 53714 lub 53716
  const deliveries = await prisma.schucoDelivery.findMany({
    where: {
      OR: [
        { orderNumber: { contains: '53714' } },
        { orderNumber: { contains: '53716' } },
        { extractedOrderNums: { contains: '53714' } },
        { extractedOrderNums: { contains: '53716' } }
      ]
    },
    include: {
      orderLinks: true
    }
  });

  console.log('=== Znalezione dostawy Schuco ===');
  console.log(JSON.stringify(deliveries, null, 2));

  // Sprawdź też wszystkie linki
  const allLinks = await prisma.orderSchucoLink.findMany({
    include: {
      order: { select: { orderNumber: true } },
      schucoDelivery: { select: { orderNumber: true } }
    }
  });

  console.log('\n=== Wszystkie linki OrderSchucoLink ===');
  console.log(JSON.stringify(allLinks, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
