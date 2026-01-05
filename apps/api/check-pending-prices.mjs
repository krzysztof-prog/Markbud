import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pendingPrices = await prisma.pendingOrderPrice.findMany({
    where: {
      orderNumber: {
        in: ['53428', '53473', '53439', '53460', '53461', '53476']
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n=== PENDING PRICES ===');
  console.log('Found ' + pendingPrices.length + ' pending prices');
  pendingPrices.forEach(pp => {
    console.log('- ' + pp.orderNumber + ': ' + pp.currency + ' ' + pp.valueNetto + ' (status: ' + pp.status + ')');
  });

  const orders = await prisma.order.findMany({
    where: {
      orderNumber: {
        in: ['53428', '53473', '53439', '53460', '53461', '53476']
      }
    },
    select: {
      orderNumber: true,
      valueEur: true,
      valuePln: true,
    }
  });

  console.log('\n=== ORDERS ===');
  orders.forEach(o => {
    const eur = o.valueEur || 0;
    const pln = o.valuePln || 0;
    console.log('- ' + o.orderNumber + ': EUR ' + eur + ' / PLN ' + pln);
  });

  await prisma.$disconnect();
}

main();
