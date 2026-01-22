/**
 * Skrypt do usunięcia duplikatów z tabeli aluminum_glasses
 *
 * Duplikaty są identyfikowane przez kombinację:
 * - glassDeliveryId
 * - customerOrderNumber
 * - widthMm
 * - heightMm
 * - orderNumber
 *
 * Dla każdej grupy duplikatów zostawiamy tylko jeden rekord.
 * Dodatkowo naprawiamy clientName używając wzorca V + 6 cyfr.
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

async function main() {
  console.log('=== Usuwanie duplikatów z aluminum_glasses ===\n');

  // 1. Pobierz wszystkie rekordy
  const allRecords = await prisma.aluminumGlass.findMany({
    orderBy: { id: 'asc' },
  });

  console.log(`Znaleziono ${allRecords.length} rekordów w aluminum_glasses\n`);

  // 2. Grupuj rekordy po kluczowych polach
  const groups = new Map<string, typeof allRecords>();

  for (const record of allRecords) {
    const key = `${record.glassDeliveryId}-${record.customerOrderNumber}-${record.widthMm}-${record.heightMm}-${record.orderNumber}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  }

  console.log(`Znaleziono ${groups.size} unikalnych kombinacji\n`);

  // 3. Znajdź grupy z duplikatami
  const duplicateGroups = Array.from(groups.entries()).filter(
    ([_, records]) => records.length > 1
  );

  console.log(`Grup z duplikatami: ${duplicateGroups.length}\n`);

  if (duplicateGroups.length === 0) {
    console.log('Brak duplikatów do usunięcia.');
    await prisma.$disconnect();
    return;
  }

  // 4. Zbierz ID rekordów do usunięcia (wszystkie oprócz pierwszego w grupie)
  const idsToDelete: number[] = [];

  for (const [key, records] of duplicateGroups) {
    // Sortuj po ID i zostaw pierwszy (najstarszy)
    records.sort((a, b) => a.id - b.id);
    const toDelete = records.slice(1); // Wszystko oprócz pierwszego
    idsToDelete.push(...toDelete.map((r) => r.id));

    console.log(
      `Grupa: ${key.substring(0, 50)}... - ${records.length} rekordów, usuwam ${toDelete.length}`
    );
  }

  console.log(`\nŁącznie do usunięcia: ${idsToDelete.length} duplikatów`);

  // 5. Usuń duplikaty
  const deleteResult = await prisma.aluminumGlass.deleteMany({
    where: { id: { in: idsToDelete } },
  });

  console.log(`\nUsunięto ${deleteResult.count} duplikatów\n`);

  // 6. Napraw clientName dla pozostałych rekordów
  console.log('=== Naprawianie clientName ===\n');

  const remainingRecords = await prisma.aluminumGlass.findMany();
  let updatedCount = 0;

  for (const record of remainingRecords) {
    const correctClientName = extractClientName(record.customerOrderNumber);

    if (correctClientName && record.clientName !== correctClientName) {
      await prisma.aluminumGlass.update({
        where: { id: record.id },
        data: { clientName: correctClientName },
      });
      updatedCount++;
      console.log(
        `ID ${record.id}: "${record.clientName}" -> "${correctClientName}"`
      );
    }
  }

  console.log(`\nZaktualizowano clientName w ${updatedCount} rekordach`);

  // 7. Podsumowanie
  const finalCount = await prisma.aluminumGlass.count();
  console.log(`\n=== Podsumowanie ===`);
  console.log(`Przed: ${allRecords.length} rekordów`);
  console.log(`Po: ${finalCount} rekordów`);
  console.log(`Usunięto: ${allRecords.length - finalCount} duplikatów`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Błąd:', error);
  prisma.$disconnect();
  process.exit(1);
});
