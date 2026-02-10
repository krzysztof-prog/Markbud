const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  // Pending prices z UNKNOWN
  const unknownPrices = await prisma.pendingOrderPrice.findMany({
    where: {
      status: 'pending',
      orderNumber: 'UNKNOWN'
    },
    select: { filename: true, filepath: true, valueNetto: true },
    take: 20
  });

  console.log('=== PENDING PRICES z UNKNOWN (parser nie wyciągnął numeru) ===');
  console.log('Łącznie UNKNOWN:', unknownPrices.length);
  for (const p of unknownPrices) {
    console.log('  ' + p.filename + ' | ' + (p.valueNetto/100).toFixed(2));
  }

  // Pending prices z poprawnym numerem (nie UNKNOWN)
  const validPrices = await prisma.pendingOrderPrice.findMany({
    where: {
      status: 'pending',
      NOT: { orderNumber: 'UNKNOWN' }
    },
    select: { orderNumber: true, filename: true, valueNetto: true }
  });

  console.log('\n=== PENDING PRICES z wyciągniętym numerem ===');
  console.log('Łącznie:', validPrices.length);
  for (const p of validPrices.slice(0, 30)) {
    console.log('  ' + p.orderNumber + ' | ' + p.filename + ' | ' + (p.valueNetto/100).toFixed(2));
  }

  // Sprawdź które z tych numerów istnieją jako zlecenia
  const orderNumbers = [...new Set(validPrices.map(p => p.orderNumber))];
  console.log('\n=== Sprawdzanie czy zlecenia istnieją ===');

  let existCount = 0;
  let notExistCount = 0;
  let notExistList = [];

  for (const num of orderNumbers) {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: num },
          { orderNumber: { startsWith: num } }
        ],
        deletedAt: null
      },
      select: { id: true, orderNumber: true, valuePln: true, valueEur: true }
    });

    if (order) {
      existCount++;
      // Czy ma już cenę?
      if (!order.valuePln && !order.valueEur) {
        console.log('  ✅ ' + num + ' -> order ' + order.orderNumber + ' (BEZ CENY - można naprawić!)');
      }
    } else {
      notExistCount++;
      notExistList.push(num);
    }
  }

  console.log('\nIstnieją:', existCount);
  console.log('Nie istnieją:', notExistCount);
  if (notExistList.length > 0) {
    console.log('Nieistniejące:', notExistList.slice(0, 10).join(', '));
  }

  await prisma.$disconnect();
}

analyze().catch(console.error);
