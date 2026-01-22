import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const reqs = await prisma.orderRequirement.findMany({
    where: {
      color: { code: '000' }
    },
    include: {
      order: { select: { orderNumber: true } },
      profile: { select: { number: true } }
    },
    orderBy: { id: 'desc' },
    take: 20
  });

  console.log('orderNum | profile | beams | restMm | meters | expected | match');
  console.log('---------|---------|-------|--------|--------|----------|------');

  for (const r of reqs) {
    let expectedMeters = 0;
    if (r.restMm > 0) {
      const roundedRest = Math.ceil(r.restMm / 500) * 500;
      const reszta2Mm = 6000 - roundedRest;
      expectedMeters = reszta2Mm / 1000;
    }

    const match = r.meters === expectedMeters ? 'OK' : 'DIFF';
    console.log(`${r.order.orderNumber.padEnd(8)} | ${r.profile.number.padEnd(7)} | ${String(r.beamsCount).padEnd(5)} | ${String(r.restMm).padEnd(6)} | ${String(r.meters).padEnd(6)} | ${String(expectedMeters).padEnd(8)} | ${match}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
