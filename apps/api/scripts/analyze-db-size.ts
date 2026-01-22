import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeDatabase() {
  console.log('\n=== ANALIZA BAZY DANYCH AKROBUD ===\n');

  // 1. Zliczenie rekordów
  const counts: Record<string, number> = {};

  // Główne tabele
  counts['Order'] = await prisma.order.count();
  counts['OrderWindow'] = await prisma.orderWindow.count();
  counts['OrderGlass'] = await prisma.orderGlass.count();
  counts['OrderMaterial'] = await prisma.orderMaterial.count();
  counts['OrderRequirement'] = await prisma.orderRequirement.count();

  // Dostawy
  counts['Delivery'] = await prisma.delivery.count();
  counts['DeliveryItem'] = await prisma.deliveryItem.count();
  counts['DeliveryOrder'] = await prisma.deliveryOrder.count();

  // Szyby
  counts['GlassDelivery'] = await prisma.glassDelivery.count();
  counts['GlassDeliveryItem'] = await prisma.glassDeliveryItem.count();
  counts['GlassOrderItem'] = await prisma.glassOrderItem.count();
  counts['GlassOrder'] = await prisma.glassOrder.count();

  // Magazyn
  counts['WarehouseStock'] = await prisma.warehouseStock.count();
  counts['WarehouseHistory'] = await prisma.warehouseHistory.count();
  counts['WarehouseOrder'] = await prisma.warehouseOrder.count();

  // Profile i kolory
  counts['Profile'] = await prisma.profile.count();
  counts['Color'] = await prisma.color.count();
  counts['ProfileColor'] = await prisma.profileColor.count();

  // Importy
  counts['FileImport'] = await prisma.fileImport.count();

  // Palety
  counts['PalletOptimization'] = await prisma.palletOptimization.count();
  counts['OptimizedPallet'] = await prisma.optimizedPallet.count();

  // Użytkownicy
  counts['User'] = await prisma.user.count();
  counts['Note'] = await prisma.note.count();

  console.log('--- LICZBA REKORDOW W TABELACH ---');
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [table, count] of sorted) {
    const tablePadded = table.padEnd(25);
    const countPadded = count.toString().padStart(10);
    console.log(tablePadded + countPadded);
  }
  const total = sorted.reduce((sum, [, c]) => sum + c, 0);
  console.log('SUMA:'.padEnd(25) + total.toString().padStart(10));

  // 2. Analiza proporcji
  console.log('\n--- PROPORCJE (srednie na zlecenie) ---');
  const orderCount = counts['Order'] || 1;
  console.log('Okien / zlecenie:         ' + (counts['OrderWindow'] / orderCount).toFixed(1));
  console.log('Szyb / zlecenie:          ' + (counts['OrderGlass'] / orderCount).toFixed(1));
  console.log('Materialow / zlecenie:    ' + (counts['OrderMaterial'] / orderCount).toFixed(1));
  console.log('Requirements / zlecenie:  ' + (counts['OrderRequirement'] / orderCount).toFixed(1));

  // 3. Analiza zleceń w czasie
  console.log('\n--- ZLECENIA W CZASIE ---');
  const thisYear = new Date().getFullYear();
  for (let year = thisYear - 3; year <= thisYear; year++) {
    const yearCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(year + '-01-01'),
          lt: new Date((year + 1) + '-01-01'),
        }
      }
    });
    console.log('Rok ' + year + ': ' + yearCount + ' zlecen');
  }

  // 4. Zarchiwizowane vs aktywne
  const archived = await prisma.order.count({ where: { archivedAt: { not: null } } });
  const active = await prisma.order.count({ where: { archivedAt: null } });
  console.log('\n--- STATUS ARCHIWIZACJI ---');
  console.log('Aktywne:        ' + active);
  console.log('Zarchiwizowane: ' + archived);

  // 5. Rozmiar bazy w MB
  try {
    const dbInfo = await prisma.$queryRaw<{page_count: bigint, page_size: bigint}[]>`
      SELECT (SELECT page_count FROM pragma_page_count()) as page_count,
             (SELECT page_size FROM pragma_page_size()) as page_size
    `;
    if (dbInfo && dbInfo[0]) {
      const sizeBytes = Number(dbInfo[0].page_count) * Number(dbInfo[0].page_size);
      const sizeMB = sizeBytes / (1024 * 1024);
      console.log('\n--- ROZMIAR BAZY ---');
      console.log('Rozmiar: ' + sizeMB.toFixed(2) + ' MB');
    }
  } catch (e) {
    console.log('\n--- ROZMIAR BAZY ---');
    console.log('Nie udalo sie odczytac rozmiaru');
  }

  // 6. Sprawdzenie indeksów w schemacie
  console.log('\n--- ISTNIEJACE INDEKSY (z schema.prisma) ---');
  console.log('Order: status, archivedAt, createdAt, glassOrderStatus, deliveryDate, productionDate, completedAt');
  console.log('Delivery: status, deliveryDate, deletedAt');
  console.log('FileImport: status, createdAt, deletedAt');
  console.log('WarehouseStock: profileId+colorId (unique), deletedAt');
  console.log('WarehouseHistory: colorId, profileId, recordedAt, changeType');

  // 7. Prognoza problemów
  console.log('\n=== PROGNOZA WYDAJNOSCI ===\n');

  const ordersPerYear = 3000; // założenie z CLAUDE.md

  console.log('SQLite limity praktyczne (dla tej aplikacji):');
  console.log('- Komfortowo: do 50k zlecen (~800k child records)');
  console.log('- Mozliwe z wolniejszymi JOINami: do 200k zlecen');
  console.log('- Problematyczne: >500k zlecen');
  console.log('');

  const yearsUntil50k = Math.floor((50000 - counts['Order']) / ordersPerYear);
  const yearsUntil200k = Math.floor((200000 - counts['Order']) / ordersPerYear);

  console.log('Przy ' + ordersPerYear + ' zlecen/rok:');
  console.log('- Aktualnie: ' + counts['Order'] + ' zlecen');
  console.log('- Do 50k zlecen (komfort): ~' + yearsUntil50k + ' lat');
  console.log('- Do 200k zlecen (ostrzezenie): ~' + yearsUntil200k + ' lat');

  // 8. Potencjalne wąskie gardła
  console.log('\n=== POTENCJALNE WASKIE GARDLA ===\n');

  const childRecordsRatio = (counts['OrderWindow'] + counts['OrderGlass'] + counts['OrderMaterial'] + counts['OrderRequirement']) / orderCount;
  console.log('Srednia child records na zlecenie: ' + childRecordsRatio.toFixed(1));

  if (childRecordsRatio > 100) {
    console.log('UWAGA: Bardzo duzo child records - JOINy moga byc wolne');
  } else if (childRecordsRatio > 50) {
    console.log('INFO: Umiarkowana ilosc child records - monitoruj wydajnosc');
  } else {
    console.log('OK: Niska ilosc child records - JOINy powinny byc szybkie');
  }

  // Sprawdź największe zlecenie
  const biggestOrder = await prisma.order.findFirst({
    include: {
      _count: {
        select: {
          windows: true,
          glasses: true,
          materials: true,
          requirements: true,
        }
      }
    },
    orderBy: {
      windows: {
        _count: 'desc'
      }
    }
  });

  if (biggestOrder) {
    const biggestTotal = biggestOrder._count.windows + biggestOrder._count.glasses +
                         biggestOrder._count.materials + biggestOrder._count.requirements;
    console.log('\nNajwieksze zlecenie (po liczbie okien):');
    console.log('- Numer: ' + biggestOrder.orderNumber);
    console.log('- Okien: ' + biggestOrder._count.windows);
    console.log('- Szyb: ' + biggestOrder._count.glasses);
    console.log('- Materialow: ' + biggestOrder._count.materials);
    console.log('- Requirements: ' + biggestOrder._count.requirements);
    console.log('- Razem child records: ' + biggestTotal);
  }

  // 9. Zalecenia
  console.log('\n=== ZALECENIA ===\n');

  if (counts['Order'] > 20000) {
    console.log('[CRITICAL] >20k zlecen - ROZWAŻ:');
    console.log('  - Archiwizacje zlecen starszych niz 2 lata');
    console.log('  - Przeniesienie archiwalnych do oddzielnej bazy');
    console.log('  - Optymalizacje zapytan (tylko potrzebne pola)');
  } else if (counts['Order'] > 10000) {
    console.log('[WARNING] >10k zlecen - ZACZNIJ:');
    console.log('  - Monitorowac czas odpowiedzi dashboardu');
    console.log('  - Planowac strategie archiwizacji');
  } else if (counts['Order'] > 5000) {
    console.log('[INFO] 5-10k zlecen - DOBRZE:');
    console.log('  - Baza dziala komfortowo');
    console.log('  - Mozesz zaczac myslec o archiwizacji');
  } else {
    console.log('[OK] <5k zlecen - SWIETNIE:');
    console.log('  - Baza ma duzy zapas wydajnosci');
    console.log('  - Brak potrzeby optymalizacji');
  }

  // Podsumowanie ryzyk
  console.log('\n=== PODSUMOWANIE RYZYK ===\n');

  const totalChildRecords = counts['OrderWindow'] + counts['OrderGlass'] +
                            counts['OrderMaterial'] + counts['OrderRequirement'];

  console.log('Glowne metryki:');
  console.log('- Zlecen: ' + counts['Order']);
  console.log('- Child records: ' + totalChildRecords);
  console.log('- Proporcja: 1:' + childRecordsRatio.toFixed(1));
  console.log('');

  if (totalChildRecords > 500000) {
    console.log('RYZYKO: >500k child records - zapytania ze zlozonym WHERE moga byc wolne');
  } else if (totalChildRecords > 100000) {
    console.log('INFO: 100-500k child records - normalny zakres dla SQLite');
  } else {
    console.log('OK: <100k child records - brak ryzyk wydajnosciowych');
  }

  await prisma.$disconnect();
}

analyzeDatabase().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
