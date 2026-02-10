/**
 * Skrypt re-matchingu dat dostawy szyb
 *
 * Problem: Po usunięciu i ponownym dodaniu zleceń (orders),
 * pole glass_delivery_date jest puste mimo że istnieją powiązane zamówienia szyb.
 *
 * Rozwiązanie: Przepisujemy expected_delivery_date z glass_orders do orders.glass_delivery_date
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

console.log('='.repeat(60));
console.log('Re-matching dat dostawy szyb');
console.log('='.repeat(60));

// Krok 1: Znajdź wszystkie orders z brakującą datą dostawy szyb
const ordersMissingDate = db.prepare(`
  SELECT DISTINCT o.order_number
  FROM orders o
  JOIN glass_order_items goi ON o.order_number = goi.order_number
  WHERE o.glass_delivery_date IS NULL
    AND o.deleted_at IS NULL
`).all();

console.log(`\nZnaleziono ${ordersMissingDate.length} zleceń z brakującą datą dostawy szyb`);

if (ordersMissingDate.length === 0) {
  console.log('Nic do naprawy!');
  process.exit(0);
}

// Krok 2: Dla każdego zlecenia znajdź najnowszą datę dostawy z powiązanych zamówień szyb
const getDeliveryDate = db.prepare(`
  SELECT MAX(go.expected_delivery_date) as delivery_date
  FROM glass_order_items goi
  JOIN glass_orders go ON goi.glass_order_id = go.id
  WHERE goi.order_number = ?
    AND go.deleted_at IS NULL
    AND go.expected_delivery_date IS NOT NULL
`);

const updateOrder = db.prepare(`
  UPDATE orders
  SET glass_delivery_date = ?
  WHERE order_number = ?
`);

// Krok 3: Wykonaj aktualizacje w transakcji
let updated = 0;
let skipped = 0;

const updateAll = db.transaction(() => {
  for (const { order_number } of ordersMissingDate) {
    const result = getDeliveryDate.get(order_number);

    if (result && result.delivery_date) {
      updateOrder.run(result.delivery_date, order_number);
      updated++;

      // Pokaż postęp co 50 rekordów
      if (updated % 50 === 0) {
        console.log(`  Zaktualizowano ${updated}/${ordersMissingDate.length}...`);
      }
    } else {
      skipped++;
    }
  }
});

updateAll();

console.log('\n' + '='.repeat(60));
console.log('WYNIKI:');
console.log('='.repeat(60));
console.log(`✅ Zaktualizowano: ${updated} zleceń`);
console.log(`⏭️  Pominięto (brak daty w zamówieniu szyb): ${skipped} zleceń`);

// Krok 4: Weryfikacja
const stillMissing = db.prepare(`
  SELECT COUNT(DISTINCT o.order_number) as count
  FROM orders o
  JOIN glass_order_items goi ON o.order_number = goi.order_number
  WHERE o.glass_delivery_date IS NULL
    AND o.deleted_at IS NULL
`).get();

console.log(`\nPozostało zleceń bez daty: ${stillMissing.count}`);

// Pokaż przykładowe naprawione zlecenia
const examples = db.prepare(`
  SELECT o.order_number,
         datetime(o.glass_delivery_date/1000, 'unixepoch') as delivery_date,
         o.glass_order_status
  FROM orders o
  WHERE o.order_number IN (?, ?, ?, ?, ?)
`).all(
  ordersMissingDate[0]?.order_number || '',
  ordersMissingDate[1]?.order_number || '',
  ordersMissingDate[2]?.order_number || '',
  ordersMissingDate[3]?.order_number || '',
  ordersMissingDate[4]?.order_number || ''
);

console.log('\nPrzykładowe naprawione zlecenia:');
examples.forEach(e => {
  if (e.order_number) {
    console.log(`  ${e.order_number}: ${e.delivery_date || 'brak daty'} (status: ${e.glass_order_status})`);
  }
});

db.close();
console.log('\n✅ Gotowe!');
