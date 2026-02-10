const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.profile.findFirst({ where: { number: '9315' } });
  const color = await prisma.color.findFirst({ where: { code: '050' } });

  console.log('Profile:', profile?.id, profile?.number, profile?.name);
  console.log('Color:', color?.id, color?.code, color?.name);

  if (!profile || !color) {
    console.log('Nie znaleziono');
    return;
  }

  const requirements = await prisma.orderRequirement.findMany({
    where: {
      profileId: profile.id,
      colorId: color.id,
      order: {
        status: 'completed',
        productionDate: {
          gte: new Date('2026-01-01'),
          lt: new Date('2026-02-01'),
        },
      },
    },
    include: {
      order: { select: { orderNumber: true, productionDate: true } },
    },
    orderBy: { order: { orderNumber: 'asc' } },
  });

  console.log(`\nZnaleziono ${requirements.length} pozycji\n`);

  let totalBeams1000 = 0;
  let totalMeters1000 = 0;
  let totalBeams500 = 0;
  let totalMeters500 = 0;
  let totalBeamsExact = 0;
  let totalMetersExact = 0;

  console.log('Zlecenie     | restMm | beams(1000) | m(1000) | beams(500) | m(500) | beams(exact) | m(exact)');
  console.log('-------------|--------|-------------|---------|------------|--------|--------------|--------');

  for (const r of requirements) {
    totalBeams1000 += r.beamsCount;
    totalMeters1000 += r.meters;

    // Odtwórz oryginalne bele
    const roundedRest1000 = Math.floor(r.restMm / 1000) * 1000;
    const originalBeams = roundedRest1000 > 0 ? r.beamsCount + 1 : r.beamsCount;

    // Symulacja 500mm rounding
    const roundedRest500 = Math.floor(r.restMm / 500) * 500;
    let sim500Beams, sim500Meters;
    if (roundedRest500 === 0) {
      sim500Beams = originalBeams;
      sim500Meters = 0;
    } else {
      sim500Beams = originalBeams - 1;
      sim500Meters = (6000 - roundedRest500) / 1000;
    }
    totalBeams500 += sim500Beams;
    totalMeters500 += sim500Meters;

    // Symulacja bez zaokrąglania (exact)
    let exactBeams, exactMeters;
    if (r.restMm === 0) {
      exactBeams = originalBeams;
      exactMeters = 0;
    } else {
      exactBeams = originalBeams - 1;
      exactMeters = (6000 - r.restMm) / 1000;
    }
    totalBeamsExact += exactBeams;
    totalMetersExact += exactMeters;

    console.log(
      r.order.orderNumber.padEnd(13) + '| ' +
      String(r.restMm).padEnd(7) + '| ' +
      String(r.beamsCount).padEnd(12) + '| ' +
      String(r.meters).padEnd(8) + '| ' +
      String(sim500Beams).padEnd(11) + '| ' +
      String(sim500Meters).padEnd(7) + '| ' +
      String(exactBeams).padEnd(13) + '| ' +
      String(exactMeters.toFixed(3))
    );
  }

  console.log('\n=== PODSUMOWANIE ===\n');
  console.log('OBECNA LOGIKA (zaokr. 1000mm):');
  console.log('  SUM(beamsCount) =', totalBeams1000);
  console.log('  SUM(meters) =', totalMeters1000.toFixed(1));
  console.log('  Bele z metrow = ceil(' + totalMeters1000.toFixed(1) + ' / 6) =', Math.ceil(totalMeters1000 / 6));
  console.log('  RAZEM =', totalBeams1000 + Math.ceil(totalMeters1000 / 6), 'beli');
  console.log('');
  console.log('SYMULACJA (zaokr. 500mm):');
  console.log('  SUM(beamsCount) =', totalBeams500);
  console.log('  SUM(meters) =', totalMeters500.toFixed(1));
  console.log('  Bele z metrow = ceil(' + totalMeters500.toFixed(1) + ' / 6) =', Math.ceil(totalMeters500 / 6));
  console.log('  RAZEM =', totalBeams500 + Math.ceil(totalMeters500 / 6), 'beli');
  console.log('');
  console.log('SYMULACJA (bez zaokrąglania - exact):');
  console.log('  SUM(beamsCount) =', totalBeamsExact);
  console.log('  SUM(meters) =', totalMetersExact.toFixed(3));
  console.log('  Bele z metrow = ceil(' + totalMetersExact.toFixed(3) + ' / 6) =', Math.ceil(totalMetersExact / 6));
  console.log('  RAZEM =', totalBeamsExact + Math.ceil(totalMetersExact / 6), 'beli');
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
