/**
 * Migration Script: Populate project and system fields in Order table
 *
 * This script fills the `project` and `system` fields on Order records
 * by aggregating data from related OrderWindow records.
 *
 * - project = unique references from windows (comma-separated)
 * - system = unique profileTypes from windows (comma-separated)
 *
 * Run with: npx tsx scripts/migrate-order-project-system.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateOrderProjectSystem() {
  console.log('=== Migration: Populate project and system fields ===\n');

  // Pobierz wszystkie zlecenia z oknami
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      project: true,
      system: true,
      windows: {
        select: {
          reference: true,
          profileType: true,
        },
      },
    },
  });

  console.log(`Znaleziono ${orders.length} zleceń do sprawdzenia.\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let noWindowsCount = 0;

  for (const order of orders) {
    // Jeśli zlecenie nie ma okien, pomiń
    if (order.windows.length === 0) {
      noWindowsCount++;
      continue;
    }

    // Oblicz wartości z windows
    const references = [...new Set(order.windows.map(w => w.reference).filter(Boolean))];
    const profileTypes = [...new Set(order.windows.map(w => w.profileType).filter(Boolean))];

    const newProject = references.join(', ') || null;
    const newSystem = profileTypes.join(', ') || null;

    // Sprawdź czy potrzebna aktualizacja
    const needsUpdate =
      (order.project !== newProject && newProject !== null) ||
      (order.system !== newSystem && newSystem !== null);

    if (!needsUpdate) {
      skippedCount++;
      continue;
    }

    // Aktualizuj zlecenie
    await prisma.order.update({
      where: { id: order.id },
      data: {
        project: newProject ?? order.project,
        system: newSystem ?? order.system,
      },
    });

    console.log(`✓ Zaktualizowano ${order.orderNumber}:`);
    if (newProject) console.log(`    project: "${newProject}"`);
    if (newSystem) console.log(`    system: "${newSystem}"`);

    updatedCount++;
  }

  console.log('\n=== Podsumowanie migracji ===');
  console.log(`Zaktualizowano: ${updatedCount}`);
  console.log(`Pominięto (już wypełnione): ${skippedCount}`);
  console.log(`Bez okien: ${noWindowsCount}`);
  console.log(`Razem: ${orders.length}`);

  await prisma.$disconnect();
}

migrateOrderProjectSystem()
  .then(() => {
    console.log('\n✓ Migracja zakończona pomyślnie!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Błąd migracji:', error);
    process.exit(1);
  });
