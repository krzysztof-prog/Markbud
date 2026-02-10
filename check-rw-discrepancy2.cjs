const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // Zestawienie to styczen 2026 (211 zlecen z productionDate w styczniu)
  const janOrders = await prisma.order.findMany({
    where: {
      productionDate: {
        gte: new Date('2026-01-01'),
        lt: new Date('2026-02-01')
      },
      status: 'completed',
      archivedAt: null
    },
    select: {
      id: true,
      orderNumber: true,
      manualStatus: true,
    },
    orderBy: { orderNumber: 'asc' }
  });

  console.log('=== ZESTAWIENIE STYCZEN 2026 ===');
  console.log('Zlecen:', janOrders.length);

  // RW luty 2026 - demands z updatedAt w lutym
  const febDemands = await prisma.okucDemand.findMany({
    where: {
      status: 'completed',
      updatedAt: {
        gte: new Date('2026-02-01'),
        lt: new Date('2026-03-01')
      },
      order: {
        manualStatus: { notIn: ['do_not_cut', 'cancelled'] }
      }
    },
    select: {
      orderId: true,
      order: {
        select: {
          orderNumber: true,
          productionDate: true,
        }
      }
    }
  });

  const rwOrderNumbers = new Set();
  febDemands.forEach(d => {
    if (d.order) rwOrderNumbers.add(d.order.orderNumber);
  });

  console.log('\n=== RW LUTY 2026 ===');
  console.log('Unique orders w RW:', rwOrderNumbers.size);

  // Ktore zlecenia ze stycznia SA w RW lutego
  const janOrderNumbers = new Set(janOrders.map(o => o.orderNumber));
  const janInRwFeb = [...janOrderNumbers].filter(n => rwOrderNumbers.has(n));
  const janNotInRwFeb = [...janOrderNumbers].filter(n => {
    return !rwOrderNumbers.has(n);
  });

  console.log('\n=== POROWNANIE ===');
  console.log('Zlecenia ze styczen zestawienia ktore SA w RW luty:', janInRwFeb.length);
  console.log('Zlecenia ze styczen zestawienia ktore NIE SA w RW luty:', janNotInRwFeb.length);
  console.log('\nBrakujace zlecenia:');
  janNotInRwFeb.forEach(n => console.log('  ', n));

  // Sprawdz czy te brakujace maja w ogole demands
  const missingOrderIds = janOrders
    .filter(o => janNotInRwFeb.includes(o.orderNumber))
    .map(o => o.id);

  if (missingOrderIds.length > 0) {
    const missingDemands = await prisma.okucDemand.findMany({
      where: {
        orderId: { in: missingOrderIds }
      },
      select: {
        orderId: true,
        status: true,
        updatedAt: true,
        order: { select: { orderNumber: true } }
      }
    });

    // Grupuj demands per order
    const demandsByOrder = {};
    missingDemands.forEach(d => {
      const num = d.order?.orderNumber || d.orderId;
      if (!demandsByOrder[num]) demandsByOrder[num] = [];
      demandsByOrder[num].push({
        status: d.status,
        updatedAt: d.updatedAt?.toISOString().slice(0,10)
      });
    });

    console.log('\n=== DLACZEGO BRAKUJE TYCH ZLECEN W RW LUTY ===');
    for (const [orderNum, demands] of Object.entries(demandsByOrder)) {
      const statuses = demands.map(d => d.status);
      const uniqueStatuses = [...new Set(statuses)];
      const months = demands.map(d => d.updatedAt?.slice(0,7)).filter(Boolean);
      const uniqueMonths = [...new Set(months)];
      console.log(`  ${orderNum}: ${demands.length} demands, statuses: [${uniqueStatuses.join(',')}], updatedAt months: [${uniqueMonths.join(',')}]`);
    }

    // Zlecenia z zestawienia bez zadnego demand
    const ordersWithDemands = new Set(missingDemands.map(d => d.order?.orderNumber).filter(Boolean));
    const ordersWithNoDemandAtAll = janNotInRwFeb.filter(n => {
      return !ordersWithDemands.has(n);
    });
    console.log('\n=== ZLECENIA BEZ ZADNEGO OKUC DEMAND ===');
    console.log('Liczba:', ordersWithNoDemandAtAll.length);
    ordersWithNoDemandAtAll.forEach(n => console.log('  ', n));
  }

  // Sprawdz ile RW luty ma zlecen ktore NIE SA w zestawieniu stycznia
  const rwOnlyOrders = [...rwOrderNumbers].filter(n => {
    return !janOrderNumbers.has(n);
  });
  console.log('\n=== RW LUTY - ZLECENIA SPOZA ZESTAWIENIA STYCZEN ===');
  console.log('Liczba:', rwOnlyOrders.length);
  rwOnlyOrders.forEach(n => console.log('  ', n));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
