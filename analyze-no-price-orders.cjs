const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// 1. Rozkład zleceń bez ceny po document_author
const byAuthor = db.prepare(`
  SELECT o.document_author, COUNT(*) as cnt
  FROM orders o
  WHERE (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
    AND o.archived_at IS NULL
  GROUP BY o.document_author
  ORDER BY cnt DESC
  LIMIT 20
`).all();
console.log('=== ZLECENIA BEZ CENY WG DOCUMENT_AUTHOR ===');
byAuthor.forEach(r => console.log(`  ${r.document_author || 'NULL'}: ${r.cnt}`));

// 2. Rozkład po dacie utworzenia (miesiąc)
const byMonth = db.prepare(`
  SELECT substr(o.created_at, 1, 7) as month, COUNT(*) as cnt
  FROM orders o
  WHERE (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
    AND o.archived_at IS NULL
  GROUP BY month
  ORDER BY month DESC
`).all();
console.log('\n=== ZLECENIA BEZ CENY WG MIESIACA ===');
byMonth.forEach(r => console.log(`  ${r.month}: ${r.cnt}`));

// 3. Ile zleceń z ceną vs bez ceny w poszczególnych miesiącach
const recentWithPrice = db.prepare(`
  SELECT substr(o.created_at, 1, 7) as month,
    SUM(CASE WHEN (o.value_pln > 0 OR o.value_eur > 0) THEN 1 ELSE 0 END) as with_price,
    SUM(CASE WHEN (o.value_pln IS NULL OR o.value_pln = 0) AND (o.value_eur IS NULL OR o.value_eur = 0) THEN 1 ELSE 0 END) as without_price
  FROM orders o
  WHERE o.archived_at IS NULL
  GROUP BY month
  ORDER BY month DESC
`).all();
console.log('\n=== Z CENA vs BEZ CENY WG MIESIACA ===');
recentWithPrice.forEach(r => console.log(`  ${r.month}: z_cena=${r.with_price} bez_ceny=${r.without_price}`));

// 4. Jakie numery zleceń nie mają ceny (sample)
const sampleNoPrice = db.prepare(`
  SELECT o.order_number, o.project, substr(o.created_at, 1, 10) as created, o.document_author, o.client
  FROM orders o
  WHERE (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
    AND o.archived_at IS NULL
  ORDER BY o.order_number DESC
  LIMIT 30
`).all();
console.log('\n=== OSTATNIE 30 ZLECEN BEZ CENY ===');
sampleNoPrice.forEach(r => console.log(`  ${r.order_number} | ${r.document_author || '-'} | ${r.project || '-'} | ${r.client || '-'} | ${r.created}`));

// 5. Sprawdź ZAM 53810 i ZAM 53839 - czemu parser nie dopasował
const zam53810 = db.prepare("SELECT * FROM orders WHERE order_number = '53810'").get();
const zam53839 = db.prepare("SELECT * FROM orders WHERE order_number = '53839'").get();
console.log('\n=== SPECJALNE: ZAM pliki ===');
console.log(`Order 53810 istnieje: ${zam53810 ? 'TAK (id=' + zam53810.id + ')' : 'NIE'}`);
console.log(`Order 53839 istnieje: ${zam53839 ? 'TAK (id=' + zam53839.id + ')' : 'NIE'}`);

// Sprawdź pending prices dla tych
const pending53810 = db.prepare("SELECT * FROM pending_order_prices WHERE filename LIKE '%53810%'").all();
const pending53839 = db.prepare("SELECT * FROM pending_order_prices WHERE filename LIKE '%53839%'").all();
console.log(`Pending for 53810: ${pending53810.length}`);
pending53810.forEach(p => console.log(`  #${p.id}: order=${p.order_number} value=${p.value_netto} status=${p.status}`));
console.log(`Pending for 53839: ${pending53839.length}`);
pending53839.forEach(p => console.log(`  #${p.id}: order=${p.order_number} value=${p.value_netto} status=${p.status}`));

// 6. Ile UNKNOWN pending prices jest jeszcze?
const unknownPending = db.prepare(`
  SELECT COUNT(*) as cnt FROM pending_order_prices
  WHERE order_number = 'UNKNOWN' AND status = 'pending'
`).get();
const unknownWithValue = db.prepare(`
  SELECT COUNT(*) as cnt FROM pending_order_prices
  WHERE order_number = 'UNKNOWN' AND status = 'pending' AND value_netto > 0
`).get();
console.log(`\n=== UNKNOWN PENDING ===`);
console.log(`UNKNOWN pending total: ${unknownPending.cnt}`);
console.log(`UNKNOWN pending z ceną > 0: ${unknownWithValue.cnt}`);

// Listuj UNKNOWN z ceną
const unknownList = db.prepare(`
  SELECT id, filename, currency, value_netto
  FROM pending_order_prices
  WHERE order_number = 'UNKNOWN' AND status = 'pending' AND value_netto > 0
  ORDER BY filename
`).all();
unknownList.forEach(p => {
  const val = (p.value_netto / 100).toFixed(2);
  console.log(`  #${p.id}: "${p.filename}" | ${p.currency} ${val}`);
});

// 7. Ile pending ma status 'pending' z order_number != UNKNOWN i nie ma dopasowania?
const pendingNoMatch = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending'
    AND pop.order_number != 'UNKNOWN'
    AND o.id IS NULL
  ORDER BY pop.order_number
`).all();
console.log(`\n=== PENDING BEZ DOPASOWANIA (nie-UNKNOWN) ===`);
console.log(`Ilość: ${pendingNoMatch.length}`);
pendingNoMatch.forEach(p => {
  const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
  console.log(`  #${p.id}: order="${p.order_number}" | ${p.currency} ${val} | "${p.filename}"`);
});

db.close();
