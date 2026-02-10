/**
 * Skrypt naprawczy - przetworz brakujące RW Okucia dla zleceń ze stycznia 2026
 *
 * Problem: Równoległe przetwarzanie RW powodowało SQLITE_BUSY,
 * przez co 29 z 30 zleceń nie miało przetworzonego RW.
 *
 * Uruchomienie: node scripts/reprocess-rw-january.cjs
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
            reason: `RW - Zlecenie ${order.orderNumber}`,
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
  console.log('=== REPROCESS RW OKUCIA - STYCZEN 2026 ===\n');

  // Znajdz zlecenia ze stycznia z pending demands
  const jan2026Start = new Date('2026-01-01');
  const jan2026End = new Date('2026-01-31T23:59:59');

  const orders = await prisma.order.findMany({
    where: {
      productionDate: { gte: jan2026Start, lte: jan2026End },
      status: 'completed',
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      _count: {
        select: {
          okucDemands: {
            // Prisma _count nie obsługuje where, więc sprawdzimy niżej
          },
        },
      },
    },
    orderBy: { orderNumber: 'asc' },
  });

  // Sprawdz ktore maja pending demands
  const ordersWithPending = [];
  for (const order of orders) {
    const pendingCount = await prisma.okucDemand.count({
      where: { orderId: order.id, deletedAt: null, status: { not: 'completed' } },
    });
    if (pendingCount > 0) {
      ordersWithPending.push({ ...order, pendingCount });
    }
  }

  console.log(`Znaleziono ${ordersWithPending.length} zlecen z pending demands\n`);

  if (ordersWithPending.length === 0) {
    console.log('Brak zlecen do przetworzenia - wszystko OK!');
    await prisma.$disconnect();
    return;
  }

  // Przetwarzaj SEKWENCYJNIE (jedno po drugim)
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const order of ordersWithPending) {
    try {
      const result = await processRwForOrder(order.id);
      totalProcessed += result.processed;
      totalSkipped += result.skipped;
      totalErrors += result.errors.length;

      const status = result.errors.length > 0 ? '!' : 'OK';
      console.log(`  [${status}] ${result.orderNumber}: ${result.processed} przetworzonych, ${result.skipped} pomini\u0119tych` +
        (result.errors.length > 0 ? ` (${result.errors.length} b\u0142\u0119d\u00f3w)` : ''));

      if (result.errors.length > 0) {
        result.errors.forEach(e => console.log(`      -> ${e}`));
      }
    } catch (err) {
      console.log(`  [FAIL] ${order.orderNumber}: ${err.message}`);
      totalErrors++;
    }
  }

  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Przetworzone: ${totalProcessed}`);
  console.log(`Pominiete (brak stock): ${totalSkipped}`);
  console.log(`Bledy: ${totalErrors}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
