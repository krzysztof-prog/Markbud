const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const ARCHIVE_FOLDER = 'C:/DEV_DATA/uzyte_bele/archiwum';

async function reimport() {
  console.log('=== REIMPORT REQUIREMENTS ===\n');

  // Pobierz wszystkie zlecenia z dostaw
  const ordersInDeliveries = await prisma.deliveryOrder.findMany({
    include: {
      order: { select: { id: true, orderNumber: true } }
    }
  });

  const orderNumbers = [...new Set(ordersInDeliveries.map(d => d.order.orderNumber))];
  console.log('Zlecenia w dostawach:', orderNumbers.length);
  console.log('Numery:', orderNumbers.join(', '));

  // Sprawdź które pliki istnieją w archiwum
  const files = fs.readdirSync(ARCHIVE_FOLDER);
  console.log('\nPliki w archiwum:', files.length);

  // Znajdź pliki dla zleceń w dostawach
  const filesToImport = [];
  for (const orderNum of orderNumbers) {
    const matchingFile = files.find(f => f.startsWith(orderNum + '_') || f.startsWith(orderNum + '-'));
    if (matchingFile) {
      filesToImport.push({
        orderNumber: orderNum,
        file: matchingFile,
        fullPath: path.join(ARCHIVE_FOLDER, matchingFile)
      });
    } else {
      console.log('  BRAK pliku dla zlecenia:', orderNum);
    }
  }

  console.log('\nPliki do reimportu:', filesToImport.length);
  for (const f of filesToImport) {
    console.log('  -', f.orderNumber, ':', f.file);
  }

  await prisma.$disconnect();
}

reimport().catch(console.error);
