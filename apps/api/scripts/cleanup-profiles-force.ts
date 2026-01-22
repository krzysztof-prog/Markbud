/**
 * Skrypt do siłowego usunięcia profili:
 * 1. Profil "02" - usunięcie wraz z powiązaniami
 * 2. Profile 19016, 19315, 19677, 18866 - usunięcie (duplikaty)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteProfileForce(number: string) {
  const profile = await prisma.profile.findUnique({
    where: { number }
  });

  if (!profile) {
    console.log(`❌ Profil ${number} nie istnieje`);
    return;
  }

  // Usuń powiązania z OrderRequirement (ustaw profileId na null)
  const updatedRequirements = await prisma.orderRequirement.updateMany({
    where: { profileId: profile.id },
    data: { profileId: null }
  });
  if (updatedRequirements.count > 0) {
    console.log(`   - Odpięto ${updatedRequirements.count} zamówień`);
  }

  // Usuń powiązane ProfileColor
  const deletedColors = await prisma.profileColor.deleteMany({
    where: { profileId: profile.id }
  });
  if (deletedColors.count > 0) {
    console.log(`   - Usunięto ${deletedColors.count} kolorów`);
  }

  // Usuń powiązane WarehouseStock
  const deletedStock = await prisma.warehouseStock.deleteMany({
    where: { profileId: profile.id }
  });
  if (deletedStock.count > 0) {
    console.log(`   - Usunięto ${deletedStock.count} stanów magazynowych`);
  }

  // Usuń powiązane WarehouseHistory
  const deletedHistory = await prisma.warehouseHistory.deleteMany({
    where: { profileId: profile.id }
  });
  if (deletedHistory.count > 0) {
    console.log(`   - Usunięto ${deletedHistory.count} historii magazynu`);
  }

  // Usuń powiązane WarehouseOrder
  const deletedOrders = await prisma.warehouseOrder.deleteMany({
    where: { profileId: profile.id }
  });
  if (deletedOrders.count > 0) {
    console.log(`   - Usunięto ${deletedOrders.count} zamówień magazynowych`);
  }

  // Usuń profil
  await prisma.profile.delete({
    where: { id: profile.id }
  });

  console.log(`✅ Usunięto profil: ${number}`);
}

async function main() {
  console.log('=== Siłowe usuwanie profili ===\n');

  // 1. Usuń profil "02"
  console.log('Usuwanie profilu "02":');
  await deleteProfileForce('02');

  // 2. Usuń duplikaty z "1"
  const duplicates = ['19016', '19315', '19677', '18866'];

  console.log('\nUsuwanie duplikatów z "1":');
  for (const num of duplicates) {
    console.log(`Usuwanie profilu "${num}":`);
    await deleteProfileForce(num);
  }

  console.log('\n=== Zakończono ===');

  // Pokaż pozostałe profile
  const remaining = await prisma.profile.findMany({
    orderBy: { number: 'asc' },
    select: { number: true, name: true }
  });

  console.log(`\nPozostało ${remaining.length} profili:`);
  remaining.forEach(p => console.log(`  - ${p.number}: ${p.name}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());