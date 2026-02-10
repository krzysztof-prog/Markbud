const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// 47 pending prices z numerami zleceń które nie istnieją
const pendingNoMatch = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending'
    AND pop.order_number != 'UNKNOWN'
    AND o.id IS NULL
  ORDER BY pop.order_number
`).all();

// Sprawdź czy te numery istnieją gdziekolwiek (archived, deleted)
console.log('=== PENDING DLA NIEISTNIEJĄCYCH ZLECEŃ ===');
console.log(`Ilość: ${pendingNoMatch.length}\n`);

let totalValue = 0;
for (const p of pendingNoMatch) {
  const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
  totalValue += p.value_netto || 0;

  // Sprawdź czy zlecenie istnieje z archived_at
  const archived = db.prepare(`SELECT id, order_number, archived_at, deleted_at FROM orders WHERE order_number = ?`).get(p.order_number);
  // Sprawdź prefix
  const prefix = db.prepare(`SELECT id, order_number FROM orders WHERE order_number LIKE ?`).all(p.order_number + '%');
  // Sprawdź czy numer jest podobny do istniejących
  const similar = db.prepare(`SELECT order_number FROM orders WHERE order_number BETWEEN ? AND ? LIMIT 5`).all(
    String(parseInt(p.order_number) - 5),
    String(parseInt(p.order_number) + 5)
  );

  let status = '';
  if (archived) {
    status = archived.archived_at ? `ARCHIVED (${archived.archived_at})` :
             archived.deleted_at ? `DELETED (${archived.deleted_at})` : 'EXISTS?!';
  } else if (prefix.length > 0) {
    status = `PREFIX: ${prefix.map(o => o.order_number).join(', ')}`;
  } else {
    status = 'NIE ISTNIEJE';
    if (similar.length > 0) {
      status += ` (blisko: ${similar.map(o => o.order_number).join(', ')})`;
    }
  }

  console.log(`  #${p.id}: order=${p.order_number} | ${p.currency} ${val} | ${status}`);
  console.log(`    file: ${p.filename}`);
}

console.log(`\nŁączna wartość niedopasowanych: ${(totalValue / 100).toFixed(2)} (grosze/centy)`);

// Pokaż zakres numerów zleceń w systemie
const range = db.prepare(`
  SELECT MIN(CAST(order_number AS INTEGER)) as min_num,
         MAX(CAST(order_number AS INTEGER)) as max_num,
         COUNT(*) as cnt
  FROM orders
  WHERE order_number GLOB '[0-9]*'
    AND LENGTH(order_number) <= 6
`).get();
console.log(`\nZakres numerów zleceń w systemie: ${range.min_num} - ${range.max_num} (${range.cnt} zleceń)`);

// Sprawdź ile z 47 mieści się w zakresie
const inRange = pendingNoMatch.filter(p => {
  const num = parseInt(p.order_number);
  return num >= range.min_num && num <= range.max_num;
}).length;
console.log(`Z 47 niedopasowanych, ${inRange} mieści się w zakresie istniejących numerów`);

// Sprawdź skąd (z jakich plików CSV) importowane są zlecenia
console.log('\n=== OSTATNIE IMPORTY CSV ===');
const csvImports = db.prepare(`
  SELECT id, filename, status, records_count, created_at
  FROM file_imports
  WHERE file_type = 'csv_orders' OR file_type LIKE '%order%'
  ORDER BY created_at DESC
  LIMIT 10
`).all();
csvImports.forEach(i => {
  console.log(`  ${i.filename} | status=${i.status} | records=${i.records_count} | ${i.created_at}`);
});

db.close();
