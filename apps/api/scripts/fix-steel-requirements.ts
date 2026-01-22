/**
 * Skrypt naprawczy - oznacz steel requirements jako completed
 * (dla zleceń które miały błąd z calculatedStock)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Szukam nieoznaczonych steel requirements dla zleceń completed...');

  const result = await prisma.orderSteelRequirement.updateMany({
    where: {
      order: { status: 'completed' },
      status: { not: 'completed' }
    },
    data: { status: 'completed' }
  });

  console.log(`Zaktualizowano ${result.count} steel requirements`);
  await prisma.$disconnect();
}

main();
