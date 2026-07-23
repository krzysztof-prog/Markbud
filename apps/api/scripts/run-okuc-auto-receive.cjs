/**
 * Jednorazowy skrypt do ręcznego uruchomienia auto-receive zamówień okuć
 * z przeszłą datą dostawy.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processOverdueOrders() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdueOrders = await prisma.okucOrder.findMany({
    where: {
      status: { in: ['sent', 'confirmed', 'in_transit'] },
      expectedDeliveryDate: { lt: today },
      deletedAt: null,
    },
    include: {
      items: { select: { articleId: true, orderedQty: true } },
    },
  });

  console.log('Found', overdueOrders.length, 'overdue orders');

  let updatedCount = 0;
  const errors = [];

  for (const order of overdueOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.okucOrder.update({
          where: { id: order.id },
          data: {
            status: 'received',
            actualDeliveryDate: order.expectedDeliveryDate,
            updatedAt: new Date(),
          },
        });

        for (const item of order.items) {
          await tx.okucOrderItem.updateMany({
            where: { okucOrderId: order.id, articleId: item.articleId },
            data: { receivedQty: item.orderedQty },
          });

          await tx.okucStock.updateMany({
            where: { articleId: item.articleId },
            data: {
              currentQuantity: { increment: item.orderedQty },
              updatedAt: new Date(),
            },
          });

          const stock = await tx.okucStock.findFirst({
            where: { articleId: item.articleId },
          });

          if (stock) {
            await tx.okucHistory.create({
              data: {
                articleId: item.articleId,
                warehouseType: stock.warehouseType,
                subWarehouse: stock.subWarehouse,
                eventType: 'order_received',
                previousQty: stock.currentQuantity - item.orderedQty,
                changeQty: item.orderedQty,
                newQty: stock.currentQuantity,
                reference: order.orderNumber,
              },
            });
          }
        }
      });

      updatedCount++;
      console.log('  OK:', order.orderNumber, '| items:', order.items.length, '| expected:', order.expectedDeliveryDate.toISOString().split('T')[0]);
    } catch (error) {
      const errMsg = order.orderNumber + ': ' + error.message;
      console.error('  ERROR:', errMsg);
      errors.push(errMsg);
    }
  }

  console.log('\nDone. Updated:', updatedCount + '/' + overdueOrders.length, '| Errors:', errors.length);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }
  await prisma.$disconnect();
}

processOverdueOrders().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
