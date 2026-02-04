import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Znajdź wszystkie zlecenia z różnicą między totalGlasses a sumą quantity z OrderGlass
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      totalGlasses: { not: null },
    },
    select: {
      orderNumber: true,
      totalGlasses: true,
      glasses: {
        select: { quantity: true },
      },
    },
  });

  console.log(`Sprawdzam ${orders.length} zleceń z totalGlasses...\n`);

  const mismatches: Array<{
    orderNumber: string;
    totalGlasses: number;
    sumQuantity: number;
    glassCount: number;
  }> = [];

  for (const order of orders) {
    const sumQuantity = order.glasses.reduce((s, g) => s + g.quantity, 0);
    const totalGlasses = order.totalGlasses ?? 0;

    // Sprawdź rozbieżność
    if (sumQuantity !== totalGlasses && order.glasses.length > 0) {
      mismatches.push({
        orderNumber: order.orderNumber,
        totalGlasses,
        sumQuantity,
        glassCount: order.glasses.length,
      });
    }
  }

  if (mismatches.length === 0) {
    console.log('Brak rozbieżności - wszystkie dane są spójne!');
  } else {
    console.log(`Znaleziono ${mismatches.length} zleceń z rozbieżnością:\n`);
    console.log('Nr zlecenia    | totalGlasses | Suma qty | Rekordów');
    console.log('-'.repeat(55));
    for (const m of mismatches.slice(0, 50)) {
      console.log(
        `${m.orderNumber.padEnd(14)} | ${String(m.totalGlasses).padStart(12)} | ${String(m.sumQuantity).padStart(8)} | ${m.glassCount}`
      );
    }
    if (mismatches.length > 50) {
      console.log(`... i ${mismatches.length - 50} więcej`);
    }
  }

  await prisma.$disconnect();
}

main();
