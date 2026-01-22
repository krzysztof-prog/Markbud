/**
 * Skrypt do usunięcia profili 02, 202 i duplikatów z prefiksem "1"
 * Wymusza usunięcie przez odłączenie powiązanych OrderRequirements
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CZYSZCZENIE PROFILI ===\n');

  // Profile do usunięcia
  const profilesToDelete = ['02', '202', '18866', '19016', '19315', '19677'];

  for (const profileNumber of profilesToDelete) {
    console.log(`\n--- Przetwarzam profil: ${profileNumber} ---`);

    const profile = await prisma.profile.findUnique({
      where: { number: profileNumber },
      include: {
        _count: {
          select: {
            orderRequirements: true,
            warehouseStock: true,
            warehouseOrders: true,
            warehouseHistory: true,
            profileColors: true,
          },
        },
      },
    });

    if (!profile) {
      console.log(`  Profil ${profileNumber} nie istnieje - pomijam`);
      continue;
    }

    console.log(`  Znaleziono profil ID: ${profile.id}`);
    console.log(`  Powiązane dane:`);
    console.log(`    - OrderRequirements: ${profile._count.orderRequirements}`);
    console.log(`    - WarehouseStock: ${profile._count.warehouseStock}`);
    console.log(`    - WarehouseOrders: ${profile._count.warehouseOrders}`);
    console.log(`    - WarehouseHistory: ${profile._count.warehouseHistory}`);
    console.log(`    - ProfileColors: ${profile._count.profileColors}`);

    // Wykonaj w transakcji
    await prisma.$transaction(async (tx) => {
      // 1. Usuń OrderRequirements (profileId jest wymagane, więc nie można odłączyć)
      if (profile._count.orderRequirements > 0) {
        await tx.orderRequirement.deleteMany({
          where: { profileId: profile.id },
        });
        console.log(`  ✓ Usunięto ${profile._count.orderRequirements} OrderRequirements`);
      }

      // 2. Usuń WarehouseStock
      if (profile._count.warehouseStock > 0) {
        await tx.warehouseStock.deleteMany({
          where: { profileId: profile.id },
        });
        console.log(`  ✓ Usunięto ${profile._count.warehouseStock} WarehouseStock`);
      }

      // 3. Usuń WarehouseOrders
      if (profile._count.warehouseOrders > 0) {
        await tx.warehouseOrder.deleteMany({
          where: { profileId: profile.id },
        });
        console.log(`  ✓ Usunięto ${profile._count.warehouseOrders} WarehouseOrders`);
      }

      // 4. Usuń WarehouseHistory
      if (profile._count.warehouseHistory > 0) {
        await tx.warehouseHistory.deleteMany({
          where: { profileId: profile.id },
        });
        console.log(`  ✓ Usunięto ${profile._count.warehouseHistory} WarehouseHistory`);
      }

      // 5. Usuń ProfileColors
      if (profile._count.profileColors > 0) {
        await tx.profileColor.deleteMany({
          where: { profileId: profile.id },
        });
        console.log(`  ✓ Usunięto ${profile._count.profileColors} ProfileColors`);
      }

      // 6. Usuń profil
      await tx.profile.delete({
        where: { id: profile.id },
      });
      console.log(`  ✓ USUNIĘTO profil ${profileNumber}`);
    });
  }

  console.log('\n=== ZAKOŃCZONO ===');

  // Pokaż pozostałe profile
  const remainingProfiles = await prisma.profile.findMany({
    orderBy: { number: 'asc' },
    select: { number: true, name: true },
  });

  console.log(`\nPozostałe profile (${remainingProfiles.length}):`);
  remainingProfiles.slice(0, 20).forEach((p) => console.log(`  ${p.number} - ${p.name}`));
  if (remainingProfiles.length > 20) {
    console.log(`  ... i ${remainingProfiles.length - 20} więcej`);
  }
}

main()
  .catch((e) => {
    console.error('BŁĄD:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
