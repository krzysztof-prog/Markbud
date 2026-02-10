const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      productionDate: {
        gte: new Date('2026-01-01'),
        lt: new Date('2026-02-01')
      },
      deletedAt: null
    },
    select: {
      orderNumber: true,
      client: true,
      totalWindows: true,
      totalGlasses: true,
      totalSashes: true,
      valuePln: true,
      valueEur: true
    },
    orderBy: { orderNumber: 'asc' }
  });

  console.log('Liczba zleceń w styczniu 2026:', orders.length);

  const isAkrobud = (o) => o.client && o.client.toUpperCase().includes('AKROBUD');
  const akrOrders = orders.filter(isAkrobud);
  const nonAkrOrders = orders.filter(o => !isAkrobud(o));

  // Sumy AKROBUD
  let akrW = 0, akrU = 0, akrS = 0, akrP = 0, akrE = 0;
  akrOrders.forEach(o => {
    akrW += o.totalWindows || 0;
    akrU += o.totalGlasses || 0;
    akrS += o.totalSashes || 0;
    akrP += o.valuePln || 0;
    akrE += o.valueEur || 0;
  });

  // Sumy pozostałe
  let othW = 0, othU = 0, othS = 0, othP = 0;
  nonAkrOrders.forEach(o => {
    othW += o.totalWindows || 0;
    othU += o.totalGlasses || 0;
    othS += o.totalSashes || 0;
    othP += o.valuePln || 0;
  });

  console.log('\n=== PODSUMOWANIE SYSTEM ===');
  console.log(`AKROBUD (${akrOrders.length} zleceń): okna=${akrW} jedn=${akrU} skrz=${akrS} EUR=${(akrE/100).toFixed(0)} PLN=${(akrP/100).toFixed(0)}`);
  console.log(`RESZTA (${nonAkrOrders.length} zleceń): okna=${othW} jedn=${othU} skrz=${othS} PLN=${(othP/100).toFixed(0)}`);
  console.log(`RAZEM: okna=${akrW+othW} jedn=${akrU+othU} skrz=${akrS+othS}`);

  console.log('\n=== ZLECENIA AKROBUD (format: NR|OKNA|JEDN|SKRZ|EUR|PLN) ===');
  akrOrders.forEach(o => {
    console.log(`${o.orderNumber}|${o.totalWindows||0}|${o.totalGlasses||0}|${o.totalSashes||0}|${(o.valueEur||0)/100}|${(o.valuePln||0)/100}`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
