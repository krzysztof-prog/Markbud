/**
 * Skrypt do usuwania duplikatów GlassDeliveryItem
 *
 * Duplikat = te same wartości: glassDeliveryId, orderNumber, position, widthMm, heightMm, quantity
 * Zostawiamy jeden (najniższe ID), usuwamy resztę
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  glassDeliveryId: number;
  orderNumber: string;
  position: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  ids: number[];
}

async function findDuplicates(): Promise<DuplicateGroup[]> {
  // Pobierz wszystkie GlassDeliveryItems
  const allItems = await prisma.glassDeliveryItem.findMany({
    select: {
      id: true,
      glassDeliveryId: true,
      orderNumber: true,
      position: true,
      widthMm: true,
      heightMm: true,
      quantity: true,
    },
    orderBy: { id: 'asc' },
  });

  // Grupuj po kluczowych polach
  const groups = new Map<string, number[]>();

  for (const item of allItems) {
    const key = `${item.glassDeliveryId}|${item.orderNumber}|${item.position}|${item.widthMm}|${item.heightMm}|${item.quantity}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item.id);
  }

  // Znajdź grupy z więcej niż 1 elementem (duplikaty)
  const duplicates: DuplicateGroup[] = [];

  for (const [key, ids] of groups) {
    if (ids.length > 1) {
      const [glassDeliveryId, orderNumber, position, widthMm, heightMm, quantity] = key.split('|');
      duplicates.push({
        glassDeliveryId: parseInt(glassDeliveryId),
        orderNumber,
        position,
        widthMm: parseInt(widthMm),
        heightMm: parseInt(heightMm),
        quantity: parseInt(quantity),
        ids,
      });
    }
  }

  return duplicates;
}

async function removeDuplicates(dryRun = true): Promise<void> {
  console.log('🔍 Szukam duplikatów GlassDeliveryItem...\n');

  const duplicates = await findDuplicates();

  if (duplicates.length === 0) {
    console.log('✅ Nie znaleziono duplikatów!');
    return;
  }

  console.log(`⚠️ Znaleziono ${duplicates.length} grup duplikatów:\n`);

  let totalToRemove = 0;
  const idsToRemove: number[] = [];

  for (const group of duplicates) {
    const [keepId, ...removeIds] = group.ids; // Zostawiamy pierwszy (najniższe ID)
    totalToRemove += removeIds.length;
    idsToRemove.push(...removeIds);

    console.log(`  Delivery ${group.glassDeliveryId} | Order ${group.orderNumber} | Pos ${group.position}`);
    console.log(`    ${group.widthMm}x${group.heightMm} qty=${group.quantity}`);
    console.log(`    IDs: ${group.ids.join(', ')} → zachowuję ${keepId}, usuwam ${removeIds.join(', ')}`);
    console.log();
  }

  console.log(`📊 Podsumowanie: ${totalToRemove} rekordów do usunięcia\n`);

  if (dryRun) {
    console.log('🔸 DRY RUN - nic nie zostało usunięte');
    console.log('🔸 Uruchom z parametrem --execute aby usunąć duplikaty');
    return;
  }

  // Usuń duplikaty
  console.log('🗑️ Usuwam duplikaty...');

  const result = await prisma.glassDeliveryItem.deleteMany({
    where: { id: { in: idsToRemove } },
  });

  console.log(`✅ Usunięto ${result.count} rekordów`);

  // Przelicz deliveredGlassCount dla powiązanych zleceń
  console.log('\n🔄 Przeliczam deliveredGlassCount dla zleceń...');

  const affectedOrders = [...new Set(duplicates.map(d => d.orderNumber))];

  for (const orderNumber of affectedOrders) {
    // Policz matched delivery items dla tego zlecenia
    const matchedItems = await prisma.glassDeliveryItem.findMany({
      where: {
        orderNumber,
        matchStatus: 'matched',
      },
      select: { quantity: true },
    });

    const totalDelivered = matchedItems.reduce((sum, item) => sum + item.quantity, 0);

    // Zaktualizuj Order
    await prisma.order.updateMany({
      where: { orderNumber },
      data: { deliveredGlassCount: totalDelivered },
    });

    console.log(`  ${orderNumber}: deliveredGlassCount = ${totalDelivered}`);
  }

  console.log('\n✅ Gotowe!');
}

// Main
const args = process.argv.slice(2);
const execute = args.includes('--execute');

removeDuplicates(!execute)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
