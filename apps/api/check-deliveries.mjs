import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const deliveries = await prisma.delivery.findMany({
  where: {
    deliveryDate: {
      gte: new Date('2025-12-08T00:00:00'),
      lte: new Date('2025-12-08T23:59:59')
    }
  },
  select: {
    id: true,
    deliveryNumber: true,
    deliveryDate: true
  }
});

console.log('Deliveries on Dec 8th:');
console.log(JSON.stringify(deliveries, null, 2));

await prisma.$disconnect();
