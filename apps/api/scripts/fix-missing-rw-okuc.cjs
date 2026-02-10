/**
 * Skrypt naprawczy - przetworz brakujace RW Okuc dla wszystkich zakonczonych zlecen
 *
 * Problem: DeliveryService.completeDelivery() uzywalo bezposredniego prisma.$transaction
 * zamiast orderService.bulkUpdateStatus(), przez co RW okuc nigdy nie bylo procesowane.
 *
 * Dotyczy: ~204 zlecen ze statusem 'completed' ktore maja okucDemands w statusie 'pending'
 *
 * Uruchomienie: cd apps/api && node scripts/fix-missing-rw-okuc.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processRwForOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      system: true,
      okucDemands: {
        where: {
          deletedAt: null,
          status: { not: 'completed' },
        },
        include: {
          article: {
            select: { id: true, articleId: true, name: true, usedInPvc: true, usedInAlu: true },
          },
        },
      },
    },
  });

  if (!order) return { orderNumber: '?', processed: 0, skipped: 0, errors: [] };
  if (order.status !== 'completed') return { orderNumber: order.orderNumber, processed: 0, skipped: 0, errors: ['nie completed'] };
  if (order.okucDemands.length === 0) return { orderNumber: order.orderNumber, processed: 0, skipped: 0, errors: [] };

  // Okresl typ magazynu
  const systemLower = (order.system || '').toLowerCase();
  const warehouseType = systemLower.includes('alu') ? 'alu' : 'pvc';

  let processed = 0;
  let skipped = 0;
  const errors = [];

  await prisma.$transaction(async (tx) => {
    for (const demand of order.okucDemands) {
      try {
        const stock = await tx.okucStock.findFirst({
          where: {
            articleId: demand.articleId,
            warehouseType,
            OR: [{ subWarehouse: null }, { subWarehouse: 'production' }],
          },
          orderBy: { subWarehouse: 'desc' },
        });

        if (!stock) {
          errors.push(`${demand.article.articleId}: brak stock w ${warehouseType}`);
          skipped++;
          continue;
        }

        const previousQty = stock.currentQuantity;
        const changeQty = -demand.quantity;
        const newQty = Math.max(0, previousQty + changeQty);

        await tx.okucStock.update({
          where: { id: stock.id },
          data: { currentQuantity: newQty, version: { increment: 1 } },
        });

        await tx.okucHistory.create({
          data: {
            articleId: demand.articleId,
            warehouseType,
            subWarehouse: stock.subWarehouse,
            eventType: 'rw',
            previousQty,
            changeQty,
            newQty,
            reason: `RW - Zlecenie ${order.orderNumber} (naprawa)`,
            reference: `ORDER:${order.id}`,
            isManualEdit: false,
          },
        });

        await tx.okucDemand.update({
          where: { id: demand.id },
          data: { status: 'completed', updatedAt: new Date() },
        });

        processed++;
      } catch (err) {
        errors.push(`${demand.article.articleId}: ${err.message}`);
        skipped++;
      }
    }
  });

  return { orderNumber: order.orderNumber, processed, skipped, errors };
}

async function main() {
  console.log('=== NAPRAWA BRAKUJACYCH RW OKUC ===');
  console.log('Bug: completeDelivery() nie wywolywalo processRwForOrders()');
  console.log('');

  // Znajdz WSZYSTKIE completed zlecenia z pending okucDemands
  const allCompletedOrders = await prisma.order.findMany({
    where: {
      status: 'completed',
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
    },
    orderBy: { orderNumber: 'asc' },
  });

  console.log(`Znaleziono ${allCompletedOrders.length} zakonczonych zlecen. Sprawdzam pending demands...`);

  // Sprawdz ktore maja pending demands
  const ordersWithPending = [];
  for (const order of allCompletedOrders) {
    const pendingCount = await prisma.okucDemand.count({
      where: { orderId: order.id, deletedAt: null, status: { not: 'completed' } },
    });
    if (pendingCount > 0) {
      ordersWithPending.push({ ...order, pendingCount });
    }
  }

  console.log(`\nZnaleziono ${ordersWithPending.length} zlecen z pending okucDemands\n`);

  if (ordersWithPending.length === 0) {
    console.log('Brak zlecen do przetworzenia - wszystko OK!');
    await prisma.$disconnect();
    return;
  }

  // Pokaz liste zlecen do przetworzenia
  console.log('Zlecenia do przetworzenia:');
  ordersWithPending.forEach(o => console.log(`  ${o.orderNumber} (${o.pendingCount} pending demands)`));
  console.log('');

  // Przetwarzaj SEKWENCYJNIE (jedno po drugim - SQLite)
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < ordersWithPending.length; i++) {
    const order = ordersWithPending[i];
    try {
      const result = await processRwForOrder(order.id);
      totalProcessed += result.processed;
      totalSkipped += result.skipped;
      totalErrors += result.errors.length;

      const status = result.errors.length > 0 ? '!' : 'OK';
      const progress = `[${i + 1}/${ordersWithPending.length}]`;
      console.log(`  ${progress} [${status}] ${result.orderNumber}: ${result.processed} przetworzonych, ${result.skipped} pominietych` +
        (result.errors.length > 0 ? ` (${result.errors.length} bledow)` : ''));

      if (result.errors.length > 0) {
        result.errors.forEach(e => console.log(`      -> ${e}`));
      }
    } catch (err) {
      console.log(`  [FAIL] ${order.orderNumber}: ${err.message}`);
      totalErrors++;
    }
  }

  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Zlecen z pending demands: ${ordersWithPending.length}`);
  console.log(`Pozycji przetworzonych: ${totalProcessed}`);
  console.log(`Pozycji pominietych (brak stock): ${totalSkipped}`);
  console.log(`Bledow: ${totalErrors}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
