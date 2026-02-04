/**
 * Skrypt naprawiający wartości pieniężne w bazie danych
 *
 * Problem: Wartości były zapisywane jako złote/euro zamiast grosze/centy
 * Rozwiązanie: Pomnożyć przez 100 aby przekonwertować na najmniejszą jednostkę
 *
 * Uruchomienie:
 *   node scripts/fix-money-values.cjs --dry-run  (tylko podgląd)
 *   node scripts/fix-money-values.cjs            (wykonanie naprawy)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('='.repeat(60));
  console.log(isDryRun ? '🔍 DRY RUN - tylko podgląd, bez zmian' : '⚠️ WYKONANIE NAPRAWY');
  console.log('='.repeat(60));

  // 1. Naprawa PendingOrderPrice - WSZYSTKIE rekordy
  console.log('\n📋 PendingOrderPrice - rekordy do naprawy:');
  const pendingPrices = await prisma.pendingOrderPrice.findMany({
    where: {
      OR: [
        { valueNetto: { gt: 0 } },
        { valueBrutto: { gt: 0 } }
      ]
    },
    select: { id: true, orderNumber: true, currency: true, valueNetto: true, valueBrutto: true }
  });

  console.log(`Znaleziono ${pendingPrices.length} rekordów do naprawy:`);
  for (const p of pendingPrices) {
    console.log(`  ID ${p.id}: ${p.orderNumber} - ${p.currency} ${p.valueNetto} → ${p.valueNetto * 100} (netto), ${p.valueBrutto} → ${p.valueBrutto ? p.valueBrutto * 100 : null} (brutto)`);
  }

  if (!isDryRun && pendingPrices.length > 0) {
    console.log('\n  Aktualizowanie PendingOrderPrice...');
    for (const p of pendingPrices) {
      await prisma.pendingOrderPrice.update({
        where: { id: p.id },
        data: {
          valueNetto: p.valueNetto * 100,
          valueBrutto: p.valueBrutto ? p.valueBrutto * 100 : null
        }
      });
    }
    console.log(`  ✅ Zaktualizowano ${pendingPrices.length} rekordów PendingOrderPrice`);
  }

  // 2. Naprawa Order.valuePln - tylko wartości < 100000 (prawdopodobnie złote, nie grosze)
  console.log('\n📋 Order.valuePln - rekordy do naprawy (< 100000):');
  const ordersWithWrongPln = await prisma.order.findMany({
    where: {
      valuePln: { not: null, gt: 0, lt: 100000 }
    },
    select: { id: true, orderNumber: true, valuePln: true }
  });

  console.log(`Znaleziono ${ordersWithWrongPln.length} rekordów do naprawy:`);
  for (const o of ordersWithWrongPln) {
    console.log(`  ID ${o.id}: ${o.orderNumber} - PLN ${o.valuePln} → ${o.valuePln * 100} groszy`);
  }

  if (!isDryRun && ordersWithWrongPln.length > 0) {
    console.log('\n  Aktualizowanie Order.valuePln...');
    for (const o of ordersWithWrongPln) {
      await prisma.order.update({
        where: { id: o.id },
        data: { valuePln: o.valuePln * 100 }
      });
    }
    console.log(`  ✅ Zaktualizowano ${ordersWithWrongPln.length} rekordów Order.valuePln`);
  }

  // 3. Sprawdzenie Order.valueEur - te wyglądają OK ale sprawdźmy
  console.log('\n📋 Order.valueEur - weryfikacja (powinny być OK):');
  const ordersWithEur = await prisma.order.findMany({
    where: { valueEur: { not: null, gt: 0 } },
    select: { id: true, orderNumber: true, valueEur: true },
    take: 10
  });

  console.log(`Przykładowe wartości EUR (powinny być w centach):`);
  for (const o of ordersWithEur) {
    const eurValue = o.valueEur / 100;
    console.log(`  ${o.orderNumber}: ${o.valueEur} centy = ${eurValue.toFixed(2)} EUR`);
  }

  console.log('\n' + '='.repeat(60));
  if (isDryRun) {
    console.log('🔍 DRY RUN zakończony. Aby wykonać naprawę, uruchom bez --dry-run');
  } else {
    console.log('✅ NAPRAWA ZAKOŃCZONA');
  }
  console.log('='.repeat(60));
}

main()
  .catch(e => {
    console.error('❌ Błąd:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
