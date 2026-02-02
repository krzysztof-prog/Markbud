/**
 * Skrypt do usuwania duplikatów z tabeli aluminum_glasses
 *
 * Duplikat = ten sam customerOrderNumber + orderNumber + widthMm + heightMm + quantity + glassComposition
 * Zostawiamy NAJNOWSZY rekord (największe id), usuwamy starsze
 *
 * Uruchom: node scripts/cleanup-aluminum-glass-duplicates.cjs
 * Z usuwaniem: node scripts/cleanup-aluminum-glass-duplicates.cjs --confirm
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('CZYSZCZENIE DUPLIKATÓW ALUMINUM_GLASSES');
  console.log('========================================\n');

  // 1. Pobierz wszystkie rekordy
  const allGlasses = await prisma.aluminumGlass.findMany({
    orderBy: { id: 'desc' }, // Najnowsze pierwsze
  });

  console.log(`Łącznie rekordów w bazie: ${allGlasses.length}\n`);

  // 2. Znajdź duplikaty
  // Klucz: customerOrderNumber|orderNumber|widthMm|heightMm|quantity|glassComposition
  const seen = new Map();
  const duplicateIds = [];

  for (const glass of allGlasses) {
    // Normalizuj glassComposition (null -> pusty string dla porównania)
    const composition = glass.glassComposition || '';
    const key = `${glass.customerOrderNumber}|${glass.orderNumber}|${glass.widthMm}|${glass.heightMm}|${glass.quantity}|${composition}`;

    if (seen.has(key)) {
      // To jest duplikat (starszy rekord, bo sortujemy desc po id)
      duplicateIds.push(glass.id);

      // Pokaż co usuwamy (dla debug) - tylko pierwsze 20
      if (duplicateIds.length <= 20) {
        const kept = seen.get(key);
        console.log(`DUPLIKAT: ${glass.customerOrderNumber} | ${glass.widthMm}x${glass.heightMm} | ${glass.quantity} szt.`);
        console.log(`  → Usuwam id=${glass.id} (dostawa ${glass.glassDeliveryId}), zostawiam id=${kept.id}`);
      }
    } else {
      // Pierwszy raz widzimy ten klucz - zostawiamy (najnowszy)
      seen.set(key, glass);
    }
  }

  if (duplicateIds.length > 20) {
    console.log(`... i ${duplicateIds.length - 20} więcej duplikatów`);
  }

  console.log('\n========================================');
  console.log(`Unikalnych rekordów: ${seen.size}`);
  console.log(`Duplikatów do usunięcia: ${duplicateIds.length}`);
  console.log('========================================\n');

  if (duplicateIds.length === 0) {
    console.log('Brak duplikatów - nic do usunięcia.');
    return;
  }

  // 3. Pokaż podsumowanie przed usunięciem
  console.log('Duplikaty pogrupowane po customerOrderNumber:');
  const byCustomer = {};
  for (const glass of allGlasses) {
    if (duplicateIds.includes(glass.id)) {
      const name = glass.customerOrderNumber;
      byCustomer[name] = (byCustomer[name] || 0) + 1;
    }
  }
  // Sortuj po ilości duplikatów (malejąco)
  const sortedCustomers = Object.entries(byCustomer).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sortedCustomers.slice(0, 20)) {
    console.log(`  ${name}: ${count} duplikatów`);
  }
  if (sortedCustomers.length > 20) {
    console.log(`  ... i ${sortedCustomers.length - 20} więcej zamówień`);
  }

  // Pokaż ile quantity zostanie usuniętych
  let removedQuantity = 0;
  for (const glass of allGlasses) {
    if (duplicateIds.includes(glass.id)) {
      removedQuantity += glass.quantity;
    }
  }
  console.log(`\nSuma quantity do usunięcia: ${removedQuantity} szt.`);

  // 4. Pytanie o potwierdzenie (uruchom z --confirm aby pominąć)
  const autoConfirm = process.argv.includes('--confirm');

  if (!autoConfirm) {
    console.log('\n⚠️  UWAGA: Uruchom z flagą --confirm aby faktycznie usunąć duplikaty');
    console.log('   Przykład: node scripts/cleanup-aluminum-glass-duplicates.cjs --confirm\n');
    console.log('Podgląd - nic nie zostało usunięte.');
    return;
  }

  // 5. Usuń duplikaty
  console.log('\nUsuwanie duplikatów...');

  const result = await prisma.aluminumGlass.deleteMany({
    where: {
      id: { in: duplicateIds }
    }
  });

  console.log(`✅ Usunięto ${result.count} duplikatów`);

  // 6. Pokaż statystyki po czyszczeniu
  const afterCount = await prisma.aluminumGlass.count();
  console.log(`\nPo czyszczeniu: ${afterCount} rekordów w bazie`);
}

main()
  .then(() => {
    console.log('\nGotowe!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Błąd:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
