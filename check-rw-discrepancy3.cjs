const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // Symulacja tego co robi frontend:
  // 1. Backend pobiera WSZYSTKIE demands (z wykluczonymi manualStatus)
  // 2. Frontend filtruje status=completed
  // 3. Frontend grupuje po getMonthKey (updatedAt -> rok-miesiac)

  // Krok 1: Pobierz demands tak jak backend (z filtrem manualStatus)
  const allDemands = await prisma.okucDemand.findMany({
    where: {
      OR: [
        { orderId: null },
        {
          order: {
            OR: [
              { manualStatus: null },
              { manualStatus: { notIn: ['do_not_cut', 'cancelled'] } }
            ]
          }
        }
      ]
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      orderId: true,
      order: {
        select: {
          orderNumber: true,
          productionDate: true,
          manualStatus: true
        }
      }
    }
  });

  console.log('Total demands from API:', allDemands.length);

  // Krok 2: Filtruj completed (jak frontend)
  const completedDemands = allDemands.filter(d => d.status === 'completed');
  console.log('Completed demands:', completedDemands.length);

  // Krok 3: Grupuj po miesiacu (jak getMonthKey)
  function getMonthKey(demand) {
    if (demand.updatedAt) {
      const date = new Date(demand.updatedAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    return 'unknown';
  }

  const monthGroups = {};
  for (const demand of completedDemands) {
    const monthKey = getMonthKey(demand);
    const orderNumber = demand.order?.orderNumber || `Zlecenie #${demand.orderId}`;

    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = {
        orderNumbers: new Set(),
        demandCount: 0
      };
    }
    monthGroups[monthKey].orderNumbers.add(orderNumber);
    monthGroups[monthKey].demandCount++;
  }

  console.log('\n=== GRUPY MIESIECZNE (jak RW) ===');
  const sortedKeys = Object.keys(monthGroups).sort().reverse();
  for (const key of sortedKeys) {
    const group = monthGroups[key];
    console.log(`  ${key}: ${group.orderNumbers.size} zlecen, ${group.demandCount} demands`);
  }

  // Krok 4: Szczegoly dla luty 2026
  const febKey = '2026-02';
  if (monthGroups[febKey]) {
    const febOrders = monthGroups[febKey].orderNumbers;
    console.log(`\n=== RW LUTY 2026: ${febOrders.size} zlecen ===`);

    // Porownaj z zestawieniem (styczen 2026 productionDate)
    const janOrders = await prisma.order.findMany({
      where: {
        productionDate: {
          gte: new Date('2026-01-01'),
          lt: new Date('2026-02-01')
        },
        status: 'completed',
        archivedAt: null
      },
      select: { orderNumber: true }
    });

    const janOrderNumbers = new Set(janOrders.map(o => o.orderNumber));
    console.log('Zestawienie styczen 2026:', janOrderNumbers.size, 'zlecen');

    // Ktore ze zestawienia NIE sa w RW luty
    const missingFromRw = [...janOrderNumbers].filter(n => {
      return !febOrders.has(n);
    }).sort();

    console.log(`\n=== BRAKUJACE W RW LUTY (jest w zestawieniu, nie ma w RW): ${missingFromRw.length} ===`);
    missingFromRw.forEach(n => console.log('  ', n));

    // Dla kazdego brakujacego, sprawdz dlaczego
    if (missingFromRw.length > 0) {
      console.log('\n=== POWODY BRAKU ===');
      for (const orderNum of missingFromRw) {
        // Znajdz demands tego zlecenia
        const orderDemands = allDemands.filter(d => d.order?.orderNumber === orderNum);
        const completedOrderDemands = orderDemands.filter(d => d.status === 'completed');

        if (orderDemands.length === 0) {
          console.log(`  ${orderNum}: BRAK DEMANDS W OGOLE`);
        } else if (completedOrderDemands.length === 0) {
          const statuses = [...new Set(orderDemands.map(d => d.status))];
          console.log(`  ${orderNum}: ${orderDemands.length} demands, ZADNE nie completed (statuses: ${statuses.join(',')})`);
        } else {
          // Ma completed demands ale sa w innym miesiacu
          const months = completedOrderDemands.map(d => getMonthKey(d));
          const uniqueMonths = [...new Set(months)];
          console.log(`  ${orderNum}: ${completedOrderDemands.length} completed demands, ALE w miesiacach: ${uniqueMonths.join(', ')} (nie w lutym)`);
        }
      }
    }

    // Ktore w RW luty nie sa w zestawieniu styczen
    const extraInRw = [...febOrders].filter(n => {
      return !janOrderNumbers.has(n);
    }).sort();
    if (extraInRw.length > 0) {
      console.log(`\n=== DODATKOWE W RW LUTY (nie ma w zestawieniu): ${extraInRw.length} ===`);
      extraInRw.forEach(n => console.log('  ', n));
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
