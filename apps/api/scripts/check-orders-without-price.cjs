const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Zlecenia wyprodukowane (productionDate != null) bez ceny (valuePln = 0 lub null)
  const ordersWithoutPrice = await prisma.order.findMany({
    where: {
      productionDate: { not: null },
      OR: [
        { valuePln: null },
        { valuePln: 0 }
      ],
      deletedAt: null
    },
    select: {
      id: true,
      orderNumber: true,
      valuePln: true,
      valueEur: true,
      priceInheritedFromOrder: true,
      productionDate: true,
      createdAt: true
    },
    orderBy: { productionDate: 'desc' },
    take: 100
  });

  console.log('=== Zlecenia wyprodukowane BEZ ceny ===');
  console.log('Łącznie znaleziono:', ordersWithoutPrice.length);
  console.log('');

  for (const o of ordersWithoutPrice) {
    const prodDate = o.productionDate ? o.productionDate.toISOString().split('T')[0] : 'brak';
    console.log(`${o.orderNumber} | valuePln: ${o.valuePln} | inherited: ${o.priceInheritedFromOrder} | prod: ${prodDate}`);
  }

  // Sprawdźmy też konkretne zlecenie 53627
  console.log('\n=== Szczegóły zlecenia 53627 ===');
  const order53627 = await prisma.order.findFirst({
    where: { orderNumber: '53627' },
    select: {
      id: true,
      orderNumber: true,
      valuePln: true,
      valueEur: true,
      priceInheritedFromOrder: true,
      productionDate: true,
      createdAt: true,
      status: true
    }
  });
  console.log(order53627);

  // Sprawdźmy czy są pending prices dla tego zlecenia
  console.log('\n=== Pending prices dla 53627 ===');
  const pendingPrices = await prisma.pendingOrderPrice.findMany({
    where: {
      OR: [
        { orderNumber: '53627' },
        { orderNumber: { contains: '53627' } }
      ]
    }
  });
  console.log('Znaleziono pending prices:', pendingPrices.length);
  for (const p of pendingPrices) {
    console.log(`  ${p.orderNumber} | ${p.valueNetto} | ${p.filename}`);
  }

  // Szukam pending prices z numerem zamówienia Schuco 251209043
  console.log('\n=== Pending prices dla 251209043/D5486 ===');
  const pendingSchucoNum = await prisma.pendingOrderPrice.findMany({
    where: {
      OR: [
        { orderNumber: { contains: '251209043' } },
        { orderNumber: { contains: 'D5486' } },
        { filename: { contains: 'D5486' } }
      ]
    }
  });
  console.log('Znaleziono:', pendingSchucoNum.length);
  for (const p of pendingSchucoNum) {
    console.log(`  ${p.orderNumber} | ${p.valueNetto} | ${p.filename}`);
  }

  // Sprawdźmy też wszystkie pending prices z ostatnich dni
  console.log('\n=== Ostatnie 20 pending prices ===');
  const recentPending = await prisma.pendingOrderPrice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  for (const p of recentPending) {
    console.log(`${p.orderNumber} | ${p.valueNetto} | ${p.filename} | status: ${p.status}`);
  }

  // Szukam importu pliku D5486
  console.log('\n=== Importy plików z D5486 ===');
  const imports = await prisma.fileImport.findMany({
    where: {
      OR: [
        { filename: { contains: 'D5486' } },
        { filename: { contains: '5486' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Znaleziono:', imports.length);
  for (const i of imports) {
    console.log(`${i.filename} | type: ${i.fileType} | status: ${i.status} | created: ${i.createdAt}`);
  }

  // Ostatnie 10 importów cen
  console.log('\n=== Ostatnie 10 importów cen (prices) ===');
  const priceImports = await prisma.fileImport.findMany({
    where: { fileType: 'prices' },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  for (const i of priceImports) {
    console.log(`${i.filename} | status: ${i.status} | created: ${i.createdAt}`);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
