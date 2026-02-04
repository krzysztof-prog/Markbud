import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Zlecenia do naprawy
  const orderNumbers = ['53817', '53816', '53818', '06146'];

  for (const orderNumber of orderNumbers) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { glasses: true },
    });

    if (!order) {
      console.log(`Nie znaleziono zlecenia ${orderNumber}`);
      continue;
    }

    const currentSum = order.glasses.reduce((s, g) => s + g.quantity, 0);
    console.log(`\n=== Zlecenie ${orderNumber} ===`);
    console.log(`  Przed: totalGlasses=${order.totalGlasses}, suma qty=${currentSum}, rekordów=${order.glasses.length}`);

    // Ustaw quantity=1 dla każdego rekordu
    await prisma.orderGlass.updateMany({
      where: { orderId: order.id },
      data: { quantity: 1 },
    });

    // Ustaw totalGlasses = liczba rekordów
    await prisma.order.update({
      where: { id: order.id },
      data: { totalGlasses: order.glasses.length },
    });

    console.log(`  Po: totalGlasses=${order.glasses.length}, suma qty=${order.glasses.length}`);
  }

  console.log('\n=== WERYFIKACJA ===');
  for (const orderNumber of orderNumbers) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        totalGlasses: true,
        glasses: { select: { quantity: true } },
      },
    });

    if (order) {
      const sum = order.glasses.reduce((s, g) => s + g.quantity, 0);
      console.log(`  ${orderNumber}: totalGlasses=${order.totalGlasses}, suma qty=${sum}`);
    }
  }

  await prisma.$disconnect();
}

main();
