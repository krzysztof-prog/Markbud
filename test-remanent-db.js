const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:./prisma/prod.db' } } });

async function main() {
  // 1. WarehouseStock for color 6
  console.log('=== 1. WarehouseStock for colorId=6 ===');
  const stocks = await prisma.warehouseStock.findMany({
    where: { colorId: 6, deletedAt: null },
    include: { profile: { select: { number: true } } },
    orderBy: { profile: { number: 'asc' } },
  });
  for (const s of stocks) {
    console.log(`  ${s.profile.number}: initial=${s.initialStockBeams} current=${s.currentStockBeams} remanentDate=${s.remanentDate?.toISOString() ?? 'NULL'}`);
  }

  // 2. Schuco deliveries "Calkowicie dostarczone" with articleNumber ending in 000
  console.log('\n=== 2. Schuco deliveries for color 000 (last 10) ===');
  const deliveries = await prisma.schucoOrderItem.findMany({
    where: {
      articleNumber: { endsWith: '000' },
      schucoDelivery: {
        shippingStatus: 'Całkowicie dostarczone',
        archivedAt: null,
      },
    },
    include: { schucoDelivery: { select: { deliveryDate: true, shippingStatus: true } } },
    take: 10,
    orderBy: { schucoDelivery: { deliveryDate: 'desc' } },
  });
  for (const d of deliveries) {
    console.log(`  ${d.articleNumber}: shipped=${d.shippedQty} unit=${d.unit} date=${d.schucoDelivery.deliveryDate?.toISOString() ?? 'NULL'}`);
  }

  // 3. Completed orders (RW) for color 6
  console.log('\n=== 3. Completed orders (RW) for colorId=6 (last 10) ===');
  const rw = await prisma.orderRequirement.findMany({
    where: {
      colorId: 6,
      order: { status: 'completed' },
    },
    include: {
      profile: { select: { number: true } },
      order: { select: { status: true, productionDate: true, completedAt: true, updatedAt: true } },
    },
    take: 10,
    orderBy: { order: { completedAt: 'desc' } },
  });
  for (const r of rw) {
    console.log(`  ${r.profile.number}: beams=${r.beamsCount} meters=${r.meters} date=${(r.order.productionDate ?? r.order.completedAt ?? r.order.updatedAt)?.toISOString() ?? 'NULL'}`);
  }

  // 4. Count total
  const totalDeliveries = await prisma.schucoOrderItem.count({
    where: {
      articleNumber: { endsWith: '000' },
      schucoDelivery: { shippingStatus: 'Całkowicie dostarczone', archivedAt: null },
    },
  });
  const totalRW = await prisma.orderRequirement.count({
    where: { colorId: 6, order: { status: 'completed' } },
  });
  console.log(`\n=== Totals ===`);
  console.log(`  Schuco deliveries (000): ${totalDeliveries}`);
  console.log(`  Completed RW (colorId=6): ${totalRW}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
