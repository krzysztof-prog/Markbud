import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Znajdź Order 53896
  const order = await prisma.order.findUnique({
    where: { orderNumber: '53896' },
    include: { glasses: true },
  });

  if (!order) {
    console.log('Nie znaleziono zlecenia 53896');
    return;
  }

  console.log('Zlecenie:', order.orderNumber);
  console.log('Aktualna liczba rekordów OrderGlass:', order.glasses.length);
  console.log(
    'Aktualna suma quantity:',
    order.glasses.reduce((s, g) => s + g.quantity, 0)
  );
  console.log('Aktualny totalGlasses:', order.totalGlasses);

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

  // Weryfikacja
  const updated = await prisma.order.findUnique({
    where: { orderNumber: '53896' },
    include: { glasses: { select: { lp: true, quantity: true } } },
  });

  console.log('\n=== PO NAPRAWIE ===');
  console.log('totalGlasses:', updated?.totalGlasses);
  console.log(
    'Suma quantity:',
    updated?.glasses.reduce((s, g) => s + g.quantity, 0)
  );
  console.log('Szczegóły:');
  updated?.glasses.forEach((g) => console.log(`  lp=${g.lp} qty=${g.quantity}`));

  await prisma.$disconnect();
}

main();
