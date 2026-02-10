const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db', { readonly: true });

console.log('=== PENDING prices where ORDER EXISTS but price NOT applied ===');
const unmatched = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename, pop.status,
         o.id as order_id, o.value_pln, o.value_eur
  FROM pending_order_prices pop
  JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending'
  ORDER BY pop.id DESC
`).all();

console.log('Count:', unmatched.length);
unmatched.forEach(r => {
  console.log(`  ${r.order_number}: pending ${r.currency} ${r.value_netto} (${r.filename}) | order id=${r.order_id} pln=${r.value_pln} eur=${r.value_eur}`);
});

console.log('\n=== ALL PENDING prices - check existence ===');
const allPending = db.prepare(`
  SELECT pop.order_number, pop.currency, pop.value_netto, pop.filename
  FROM pending_order_prices pop
  WHERE pop.status = 'pending'
  ORDER BY pop.id DESC
`).all();

allPending.forEach(r => {
  const order = db.prepare('SELECT id, value_pln, value_eur FROM orders WHERE order_number = ?').get(r.order_number);
  const status = order ? `ORDER EXISTS (id=${order.id}, pln=${order.value_pln}, eur=${order.value_eur})` : 'NO ORDER';
  console.log(`  ${r.order_number}: ${r.currency} ${r.value_netto} (${r.filename}) -> ${status}`);
});

console.log('\n=== APPLIED pending prices ===');
const applied = db.prepare(`
  SELECT order_number, currency, value_netto, filename, applied_to_order_id
  FROM pending_order_prices
  WHERE status = 'applied'
  ORDER BY id DESC LIMIT 10
`).all();
console.log(JSON.stringify(applied, null, 2));

console.log('\n=== FILE IMPORTS type=ceny_pdf with status ===');
const cenyImports = db.prepare(`
  SELECT status, COUNT(*) as cnt FROM file_imports WHERE file_type = 'ceny_pdf' GROUP BY status
`).all();
console.log(JSON.stringify(cenyImports, null, 2));

db.close();