const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  console.log('=== Order 53916 ===');
  const orders53916 = await p.order.findMany({
    where: { orderNumber: { in: ['53916', '53916-a'] } },
    select: { id: true, orderNumber: true, valueEur: true, valuePln: true }
  });
  console.log(JSON.stringify(orders53916, null, 2));

  console.log('\n=== Schuco Deliveries with D6363/D6566/D6568/D6569 ===');
  const dNums = ['D6363', 'D6566', 'D6568', 'D6569'];
  for (const num of dNums) {
    const deliveries = await p.schucoDelivery.findMany({
      where: { orderNumber: { contains: num } },
      select: {
        id: true, orderNumber: true, projectNumber: true, orderName: true,
        orderLinks: { select: { orderId: true, order: { select: { orderNumber: true, valueEur: true } } } },
      },
    });
    if (deliveries.length > 0) {
      for (const del of deliveries) {
        const linked = del.orderLinks.map(l => l.order.orderNumber + ' (EUR:' + l.order.valueEur + ')').join(', ');
        console.log(num, '-> schuco:', del.orderNumber, '| project:', del.projectNumber, '| name:', del.orderName, '-> orders:', linked || 'NONE');
      }
    } else {
      console.log(num, ': NOT FOUND in Schuco deliveries');
    }
  }

  console.log('\n=== Pending prices with D6363 in filename ===');
  const pending = await p.pendingOrderPrice.findMany({
    where: { filename: { contains: 'D6363' } },
    select: { id: true, filename: true, orderNumber: true, valueEur: true, status: true },
  });
  console.log(JSON.stringify(pending, null, 2));

  await p.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
