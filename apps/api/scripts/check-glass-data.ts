import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { orderNumber: '53896' },
    select: {
      id: true,
      orderNumber: true,
      totalGlasses: true,
      glasses: {
        select: { lp: true, quantity: true, widthMm: true, heightMm: true },
        orderBy: { lp: 'asc' },
      },
    },
  });

  if (order) {
    console.log('Zlecenie:', order.orderNumber);
    console.log('totalGlasses w bazie:', order.totalGlasses);
    console.log('Liczba rekordów OrderGlass:', order.glasses.length);
    console.log(
      'Suma quantity z OrderGlass:',
      order.glasses.reduce((s, g) => s + g.quantity, 0)
    );
    console.log('\nSzczegóły OrderGlass:');
    order.glasses.forEach((g) =>
      console.log(`  lp=${g.lp} qty=${g.quantity} ${g.widthMm}x${g.heightMm}`)
    );
  } else {
    console.log('Nie znaleziono zlecenia 53896');
  }

  await prisma.$disconnect();
}

main();
