const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMissingPrices() {
  // Zlecenia wyprodukowane bez ceny
  const ordersWithoutPrice = await prisma.order.findMany({
    where: {
      productionDate: { not: null },
      valuePln: null,
      valueEur: null,
      deletedAt: null
    },
    select: {
      id: true,
      orderNumber: true,
      project: true,
      productionDate: true
    },
    orderBy: { productionDate: 'desc' },
    take: 50
  });

  console.log('=== ZLECENIA BEZ CENY - SZUKAM PDF W ARCHIWUM ===\n');

  const fs = require('fs');
  const path = require('path');
  const archivePath = 'C:/DEV_DATA/ceny/_archiwum';

  let files = [];
  try {
    files = fs.readdirSync(archivePath).filter(f => f.endsWith('.pdf'));
  } catch (e) {
    console.log('Nie można odczytać archiwum:', e.message);
  }

  console.log('Plików PDF w archiwum:', files.length);
  console.log('');

  let foundInArchive = 0;
  let notFoundInArchive = 0;
  let foundDetails = [];

  for (const order of ordersWithoutPrice) {
    const baseNum = order.orderNumber.replace(/-[a-z]$/i, '');
    const project = order.project || '';

    // Szukaj w archiwum po numerze zlecenia lub projekcie
    const matchingFiles = files.filter(f => {
      const fname = f.toLowerCase();
      return fname.includes(baseNum) ||
             (project && fname.includes(project.toLowerCase()));
    });

    if (matchingFiles.length > 0) {
      foundInArchive++;
      foundDetails.push({
        order: order.orderNumber,
        project: project,
        files: matchingFiles
      });
    } else {
      notFoundInArchive++;
    }
  }

  console.log('Znaleziono PDF w archiwum:', foundInArchive);
  console.log('Nie znaleziono PDF:', notFoundInArchive);

  console.log('\n=== ZLECENIA Z PDF W ARCHIWUM (do naprawy) ===');
  for (const d of foundDetails.slice(0, 30)) {
    console.log(d.order + ' (projekt: ' + d.project + ') -> ' + d.files.join(', '));
  }

  // Sprawdź też FileImport - które pliki zostały zaimportowane
  console.log('\n=== SPRAWDZAM FILEIMPORT ===');

  for (const d of foundDetails.slice(0, 10)) {
    for (const file of d.files) {
      const fi = await prisma.fileImport.findFirst({
        where: { filename: { contains: file.substring(0, 10) } },
        select: { id: true, filename: true, status: true, metadata: true }
      });
      if (fi) {
        let meta = {};
        try { meta = JSON.parse(fi.metadata || '{}'); } catch(e) {}
        console.log(d.order + ' | ' + fi.filename + ' | status=' + fi.status + ' | orderId=' + meta.orderId);
      }
    }
  }

  await prisma.$disconnect();
}

findMissingPrices().catch(console.error);
