import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Pobierz wszystkie zlecenia z OrderGlass
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      totalGlasses: true,
      glasses: {
        select: {
          id: true,
          quantity: true,
          packageType: true,
        },
      },
    },
  });

  console.log(`Sprawdzam ${orders.length} zleceń...\n`);

  const updates: Array<{
    orderNumber: string;
    oldValue: number | null;
    newValue: number;
    panelCount: number;
  }> = [];

  for (const order of orders) {
    if (order.glasses.length === 0) continue;

    // Policz szyby (bez paneli)
    let glassCount = 0;
    let panelCount = 0;

    for (const glass of order.glasses) {
      const packageType = glass.packageType?.toLowerCase() || '';
      if (packageType.includes('panel')) {
        panelCount += glass.quantity;
      } else {
        glassCount += glass.quantity;
      }
    }

    // Jeśli się różni - aktualizuj
    if (glassCount !== order.totalGlasses) {
      await prisma.order.update({
        where: { id: order.id },
        data: { totalGlasses: glassCount > 0 ? glassCount : null },
      });

      updates.push({
        orderNumber: order.orderNumber,
        oldValue: order.totalGlasses,
        newValue: glassCount,
        panelCount,
      });
    }
  }

  console.log(`Zaktualizowano ${updates.length} zleceń:\n`);

  if (updates.length > 0) {
    console.log('Nr zlecenia | Stara | Nowa | Panele');
    console.log('-'.repeat(45));
    for (const u of updates.slice(0, 50)) {
      console.log(
        `${u.orderNumber.padEnd(11)} | ${String(u.oldValue ?? '-').padStart(5)} | ${String(u.newValue).padStart(4)} | ${u.panelCount}`
      );
    }
    if (updates.length > 50) {
      console.log(`... i ${updates.length - 50} więcej`);
    }
  }

  // Weryfikacja 53666
  const check = await prisma.order.findUnique({
    where: { orderNumber: '53666' },
    select: {
      totalGlasses: true,
      glasses: { select: { packageType: true, quantity: true } },
    },
  });

  if (check) {
    console.log(`\n=== Weryfikacja 53666 ===`);
    console.log(`totalGlasses: ${check.totalGlasses}`);
    console.log('Pozycje:');
    check.glasses.forEach((g, i) => {
      const isPanel = g.packageType?.toLowerCase().includes('panel');
      console.log(`  ${i + 1}. qty=${g.quantity} ${isPanel ? '[PANEL]' : '[SZYBA]'} ${g.packageType}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
