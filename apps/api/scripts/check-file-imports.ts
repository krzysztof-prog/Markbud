import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Sprawdź ile dostaw mamy
  const deliveries = await prisma.glassDelivery.findMany({
    select: {
      id: true,
      customerOrderNumber: true,
      rackNumber: true,
      fileImportId: true
    },
    orderBy: { id: 'asc' }
  });

  console.log('Liczba dostaw:', deliveries.length);

  // Sprawdź czy są powiązane FileImport
  const withFileImport = deliveries.filter(d => d.fileImportId !== null);
  console.log('Z fileImportId:', withFileImport.length);

  // Sprawdź FileImport
  const fileImports = await prisma.fileImport.findMany({
    where: {
      importType: 'glass_delivery'
    },
    select: {
      id: true,
      filename: true,
      filePath: true
    }
  });
  console.log('\nFileImports (glass_delivery):', fileImports.length);
  for (const fi of fileImports.slice(0, 10)) {
    console.log('  -', fi.id, fi.filename, fi.filePath);
  }

  await prisma.$disconnect();
}
check();
