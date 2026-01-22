/**
 * Skrypt do czyszczenia profili PVC:
 * 1. Usuwa profile zaczynające się na "0"
 * 2. Profile zaczynające się na "1" - usuwa wiodącą "1" z numeru
 *
 * Uruchomienie: npx tsx scripts/cleanup-profiles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Cleanup profili PVC ===\n');

  // 1. Znajdź profile zaczynające się na "0"
  const profilesToDelete = await prisma.profile.findMany({
    where: {
      number: {
        startsWith: '0'
      }
    },
    select: {
      id: true,
      number: true,
      name: true,
      articleNumber: true
    }
  });

  console.log(`Profile do USUNIĘCIA (zaczynające się na "0"): ${profilesToDelete.length}`);
  profilesToDelete.forEach(p => {
    console.log(`  - ${p.number} (${p.name}) - articleNumber: ${p.articleNumber}`);
  });

  // 2. Znajdź profile zaczynające się na "1"
  const profilesToUpdate = await prisma.profile.findMany({
    where: {
      number: {
        startsWith: '1'
      }
    },
    select: {
      id: true,
      number: true,
      name: true,
      articleNumber: true
    }
  });

  console.log(`\nProfile do MODYFIKACJI (usunięcie wiodącej "1"): ${profilesToUpdate.length}`);
  profilesToUpdate.forEach(p => {
    const newNumber = p.number.substring(1);
    console.log(`  - ${p.number} → ${newNumber} (${p.name})`);
  });

  // Potwierdzenie
  console.log('\n--- WYKONUJĘ OPERACJE ---\n');

  // 3. Usuń profile zaczynające się na "0" (hard delete)
  if (profilesToDelete.length > 0) {
    // Najpierw sprawdź czy są powiązane rekordy
    for (const profile of profilesToDelete) {
      const relatedOrders = await prisma.orderRequirement.count({
        where: { profileId: profile.id }
      });

      if (relatedOrders > 0) {
        console.log(`⚠️  Profil ${profile.number} ma ${relatedOrders} powiązanych zamówień - pomijam usunięcie!`);
        continue;
      }

      // Usuń powiązane ProfileColor
      await prisma.profileColor.deleteMany({
        where: { profileId: profile.id }
      });

      // Usuń powiązane WarehouseStock
      await prisma.warehouseStock.deleteMany({
        where: { profileId: profile.id }
      });

      // Usuń powiązane WarehouseHistory
      await prisma.warehouseHistory.deleteMany({
        where: { profileId: profile.id }
      });

      // Usuń powiązane WarehouseOrder
      await prisma.warehouseOrder.deleteMany({
        where: { profileId: profile.id }
      });

      // Usuń profil
      await prisma.profile.delete({
        where: { id: profile.id }
      });

      console.log(`✅ Usunięto profil: ${profile.number}`);
    }
  }

  // 4. Zaktualizuj profile zaczynające się na "1"
  for (const profile of profilesToUpdate) {
    const newNumber = profile.number.substring(1);

    // Sprawdź czy nowy numer już nie istnieje
    const existing = await prisma.profile.findUnique({
      where: { number: newNumber }
    });

    if (existing) {
      console.log(`⚠️  Numer ${newNumber} już istnieje - nie mogę zmienić ${profile.number}`);
      continue;
    }

    await prisma.profile.update({
      where: { id: profile.id },
      data: { number: newNumber }
    });

    console.log(`✅ Zmieniono: ${profile.number} → ${newNumber}`);
  }

  console.log('\n=== Zakończono ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());