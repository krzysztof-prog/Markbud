const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fix() {
  // Przenieś cenę EUR 1721 (172100 groszy) z 53916 na 53916-a
  await p.order.update({ where: { orderNumber: '53916-a' }, data: { valueEur: 172100 } });
  await p.order.update({ where: { orderNumber: '53916' }, data: { valueEur: null } });

  // Weryfikacja
  const o1 = await p.order.findUnique({ where: { orderNumber: '53916' }, select: { orderNumber: true, valueEur: true } });
  const o2 = await p.order.findUnique({ where: { orderNumber: '53916-a' }, select: { orderNumber: true, valueEur: true } });
  console.log('53916:', JSON.stringify(o1));
  console.log('53916-a:', JSON.stringify(o2));
  console.log('Done - price moved from 53916 to 53916-a');

  await p.$disconnect();
}

fix().catch(e => { console.error(e); process.exit(1); });
