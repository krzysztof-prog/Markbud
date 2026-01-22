/**
 * Skrypt do utworzenia brakujących walidacji nadwyżek/braków szyb
 * Dla zleceń które mają deliveredGlassCount != orderedGlassCount
 * ale nie mają odpowiednich rekordów w GlassOrderValidation
 *
 * Uruchom: npx tsx scripts/create-missing-glass-validations.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Szukam zleceń z rozbieżnościami szyb bez walidacji...\n');

  // Znajdź zlecenia z nadwyżką lub brakiem
  const ordersWithDiscrepancy = await prisma.order.findMany({
    where: {
      orderedGlassCount: { gt: 0 },
      OR: [
        // Nadwyżka: delivered > ordered
        {
          deliveredGlassCount: { gt: 0 },
        },
      ],
    },
    select: {
      orderNumber: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      glassOrderStatus: true,
    },
  });

  // Filtruj tylko te z faktyczną rozbieżnością
  const discrepancies = ordersWithDiscrepancy.filter((o) => {
    const ordered = o.orderedGlassCount || 0;
    const delivered = o.deliveredGlassCount || 0;
    return delivered !== ordered && delivered > 0;
  });

  console.log(`Znaleziono ${discrepancies.length} zleceń z rozbieżnościami.\n`);

  // Sprawdź które już mają walidacje
  const orderNumbers = discrepancies.map((o) => o.orderNumber);
  const existingValidations = await prisma.glassOrderValidation.findMany({
    where: {
      orderNumber: { in: orderNumbers },
      validationType: { in: ['quantity_surplus', 'quantity_shortage'] },
      resolved: false,
    },
    select: {
      orderNumber: true,
      validationType: true,
    },
  });

  const existingSet = new Set(existingValidations.map((v) => `${v.orderNumber}-${v.validationType}`));

  // Przygotuj walidacje do utworzenia
  const validationsToCreate: {
    orderNumber: string;
    validationType: string;
    severity: string;
    message: string;
    orderedQuantity: number;
    deliveredQuantity: number;
    expectedQuantity: number;
  }[] = [];

  for (const order of discrepancies) {
    const ordered = order.orderedGlassCount || 0;
    const delivered = order.deliveredGlassCount || 0;

    if (delivered > ordered) {
      // Nadwyżka
      const key = `${order.orderNumber}-quantity_surplus`;
      if (!existingSet.has(key)) {
        validationsToCreate.push({
          orderNumber: order.orderNumber,
          validationType: 'quantity_surplus',
          severity: 'warning',
          message: `Nadwyżka szyb: zamówiono ${ordered} szt., dostarczono ${delivered} szt. (nadwyżka ${delivered - ordered} szt.)`,
          orderedQuantity: ordered,
          deliveredQuantity: delivered,
          expectedQuantity: ordered,
        });
        console.log(`  [NADWYŻKA] ${order.orderNumber}: zamówiono ${ordered}, dostarczono ${delivered}`);
      }
    } else if (delivered < ordered && delivered > 0) {
      // Brak (częściowa dostawa)
      const key = `${order.orderNumber}-quantity_shortage`;
      if (!existingSet.has(key)) {
        validationsToCreate.push({
          orderNumber: order.orderNumber,
          validationType: 'quantity_shortage',
          severity: 'warning',
          message: `Brak szyb: zamówiono ${ordered} szt., dostarczono ${delivered} szt. (brakuje ${ordered - delivered} szt.)`,
          orderedQuantity: ordered,
          deliveredQuantity: delivered,
          expectedQuantity: ordered,
        });
        console.log(`  [BRAK] ${order.orderNumber}: zamówiono ${ordered}, dostarczono ${delivered}`);
      }
    }
  }

  console.log(`\nDo utworzenia: ${validationsToCreate.length} walidacji`);

  if (validationsToCreate.length > 0) {
    const result = await prisma.glassOrderValidation.createMany({
      data: validationsToCreate,
    });
    console.log(`\nUtworzono ${result.count} walidacji.`);
  } else {
    console.log('\nBrak walidacji do utworzenia - wszystkie już istnieją.');
  }
}

main()
  .catch((e) => {
    console.error('Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
