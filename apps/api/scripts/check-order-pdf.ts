import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

async function check() {
  const orderNumber = process.argv[2] || '53787';

  const order = await prisma.order.findFirst({
    where: { orderNumber }
  });

  if (!order) {
    console.log(`Zlecenie ${orderNumber} nie znalezione`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Zlecenie ${orderNumber}:`);
  console.log('  ID:', order.id);
  console.log('  valueEur:', order.valueEur);

  // Sprawdź jak handler szuka PDF - metadata contains "orderId":ID
  const pdfImport = await prisma.fileImport.findFirst({
    where: {
      fileType: 'ceny_pdf',
      status: 'completed',
      metadata: {
        contains: `"orderId":${order.id}`
      }
    },
    orderBy: { processedAt: 'desc' }
  });

  console.log('\nFileImport (tak jak szuka handler):');
  if (pdfImport) {
    console.log('  ID:', pdfImport.id);
    console.log('  filename:', pdfImport.filename);
    console.log('  filepath:', pdfImport.filepath);
    console.log('  exists:', existsSync(pdfImport.filepath));
    console.log('  metadata:', pdfImport.metadata);
  } else {
    console.log('  BRAK - nie znaleziono po metadata!');

    // Sprawdź wszystkie importy z tym numerem w nazwie
    const allByName = await prisma.fileImport.findMany({
      where: {
        OR: [
          { filename: { contains: orderNumber } },
          { metadata: { contains: orderNumber } }
        ]
      }
    });
    console.log(`\nWszystkie importy zawierające ${orderNumber}:`, allByName.length);
    for (const imp of allByName) {
      console.log(`  - ${imp.filename} | status: ${imp.status} | type: ${imp.fileType}`);
      console.log(`    metadata: ${imp.metadata?.substring(0, 200)}...`);
    }
  }

  await prisma.$disconnect();
}

check();
