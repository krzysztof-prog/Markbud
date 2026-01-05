import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      orderNumber: {
        in: ['53714', '53716']
      }
    },
    include: {
      schucoLinks: {
        include: {
          schucoDelivery: true
        }
      }
    }
  });

  console.log(JSON.stringify(orders, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
