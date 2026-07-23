const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const profileNumber = '8869';
  const colorId = 6;

  // Znajdź profil po numerze
  const profile = await prisma.profile.findFirst({
    where: { number: profileNumber },
    select: { id: true, number: true, name: true },
  });
  if (!profile) {
    console.log('Profile not found by number:', profileNumber);
    await prisma.$disconnect();
    return;
  }
  console.log('Profile:', profile);

  // Pobierz remanentDate
  const stock = await prisma.warehouseStock.findUnique({
    where: { profileId_colorId: { profileId: profile.id, colorId } },
    select: { remanentDate: true, initialStockBeams: true, currentStockBeams: true },
  });
  console.log('Stock record:', stock);
  console.log('Remanent date:', stock?.remanentDate?.toISOString());

  // Pobierz RW requirements
  const requirements = await prisma.orderRequirement.findMany({
    where: {
      profileId: profile.id,
      colorId,
      order: { status: 'completed' },
    },
    select: {
      id: true,
      beamsCount: true,
      meters: true,
      order: {
        select: {
          orderNumber: true,
          productionDate: true,
          completedAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { order: { orderNumber: 'asc' } },
  });

  console.log('\n--- RW Requirements for profile', profileNumber, '(id:', profile.id + ') color', colorId, '---');
  console.log('Total requirements found:', requirements.length);

  let totalBeams = 0;
  let totalMeters = 0;
  let afterRemanentBeams = 0;
  let afterRemanentMeters = 0;
  let skippedCount = 0;

  for (const req of requirements) {
    const orderDate = req.order.productionDate ?? req.order.completedAt ?? req.order.updatedAt;
    const isBeforeRemanent = stock?.remanentDate && orderDate < stock.remanentDate;

    totalBeams += req.beamsCount;
    totalMeters += req.meters;

    if (!isBeforeRemanent) {
      afterRemanentBeams += req.beamsCount;
      afterRemanentMeters += req.meters;
    } else {
      skippedCount++;
    }

    const marker = isBeforeRemanent ? ' [SKIPPED - before remanent]' : '';
    console.log(
      ' ', req.order.orderNumber.padEnd(12),
      '| beams:', String(req.beamsCount).padStart(3),
      '| meters:', String(req.meters).padStart(6),
      '| date:', (orderDate?.toISOString().split('T')[0] || 'null'),
      marker
    );
  }

  const rwBeamsFromMeters = Math.ceil(afterRemanentMeters / 6);
  const rwTotal = afterRemanentBeams + rwBeamsFromMeters;

  console.log('\n=== SUMMARY ===');
  console.log('Skipped (before remanent):', skippedCount);
  console.log('After remanent:');
  console.log('  Beams (direct):', afterRemanentBeams);
  console.log('  Meters (leftover):', afterRemanentMeters);
  console.log('  Extra beams from meters: ceil(' + afterRemanentMeters + ' / 6) =', rwBeamsFromMeters);
  console.log('');
  console.log('  RW TOTAL =', afterRemanentBeams, '+', rwBeamsFromMeters, '=', rwTotal);
  console.log('');
  console.log('User sees RW = 45, manually counts = 41');
  console.log('Difference:', rwTotal, '- 41 =', rwTotal - 41, '(likely from meters conversion)');

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
