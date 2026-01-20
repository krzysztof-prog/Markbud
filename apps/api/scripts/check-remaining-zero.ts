import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stillZero = await prisma.order.findMany({
    where: {
      OR: [
        { valueEur: 0 },
        { valueEur: null },
      ],
    },
    select: {
      orderNumber: true,
      valueEur: true,
      valuePln: true,
    },
    orderBy: { orderNumber: 'asc' },
  });

  console.log(`\nZlecenia nadal bez ceny EUR: ${stillZero.length}\n`);
  stillZero.forEach(o => {
    console.log(`  ${o.orderNumber} | EUR: ${o.valueEur} | PLN: ${o.valuePln}`);
  });

  await prisma.$disconnect();
}

main();
