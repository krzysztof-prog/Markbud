import { PrismaClient } from '@prisma/client';
import { UzyteBeleParser } from '../src/services/parsers/UzyteBeleParser.js';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function reimport() {
  const filePath = 'C:/DEV_DATA/uzyte_bele/archiwum/53896_uzyte_bele.csv';
  const content = fs.readFileSync(filePath, 'utf-8');

  const parser = new UzyteBeleParser();
  const parsed = parser.parse(content, '53896_uzyte_bele.csv');

  console.log('Sparsowane totals:', parsed.totals);
  console.log('Liczba szyb (glasses):', parsed.glasses.length);
  console.log(
    'Suma quantity:',
    parsed.glasses.reduce((s, g) => s + g.quantity, 0)
  );

  // Znajdź Order
  const order = await prisma.order.findUnique({
    where: { orderNumber: '53896' },
  });

  if (!order) {
    console.log('Nie znaleziono zlecenia 53896');
    return;
  }

  // Aktualizuj Order
  await prisma.order.update({
    where: { id: order.id },
    data: { totalGlasses: parsed.totals.glasses },
  });

  console.log('\nZaktualizowano Order 53896:');
  console.log('  totalGlasses:', parsed.totals.glasses);

  // Aktualizuj OrderGlass - usuń stare i dodaj nowe
  await prisma.orderGlass.deleteMany({ where: { orderId: order.id } });

  for (const glass of parsed.glasses) {
    await prisma.orderGlass.create({
      data: {
        orderId: order.id,
        lp: glass.lp,
        position: glass.position,
        widthMm: glass.widthMm,
        heightMm: glass.heightMm,
        quantity: glass.quantity,
        packageType: glass.packageType,
        areaSqm: glass.areaSqm,
      },
    });
  }

  console.log('  Zaktualizowano', parsed.glasses.length, 'rekordów OrderGlass');

  // Weryfikacja
  const updated = await prisma.order.findUnique({
    where: { orderNumber: '53896' },
    select: {
      totalGlasses: true,
      glasses: { select: { quantity: true } },
    },
  });

  console.log('\nWeryfikacja:');
  console.log('  totalGlasses w bazie:', updated?.totalGlasses);
  console.log(
    '  Suma quantity z OrderGlass:',
    updated?.glasses.reduce((s, g) => s + g.quantity, 0)
  );

  await prisma.$disconnect();
}

reimport().catch((e) => {
  console.error(e);
  process.exit(1);
});
