const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // Znajdź zlecenie 53427-b
  const order = await prisma.order.findFirst({
    where: { orderNumber: '53427-b' },
    select: { id: true, orderNumber: true, status: true, productionDate: true }
  });

  if (!order) {
    console.log('Nie znaleziono zlecenia 53427-b');
    return;
  }

  console.log('Zlecenie:', order.orderNumber);
  console.log('  status:', order.status);
  console.log('  productionDate:', order.productionDate?.toISOString().slice(0, 10));

  // Pokaż obecne demands
  const pendingDemands = await prisma.okucDemand.findMany({
    where: { orderId: order.id, status: 'pending' },
    select: { id: true, articleId: true, quantity: true }
  });
  console.log('\nPending demands:', pendingDemands.length);

  // Zaktualizuj demands na completed
  const result = await prisma.okucDemand.updateMany({
    where: {
      orderId: order.id,
      status: 'pending'
    },
    data: {
      status: 'completed',
      updatedAt: new Date()
    }
  });

  console.log('\n✅ Zaktualizowano', result.count, 'demands na status: completed');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
