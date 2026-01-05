import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { orderNumber: '53348' },
    select: { id: true, orderNumber: true, valuePln: true, valueEur: true, project: true }
  });

  console.log('📋 Zlecenie 53348:', order);

  // Sprawdź importy PDF
  const imports = await prisma.fileImport.findMany({
    where: { fileType: 'ceny_pdf', status: 'completed' },
    select: { id: true, filename: true, status: true, metadata: true, processedAt: true },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n📄 Ostatnie zakończone importy PDF:');
  imports.forEach(i => {
    let meta = {};
    try { meta = JSON.parse(i.metadata || '{}'); } catch {}
    console.log(`  ${i.filename} | orderId: ${meta.orderId || '-'} | ${i.processedAt}`);
  });

  await prisma.$disconnect();
}
main().catch(console.error);
