const Database = require('./apps/api/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// 1. Pending prices dla zleceń bez ceny - PEŁNA LISTA
console.log('=== PENDING PRICES DLA ZLECEŃ BEZ CENY ===');
const noPriceNums = db.prepare(`
  SELECT order_number FROM orders
  WHERE (value_pln IS NULL OR value_pln = 0) AND (value_eur IS NULL OR value_eur = 0)
`).all().map(o => o.order_number);

const placeholders = noPriceNums.map(() => '?').join(',');
const popForMissing = db.prepare(`
  SELECT order_number, status, currency, value_netto
  FROM pending_order_prices
  WHERE order_number IN (${placeholders})
  ORDER BY order_number
`).all(...noPriceNums);

console.log('Pending prices znalezione:', popForMissing.length);
popForMissing.forEach(p => {
  const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
  console.log(`  ${p.order_number} | status=${p.status} | ${p.currency} ${val}`);
});

// Które zlecenia BEZ ceny MAJĄ pending price
const hasPending = new Set(popForMissing.map(p => p.order_number));
const withoutPending = noPriceNums.filter(n => !hasPending.has(n));
console.log(`\nBEZ pending price (PDF NIGDY nie trafił do systemu): ${withoutPending.length} z ${noPriceNums.length}`);

// 2. Niezaplikowane pending prices z istniejącymi zleceniami
console.log('\n=== NIEZAPLIKOWANE PENDING Z ISTNIEJĄCYMI ZLECENIAMI ===');
const matchable = db.prepare(`
  SELECT pop.order_number, pop.currency, pop.value_netto, pop.filename,
         o.id as oid, o.value_pln, o.value_eur
  FROM pending_order_prices pop
  JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending' AND pop.order_number != 'UNKNOWN'
`).all();
console.log('Mogłyby być przypisane:', matchable.length);
matchable.forEach(m => {
  const val = m.value_netto ? (m.value_netto / 100).toFixed(2) : '0';
  const hasPrice = (m.value_pln && m.value_pln > 0) || (m.value_eur && m.value_eur > 0);
  console.log(`  ${m.order_number} | ${m.currency} ${val} | hasPrice=${hasPrice} | file=${m.filename || '-'}`);
});

// 3. UNKNOWN pending prices - jakie pliki?
console.log('\n=== UNKNOWN PENDING PRICES - PLIKI ===');
const unknowns = db.prepare(`
  SELECT order_number, currency, value_netto, filename, filepath
  FROM pending_order_prices
  WHERE order_number = 'UNKNOWN'
  ORDER BY filename
`).all();
console.log('UNKNOWN records:', unknowns.length);
unknowns.forEach(u => {
  const val = u.value_netto ? (u.value_netto / 100).toFixed(2) : '0';
  console.log(`  ${u.currency} ${val} | file=${u.filename || '-'} | path=${u.filepath || '-'}`);
});

// 4. Wszystkie applied pending prices - jakie pliki
console.log('\n=== APPLIED PENDING PRICES - PLIKI ===');
const applied = db.prepare(`
  SELECT order_number, currency, value_netto, filename
  FROM pending_order_prices
  WHERE status = 'applied'
  ORDER BY order_number
`).all();
console.log('Applied:', applied.length);
applied.forEach(a => {
  const val = a.value_netto ? (a.value_netto / 100).toFixed(2) : '0';
  console.log(`  ${a.order_number} | ${a.currency} ${val} | file=${a.filename || '-'}`);
});

// 5. Sprawdź .env
console.log('\n=== KONFIGURACJA ===');
try {
  const env = fs.readFileSync('./apps/api/.env', 'utf8');
  const lines = env.split('\n').filter(l => l.includes('CENY') || l.includes('WATCH'));
  lines.forEach(l => console.log('  ' + l.trim()));
} catch(e) { console.log('.env error:', e.message); }

// 6. Sprawdź folder ceny
console.log('\n=== PLIKI PDF W FOLDERACH ===');
const dirsToCheck = [
  'C:/DEV_DATA/ceny',
  'C:/Users/Krzysztof/Desktop/AKROBUD/ceny',
  'C:/Users/Krzysztof/Desktop/AKROBUD/impl/przykładowe pliki/ceny'
];
dirsToCheck.forEach(d => {
  try {
    if (fs.existsSync(d)) {
      const files = fs.readdirSync(d);
      console.log(`\n${d}: ${files.length} plików`);
      files.forEach(f => console.log('  ' + f));
    } else {
      console.log(`\n${d}: NIE ISTNIEJE`);
    }
  } catch(e) { console.log(`\n${d}: ${e.message}`); }
});

// 7. Zlecenia Z ceną - jakie pliki użyto
console.log('\n=== ZLECENIA Z CENĄ - ŹRÓDŁO ===');
const withPrice = db.prepare(`
  SELECT o.order_number, o.value_pln, o.value_eur,
         pop.filename, pop.status as pop_status
  FROM orders o
  LEFT JOIN pending_order_prices pop ON pop.order_number = o.order_number AND pop.status = 'applied'
  WHERE (o.value_pln IS NOT NULL AND o.value_pln > 0)
     OR (o.value_eur IS NOT NULL AND o.value_eur > 0)
  ORDER BY o.order_number
`).all();
console.log('Zleceń z ceną:', withPrice.length);
withPrice.forEach(w => {
  const pln = w.value_pln ? (w.value_pln / 100).toFixed(2) + ' PLN' : '';
  const eur = w.value_eur ? (w.value_eur / 100).toFixed(2) + ' EUR' : '';
  console.log(`  ${w.order_number} | ${pln}${eur} | file=${w.filename || 'BRAK PENDING (import bezpośredni?)'}`);
});

db.close();
