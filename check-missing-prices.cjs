const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// 0. Sprawdź kolumny pending_order_prices
const popCols = db.prepare("PRAGMA table_info(pending_order_prices)").all().map(c => c.name);
console.log('Kolumny pending_order_prices:', popCols.join(', '));

// 1. Zlecenia BEZ ceny (niezależnie od delivery_date)
console.log('\n=== WSZYSTKIE ZLECENIA BEZ CENY ===');
const noPriceOrders = db.prepare(`
  SELECT id, order_number, status, value_pln, value_eur, delivery_date, pvc_delivery_date
  FROM orders
  WHERE (value_pln IS NULL OR value_pln = 0)
    AND (value_eur IS NULL OR value_eur = 0)
  ORDER BY order_number
`).all();
console.log('Liczba zleceń bez ceny:', noPriceOrders.length);
noPriceOrders.forEach(o => {
  const del = o.delivery_date ? o.delivery_date.substring(0, 10) : '-';
  const pvcDel = o.pvc_delivery_date ? o.pvc_delivery_date.substring(0, 10) : '-';
  console.log(`  ${o.order_number} | id=${o.id} | status=${o.status} | delivery=${del} | pvc_delivery=${pvcDel} | pln=${o.value_pln} | eur=${o.value_eur}`);
});

// 2. Zlecenia Z ceną - statystyki
console.log('\n=== STATYSTYKI CEN ===');
const total = db.prepare("SELECT COUNT(*) as cnt FROM orders").get();
const withPricePln = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE value_pln IS NOT NULL AND value_pln > 0").get();
const withPriceEur = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE value_eur IS NOT NULL AND value_eur > 0").get();
const withAnyPrice = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE (value_pln IS NOT NULL AND value_pln > 0) OR (value_eur IS NOT NULL AND value_eur > 0)").get();
console.log(`  Wszystkie zlecenia: ${total.cnt}`);
console.log(`  Z ceną PLN: ${withPricePln.cnt}`);
console.log(`  Z ceną EUR: ${withPriceEur.cnt}`);
console.log(`  Z jakąkolwiek ceną: ${withAnyPrice.cnt}`);
console.log(`  BEZ ceny: ${noPriceOrders.length}`);

// 3. Pending order prices - statystyki
console.log('\n=== PENDING ORDER PRICES - STATYSTYKI ===');
const popStats = db.prepare(`
  SELECT status, COUNT(*) as cnt, COUNT(DISTINCT order_number) as uniq
  FROM pending_order_prices
  GROUP BY status
`).all();
popStats.forEach(s => console.log(`  ${s.status}: ${s.cnt} rek., ${s.uniq} unik. zleceń`));

const unknownCnt = db.prepare("SELECT COUNT(*) as cnt FROM pending_order_prices WHERE order_number = 'UNKNOWN'").get();
console.log(`  w tym UNKNOWN: ${unknownCnt.cnt}`);

// 4. Pending prices dla zleceń BEZ ceny
console.log('\n=== PENDING PRICES DLA ZLECEŃ BEZ CENY ===');
const orderNums = noPriceOrders.map(o => o.order_number);
if (orderNums.length > 0) {
  const placeholders = orderNums.map(() => '?').join(',');
  const popForMissing = db.prepare(`
    SELECT order_number, status, currency, value_netto, created_at
    FROM pending_order_prices
    WHERE order_number IN (${placeholders})
    ORDER BY order_number
  `).all(...orderNums);

  console.log('Znaleziono pending prices:', popForMissing.length);
  popForMissing.forEach(p => {
    const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
    console.log(`  ${p.order_number} | status=${p.status} | ${p.currency} ${val} | created=${p.created_at ? p.created_at.substring(0, 19) : '-'}`);
  });

  // Które mają pending, które nie
  const hasPending = new Set(popForMissing.map(p => p.order_number));
  const withoutAnyPending = orderNums.filter(n => !hasPending.has(n));
  console.log(`\n  Bez pending price (PDF NIGDY nie importowany): ${withoutAnyPending.length}`);
  withoutAnyPending.forEach(n => console.log('    ' + n));

  const withPendingList = orderNums.filter(n => hasPending.has(n));
  console.log(`  Z pending price (PDF był, ale cena nie przypisana): ${withPendingList.length}`);
  withPendingList.forEach(n => console.log('    ' + n));
}

// 5. Sprawdź wszystkie pending ze statusem 'pending' (niezaplikowane)
console.log('\n=== NIEZAPLIKOWANE PENDING PRICES ===');
const pendingActive = db.prepare(`
  SELECT pop.order_number, pop.status, pop.currency, pop.value_netto, pop.created_at,
         o.id as oid, o.value_pln, o.value_eur
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending' AND pop.order_number != 'UNKNOWN'
  ORDER BY pop.order_number
`).all();
console.log('Niezaplikowanych (excl. UNKNOWN):', pendingActive.length);
pendingActive.forEach(p => {
  const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
  const orderExists = p.oid ? `YES(id=${p.oid}, pln=${p.value_pln}, eur=${p.value_eur})` : 'NIE ISTNIEJE';
  console.log(`  ${p.order_number} | ${p.currency} ${val} | order=${orderExists}`);
});

// 6. Sprawdź pliki w folderze ceny
console.log('\n=== PLIKI W FOLDERZE CENY ===');
const fs = require('fs');
const path = require('path');
const cenyDir = 'C:/DEV_DATA/ceny';
try {
  if (fs.existsSync(cenyDir)) {
    const files = fs.readdirSync(cenyDir);
    console.log(`Pliki w ${cenyDir}: ${files.length}`);
    files.slice(0, 20).forEach(f => console.log('  ' + f));
    if (files.length > 20) console.log(`  ... i ${files.length - 20} więcej`);
  } else {
    console.log(`Folder ${cenyDir} NIE ISTNIEJE`);
    // Sprawdź alternatywne lokalizacje
    const altDirs = [
      'C:/Users/Krzysztof/Desktop/AKROBUD/ceny',
      '//192.168.1.6/Public/Markbud_import/ceny'
    ];
    altDirs.forEach(d => {
      try {
        if (fs.existsSync(d)) {
          const f = fs.readdirSync(d);
          console.log(`Folder ${d}: ${f.length} plików`);
          f.slice(0, 10).forEach(ff => console.log('  ' + ff));
        }
      } catch(e) { console.log(`Folder ${d}: ${e.message}`); }
    });
  }
} catch(e) { console.log('Błąd:', e.message); }

// 7. Sprawdź .env dla WATCH_FOLDER_CENY
try {
  const envContent = fs.readFileSync('./apps/api/.env', 'utf8');
  const cenyMatch = envContent.match(/WATCH_FOLDER_CENY=(.+)/);
  console.log('\nWATCH_FOLDER_CENY w .env:', cenyMatch ? cenyMatch[1] : 'NIE USTAWIONY');
} catch(e) { console.log('.env error:', e.message); }

db.close();
