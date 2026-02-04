import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function parseCsvLine(line: string): string[] {
  return line.split(';').map((s) => s.trim());
}

async function main() {
  const filePath = 'C:/DEV_DATA/uzyte_bele/archiwum/53896_uzyte_bele.csv';
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  // Parsuj szyby z pliku
  let inGlassSection = false;
  let glassesHeaderSkipped = false;
  const glasses: Array<{
    lp: number;
    position: number;
    widthMm: number;
    heightMm: number;
    quantity: number;
    packageType: string;
    areaSqm: number;
  }> = [];
  let totalGlassesFromHeader = 0;

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    const parts = parseCsvLine(line);

    // Szukaj "Łączna liczba szyb" w górnej sekcji (przed listą szyb)
    if (
      !inGlassSection &&
      (lineLower.includes('laczna lic') || lineLower.includes('łączna lic')) &&
      lineLower.includes('szyb')
    ) {
      totalGlassesFromHeader = parseInt(parts[1]) || 0;
      console.log('Znaleziono totalGlasses w nagłówku:', totalGlassesFromHeader);
    }

    // Początek sekcji szyb
    if (lineLower.includes('lista szyb')) {
      inGlassSection = true;
      glassesHeaderSkipped = false;
      continue;
    }

    // Koniec sekcji szyb
    if (
      inGlassSection &&
      (lineLower.includes('materialowka') || lineLower.includes('laczna lic'))
    ) {
      break;
    }

    // W sekcji szyb
    if (inGlassSection) {
      // Pomiń nagłówek
      if (
        !glassesHeaderSkipped &&
        (parts[0]?.toLowerCase().includes('lp') ||
          parts[1]?.toLowerCase().includes('pozycja'))
      ) {
        glassesHeaderSkipped = true;
        continue;
      }

      // Parsuj wiersz danych
      if (parts.length >= 6 && parts[0].match(/^\d+$/)) {
        const widthMm = parseInt(parts[2]) || 0;
        const heightMm = parseInt(parts[3]) || 0;
        const quantity = parseInt(parts[4]) || 1;
        const areaSqm = (widthMm * heightMm) / 1000000;

        glasses.push({
          lp: parseInt(parts[0]),
          position: parseInt(parts[1]) || 0,
          widthMm,
          heightMm,
          quantity,
          packageType: parts[5] || '',
          areaSqm: Math.round(areaSqm * 10000) / 10000,
        });
      }
    }
  }

  console.log('Sparsowano szyb:', glasses.length);
  console.log(
    'Suma quantity:',
    glasses.reduce((s, g) => s + g.quantity, 0)
  );
  console.log('totalGlasses z nagłówka:', totalGlassesFromHeader);

  // Znajdź Order
  const order = await prisma.order.findUnique({
    where: { orderNumber: '53896' },
  });

  if (!order) {
    console.log('Nie znaleziono zlecenia 53896');
    return;
  }

  console.log('\nAktualizuję zlecenie ID:', order.id);

  // Aktualizuj Order - użyj wartości z nagłówka
  await prisma.order.update({
    where: { id: order.id },
    data: { totalGlasses: totalGlassesFromHeader },
  });

  // Aktualizuj OrderGlass
  await prisma.orderGlass.deleteMany({ where: { orderId: order.id } });

  for (const glass of glasses) {
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

  console.log('Zaktualizowano', glasses.length, 'rekordów OrderGlass');

  // Weryfikacja
  const updated = await prisma.order.findUnique({
    where: { orderNumber: '53896' },
    select: {
      totalGlasses: true,
      glasses: { select: { lp: true, quantity: true } },
    },
  });

  console.log('\n=== WERYFIKACJA ===');
  console.log('totalGlasses w bazie:', updated?.totalGlasses);
  console.log('Rekordy OrderGlass:', updated?.glasses.length);
  console.log(
    'Suma quantity:',
    updated?.glasses.reduce((s, g) => s + g.quantity, 0)
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
