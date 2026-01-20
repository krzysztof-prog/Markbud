/**
 * Skrypt do usuwania duplikatów w tabelach kategoryzowanych szyb:
 * - LooseGlass
 * - AluminumGlass
 * - ReclamationGlass
 *
 * Duplikat = te same wartości: glassDeliveryId, orderNumber, widthMm, heightMm, quantity
 * Zostawiamy jeden (najniższe ID), usuwamy resztę
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  glassDeliveryId: number;
  orderNumber: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  ids: number[];
}

type TableName = 'looseGlass' | 'aluminumGlass' | 'reclamationGlass';

async function findDuplicatesInTable(tableName: TableName): Promise<DuplicateGroup[]> {
  // Pobierz wszystkie rekordy z tabeli
  const allItems = await (prisma[tableName] as any).findMany({
    select: {
      id: true,
      glassDeliveryId: true,
      orderNumber: true,
      widthMm: true,
      heightMm: true,
      quantity: true,
    },
    orderBy: { id: 'asc' },
  });

  // Grupuj po kluczowych polach
  const groups = new Map<string, number[]>();

  for (const item of allItems) {
    const key = `${item.glassDeliveryId}|${item.orderNumber}|${item.widthMm}|${item.heightMm}|${item.quantity}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item.id);
  }

  // Znajdź grupy z więcej niż 1 elementem (duplikaty)
  const duplicates: DuplicateGroup[] = [];

  for (const [key, ids] of groups) {
    if (ids.length > 1) {
      const [glassDeliveryId, orderNumber, widthMm, heightMm, quantity] = key.split('|');
      duplicates.push({
        glassDeliveryId: parseInt(glassDeliveryId),
        orderNumber,
        widthMm: parseInt(widthMm),
        heightMm: parseInt(heightMm),
        quantity: parseInt(quantity),
        ids,
      });
    }
  }

  return duplicates;
}

async function removeDuplicatesFromTable(tableName: TableName, dryRun: boolean): Promise<number> {
  const displayName = tableName === 'looseGlass' ? 'LooseGlass' :
                      tableName === 'aluminumGlass' ? 'AluminumGlass' : 'ReclamationGlass';

  console.log(`\n📋 ${displayName}:`);

  const duplicates = await findDuplicatesInTable(tableName);

  if (duplicates.length === 0) {
    console.log('   ✅ Brak duplikatów');
    return 0;
  }

  let totalToRemove = 0;
  const idsToRemove: number[] = [];

  for (const group of duplicates) {
    const [keepId, ...removeIds] = group.ids;
    totalToRemove += removeIds.length;
    idsToRemove.push(...removeIds);

    if (duplicates.length <= 10) {
      console.log(`   Delivery ${group.glassDeliveryId} | Order ${group.orderNumber}`);
      console.log(`     ${group.widthMm}x${group.heightMm} qty=${group.quantity}`);
      console.log(`     IDs: ${group.ids.join(', ')} → zachowuję ${keepId}, usuwam ${removeIds.join(', ')}`);
    }
  }

  if (duplicates.length > 10) {
    console.log(`   ... (${duplicates.length} grup duplikatów)`);
  }

  console.log(`   📊 ${totalToRemove} rekordów do usunięcia z ${duplicates.length} grup`);

  if (dryRun) {
    return totalToRemove;
  }

  // Usuń duplikaty
  const result = await (prisma[tableName] as any).deleteMany({
    where: { id: { in: idsToRemove } },
  });

  console.log(`   🗑️ Usunięto ${result.count} rekordów`);
  return result.count;
}

async function main(): Promise<void> {
  console.log('🔍 Szukam duplikatów w tabelach kategoryzowanych szyb...');

  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  if (dryRun) {
    console.log('\n⚠️ DRY RUN MODE - nic nie zostanie usunięte');
    console.log('   Użyj --execute aby usunąć duplikaty\n');
  }

  let totalRemoved = 0;

  totalRemoved += await removeDuplicatesFromTable('looseGlass', dryRun);
  totalRemoved += await removeDuplicatesFromTable('aluminumGlass', dryRun);
  totalRemoved += await removeDuplicatesFromTable('reclamationGlass', dryRun);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (dryRun) {
    console.log(`📊 PODSUMOWANIE: ${totalRemoved} rekordów do usunięcia`);
    console.log('🔸 Uruchom z --execute aby usunąć duplikaty');
  } else {
    console.log(`✅ GOTOWE: Usunięto ${totalRemoved} duplikatów`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
