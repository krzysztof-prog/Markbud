const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const unknowns = await prisma.pendingOrderPrice.findMany({
    where: { orderNumber: 'UNKNOWN' },
    select: { id: true, filename: true, filepath: true, createdAt: true, valueNetto: true, currency: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log('=== Pending prices z UNKNOWN ===');
  console.log('Łącznie:', unknowns.length);
  console.log('');

  for (const p of unknowns) {
    const val = (p.valueNetto / 100).toFixed(2);
    console.log(`ID ${p.id} | ${p.filename} | ${p.currency} ${val}`);
  }

  await prisma.$disconnect();
}

main();
