const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ordersWithoutPrice = await prisma.order.findMany({
    where: {
      productionDate: { not: null },
      valuePln: null,
      valueEur: null,
      deletedAt: null
    },
    select: { id: true, orderNumber: true, project: true, productionDate: true },
    orderBy: { productionDate: 'desc' }
  });

  console.log('Zlecenia wyprodukowane bez ceny:', ordersWithoutPrice.length);
  console.log('');

  for (const o of ordersWithoutPrice.slice(0, 30)) {
    const date = o.productionDate ? o.productionDate.toISOString().split('T')[0] : 'null';
    console.log(o.orderNumber + ' | projekt: ' + (o.project || '-') + ' | prod: ' + date);
  }

  await prisma.$disconnect();
}

main();
