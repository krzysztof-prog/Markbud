/**
 * Skrypt do usunięcia duplikatów ze wszystkich tabel szyb kategoryzowanych
 * i naprawienia clientName
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Funkcja do wyciągania clientName z customerOrderNumber
function extractClientName(customerOrderNumber: string): string | null {
  const vPattern = customerOrderNumber.match(/V(\d{6})/i);
  if (vPattern) {
    return `V${vPattern[1]}`;
  }
  return null;
}

async function removeDuplicatesFromTable(
  tableName: string,
  findMany: () => Promise<any[]>,
  deleteMany: (ids: number[]) => Promise<{ count: number }>,
  updateClientName: (id: number, clientName: string) => Promise<any>
) {
  console.log(`\n=== ${tableName} ===\n`);

  const allRecords = await findMany();
  console.log(`Znaleziono ${allRecords.length} rekordów`);

  // Grupuj rekordy
  const groups = new Map<string, any[]>();
  for (const record of allRecords) {
    const key = `${record.glassDeliveryId}-${record.customerOrderNumber}-${record.widthMm}-${record.heightMm}-${record.orderNumber}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  }

  console.log(`Unikalnych kombinacji: ${groups.size}`);

  // Znajdź duplikaty
  const duplicateGroups = Array.from(groups.entries()).filter(
    ([_, records]) => records.length > 1
  );

  console.log(`Grup z duplikatami: ${duplicateGroups.length}`);

  if (duplicateGroups.length > 0) {
    const idsToDelete: number[] = [];
    for (const [_, records] of duplicateGroups) {
      records.sort((a: any, b: any) => a.id - b.id);
      idsToDelete.push(...records.slice(1).map((r: any) => r.id));
    }

    const deleteResult = await deleteMany(idsToDelete);
    console.log(`Usunięto ${deleteResult.count} duplikatów`);
  }

  // Napraw clientName
  const remaining = await findMany();
  let updatedCount = 0;

  for (const record of remaining) {
    const correctClientName = extractClientName(record.customerOrderNumber);
    if (correctClientName && record.clientName !== correctClientName) {
      await updateClientName(record.id, correctClientName);
      updatedCount++;
    }
  }

  console.log(`Zaktualizowano clientName w ${updatedCount} rekordach`);

  const finalCount = (await findMany()).length;
  console.log(`Końcowa liczba rekordów: ${finalCount}`);
}

async function main() {
  console.log('=== Czyszczenie wszystkich tabel szyb kategoryzowanych ===');

  // LooseGlass
  await removeDuplicatesFromTable(
    'loose_glasses',
    () => prisma.looseGlass.findMany({ orderBy: { id: 'asc' } }),
    (ids) => prisma.looseGlass.deleteMany({ where: { id: { in: ids } } }),
    (id, clientName) =>
      prisma.looseGlass.update({ where: { id }, data: { clientName } })
  );

  // ReclamationGlass
  await removeDuplicatesFromTable(
    'reclamation_glasses',
    () => prisma.reclamationGlass.findMany({ orderBy: { id: 'asc' } }),
    (ids) => prisma.reclamationGlass.deleteMany({ where: { id: { in: ids } } }),
    (id, clientName) =>
      prisma.reclamationGlass.update({ where: { id }, data: { clientName } })
  );

  console.log('\n=== Zakończono ===');
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Błąd:', error);
  prisma.$disconnect();
  process.exit(1);
});
