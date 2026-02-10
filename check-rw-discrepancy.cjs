const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // 0. Sprawdz czy baza ma dane
  const totalOrders = await prisma.order.count();
  console.log('Total orders in DB:', totalOrders);

  // Sprawdz ostatnie zlecenia
  const latestOrders = await prisma.order.findMany({
    orderBy: { productionDate: 'desc' },
    where: { productionDate: { not: null } },
    take: 5,
    select: { orderNumber: true, productionDate: true, status: true }
  });
  console.log('Latest orders by productionDate:');
  latestOrders.forEach(o => {
    console.log('  ', o.orderNumber, o.productionDate?.toISOString().slice(0,10), o.status);
  });

  // 1. Zlecenia z zestawienia produkcji za luty 2026
  const ordersInFeb = await prisma.order.findMany({
    where: {
      productionDate: {
        gte: new Date('2026-02-01'),
        lt: new Date('2026-03-01')
      },
      status: 'completed',
      archivedAt: null
    },
    select: {
      id: true,
      orderNumber: true,
      manualStatus: true,
      productionDate: true,
    },
    orderBy: { productionDate: 'asc' }
  });

  console.log('\n=== ZLECENIA Z PRODUKCJA W LUTYM 2026 (zestawienie) ===');
  console.log('Liczba zlecen:', ordersInFeb.length);

  if (ordersInFeb.length === 0) {
    // Moze daty sa w innym formacie? Sprawdzmy
    const allWithProdDate = await prisma.order.findMany({
      where: {
        productionDate: { not: null },
        status: 'completed'
      },
      select: { productionDate: true },
      orderBy: { productionDate: 'desc' },
      take: 3
    });
    console.log('Latest productionDates:', allWithProdDate.map(o => o.productionDate));

    // Probuj szeroszy zakres
    const janOrders = await prisma.order.count({
      where: {
        productionDate: {
          gte: new Date('2026-01-01'),
          lt: new Date('2026-02-01')
        },
        status: 'completed'
      }
    });
    console.log('Orders in Jan 2026:', janOrders);

    const febOrders2 = await prisma.order.count({
      where: {
        productionDate: {
          gte: new Date('2026-01-31'),
          lt: new Date('2026-03-02')
        },
        status: 'completed'
      }
    });
    console.log('Orders in Feb 2026 (wider range):', febOrders2);
  }

  const cancelled = ordersInFeb.filter(o => o.manualStatus === 'cancelled');
  const doNotCut = ordersInFeb.filter(o => o.manualStatus === 'do_not_cut');

  console.log('  cancelled:', cancelled.length);
  console.log('  do_not_cut:', doNotCut.length);

  // 2. OkucDemands z status=completed
  const orderIds = ordersInFeb.map(o => o.id);

  if (orderIds.length > 0) {
    const demands = await prisma.okucDemand.findMany({
      where: {
        orderId: { in: orderIds },
        status: 'completed'
      },
      select: {
        orderId: true,
        updatedAt: true
      }
    });

    const orderIdsWithDemands = new Set(demands.map(d => d.orderId));
    console.log('\n=== OKUC DEMAND completed dla tych zlecen ===');
    console.log('Demands count:', demands.length);
    console.log('Unique orders with completed demands:', orderIdsWithDemands.size);

    // Demands z updatedAt w lutym (te ktore RW pokaże w lutym)
    const febUpdatedDemands = demands.filter(d => {
      const date = d.updatedAt;
      return date >= new Date('2026-02-01') && date < new Date('2026-03-01');
    });
    const febUpdatedOrders = new Set(febUpdatedDemands.map(d => d.orderId));
    console.log('Demands with updatedAt in Feb:', febUpdatedDemands.length);
    console.log('Unique orders with updatedAt in Feb:', febUpdatedOrders.size);

    // 3. Zlecenia BEZ completed demands
    const ordersWithoutDemands = ordersInFeb.filter(o => {
      return !orderIdsWithDemands.has(o.id);
    });
    console.log('\n=== ZLECENIA BEZ COMPLETED OKUC DEMAND ===');
    console.log('Liczba:', ordersWithoutDemands.length);
    ordersWithoutDemands.forEach(o => {
      const prodDate = o.productionDate ? o.productionDate.toISOString().slice(0,10) : 'null';
      console.log('  ', o.orderNumber, '| manualStatus:', o.manualStatus || 'null', '| prodDate:', prodDate);
    });

    // 4. Sprawdz ile tych zlecen NIE ma w ogole zadnych demands
    const allDemands = await prisma.okucDemand.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, status: true }
    });
    const withAnyDemand = new Set(allDemands.map(d => d.orderId));
    const withNoDemand = ordersInFeb.filter(o => !withAnyDemand.has(o.id));
    console.log('\n=== ZLECENIA BEZ ZADNEGO DEMAND (nawet pending) ===');
    console.log('Liczba:', withNoDemand.length);
    withNoDemand.forEach(o => {
      console.log('  ', o.orderNumber, '| manualStatus:', o.manualStatus || 'null');
    });
  }

  // 5. Ile demands total z updatedAt w lutym RW widzi
  const allFebRwDemands = await prisma.okucDemand.findMany({
    where: {
      status: 'completed',
      updatedAt: {
        gte: new Date('2026-02-01'),
        lt: new Date('2026-03-01')
      }
    },
    select: {
      orderId: true,
      order: {
        select: {
          orderNumber: true,
          manualStatus: true
        }
      }
    }
  });

  const rwOrders = new Set();
  const rwExcluded = new Set();
  allFebRwDemands.forEach(d => {
    if (d.order) {
      if (d.order.manualStatus === 'cancelled' || d.order.manualStatus === 'do_not_cut') {
        rwExcluded.add(d.order.orderNumber);
      } else {
        rwOrders.add(d.order.orderNumber);
      }
    }
  });

  console.log('\n=== CO RW WIDZI W LUTYM (demands updatedAt w lutym, nie wykluczone) ===');
  console.log('Total demands:', allFebRwDemands.length);
  console.log('Unique orders (RW pokaże):', rwOrders.size);
  console.log('Wykluczone (cancelled/do_not_cut):', rwExcluded.size);
  if (rwExcluded.size > 0) console.log('  ->', [...rwExcluded].join(', '));

  // 6. Które zlecenia z zestawienia nie są w RW?
  if (ordersInFeb.length > 0) {
    const zestawienieNumbers = new Set(ordersInFeb.map(o => o.orderNumber));
    const missingFromRw = [...zestawienieNumbers].filter(n => !rwOrders.has(n));
    const extraInRw = [...rwOrders].filter(n => !zestawienieNumbers.has(n));

    console.log('\n=== POROWNANIE ZESTAWIENIE vs RW ===');
    console.log('W zestawieniu ale NIE w RW:', missingFromRw.length);
    if (missingFromRw.length <= 50) {
      missingFromRw.forEach(n => console.log('  ', n));
    }
    console.log('W RW ale NIE w zestawieniu:', extraInRw.length);
    if (extraInRw.length <= 10) {
      extraInRw.forEach(n => console.log('  ', n));
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
