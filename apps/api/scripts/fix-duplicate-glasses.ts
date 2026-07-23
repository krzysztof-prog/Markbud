/**
 * Skrypt do naprawy zduplikowanych rekordów OrderGlass.
 * Problem: ścieżka 'add_new' w UzyteBeleParser nie usuwała starych rekordów
 * przed dodaniem nowych, co powodowało podwójne liczenie szyb.
 *
 * Skrypt:
 * 1. Znajduje zlecenia ze zduplikowanymi OrderGlass (identyczne position+width+height+packageType)
 * 2. Usuwa duplikaty (zostawia jeden rekord z każdej grupy)
 * 3. Przelicza totalGlasses na podstawie pozostałych rekordów
 *
 * Użycie: npx tsx scripts/fix-duplicate-glasses.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Naprawa zduplikowanych OrderGlass ===\n');

  // Znajdź wszystkie zlecenia z OrderGlass
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      glasses: { some: {} },
    },
    select: {
      id: true,
      orderNumber: true,
      totalGlasses: true,
      glasses: {
        select: {
          id: true,
          lp: true,
          position: true,
          widthMm: true,
          heightMm: true,
          quantity: true,
          packageType: true,
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  console.log(`Znaleziono ${orders.length} zleceń z szybami.\n`);

  let totalDuplicatesRemoved = 0;
  let totalOrdersFixed = 0;
  const changes: Array<{ orderNumber: string; duplicatesRemoved: number; oldTotal: number; newTotal: number }> = [];

  for (const order of orders) {
    // Grupuj szyby po kluczowych polach (position+width+height+packageType)
    const groups = new Map<string, typeof order.glasses>();

    for (const glass of order.glasses) {
      const key = `${glass.position}|${glass.widthMm}|${glass.heightMm}|${glass.quantity}|${glass.packageType || ''}`;
      const group = groups.get(key) || [];
      group.push(glass);
      groups.set(key, group);
    }

    // Znajdź grupy z duplikatami
    const idsToDelete: number[] = [];
    for (const [, group] of groups) {
      if (group.length > 1) {
        // Zostaw pierwszy rekord, usuń resztę
        for (let i = 1; i < group.length; i++) {
          idsToDelete.push(group[i].id);
        }
      }
    }

    if (idsToDelete.length === 0) continue;

    // Usuń duplikaty
    await prisma.orderGlass.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    // Przelicz totalGlasses
    const remainingGlasses = order.glasses.filter((g) => !idsToDelete.includes(g.id));
    const newTotal = remainingGlasses.filter((g) => {
      const pkg = (g.packageType || '').toLowerCase();
      return !pkg.includes('panel') && !pkg.includes('wypełnienie') && !pkg.includes('wypelnienie');
    }).length;

    await prisma.order.update({
      where: { id: order.id },
      data: { totalGlasses: newTotal > 0 ? newTotal : null },
    });

    totalDuplicatesRemoved += idsToDelete.length;
    totalOrdersFixed++;
    changes.push({
      orderNumber: order.orderNumber,
      duplicatesRemoved: idsToDelete.length,
      oldTotal: order.totalGlasses ?? 0,
      newTotal,
    });
  }

  console.log(`Naprawiono ${totalOrdersFixed} zleceń, usunięto ${totalDuplicatesRemoved} duplikatów.\n`);

  if (changes.length > 0) {
    console.log('Szczegóły:');
    console.log('─'.repeat(60));
    for (const c of changes) {
      console.log(`  ${c.orderNumber}: usunięto ${c.duplicatesRemoved} duplikatów, totalGlasses: ${c.oldTotal} → ${c.newTotal}`);
    }
  }

  console.log('\nGotowe!');
}

main()
  .catch((e) => {
    console.error('Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
