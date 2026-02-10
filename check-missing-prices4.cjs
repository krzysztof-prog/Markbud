const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// 1. Check order 53656 details
console.log('=== ORDER 53656 ===');
const cols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
const order = db.prepare("SELECT * FROM orders WHERE order_number = '53656'").get();
if (order) {
  console.log('id:', order.id);
  console.log('order_number:', order.order_number);
  console.log('status:', order.status);
  console.log('value_pln:', order.value_pln);
  console.log('value_eur:', order.value_eur);
  console.log('delivery_date:', order.delivery_date);
  console.log('pvc_delivery_date:', order.pvc_delivery_date);
  // Show all non-null fields
  const nonNull = Object.entries(order).filter(([k, v]) => v !== null && v !== '' && v !== 0);
  console.log('\nNon-null fields:');
  nonNull.forEach(([k, v]) => {
    const val = typeof v === 'string' && v.length > 80 ? v.substring(0, 80) + '...' : v;
    console.log('  ' + k + ':', val);
  });
} else {
  console.log('NOT FOUND');
}

// 2. Check pending for GRAAF file
console.log('\n=== PENDING FOR GRAAF FILE ===');
const graaf = db.prepare("SELECT * FROM pending_order_prices WHERE filename LIKE '%GRAAF%'").all();
console.log('GRAAF pending prices:', graaf.length);
graaf.forEach(g => {
  const val = g.value_netto ? (g.value_netto / 100).toFixed(2) : '0';
  console.log('  order_number:', g.order_number, '| status:', g.status, '| currency:', g.currency, '| value:', val, '| filename:', g.filename);
});

// 3. Check pending for order 53656
console.log('\n=== PENDING FOR ORDER 53656 ===');
const p53656 = db.prepare("SELECT * FROM pending_order_prices WHERE order_number = '53656'").all();
console.log('Pending for 53656:', p53656.length);
p53656.forEach(p => {
  const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
  console.log('  status:', p.status, '| currency:', p.currency, '| value:', val, '| filename:', p.filename);
});

// 4. Check file_imports for GRAAF
console.log('\n=== FILE IMPORTS FOR GRAAF ===');
try {
  const graafImports = db.prepare("SELECT * FROM file_imports WHERE filename LIKE '%GRAAF%'").all();
  console.log('GRAAF file imports:', graafImports.length);
  graafImports.forEach(i => {
    console.log('  id:', i.id, '| filename:', i.filename, '| status:', i.status, '| type:', i.import_type);
  });
} catch(e) { console.log('Error:', e.message); }

// 5. Orders that HAVE delivery_date AND price
console.log('\n=== ORDERS WITH DELIVERY DATE AND PRICE (SAMPLE) ===');
const withBoth = db.prepare(`
  SELECT order_number, value_pln, value_eur, delivery_date
  FROM orders
  WHERE delivery_date IS NOT NULL
    AND ((value_pln IS NOT NULL AND value_pln > 0) OR (value_eur IS NOT NULL AND value_eur > 0))
  ORDER BY order_number
  LIMIT 20
`).all();
console.log('Orders with both delivery_date and price:', withBoth.length, '(first 20)');
withBoth.forEach(o => {
  const pln = o.value_pln ? (o.value_pln / 100).toFixed(2) + ' PLN' : '';
  const eur = o.value_eur ? (o.value_eur / 100).toFixed(2) + ' EUR' : '';
  const del = o.delivery_date ? new Date(o.delivery_date).toISOString().substring(0, 10) : '-';
  console.log('  ' + o.order_number + ' | ' + (pln || eur) + ' | del=' + del);
});

// Total with delivery + price
const totalWithBoth = db.prepare(`
  SELECT COUNT(*) as cnt FROM orders
  WHERE delivery_date IS NOT NULL
    AND ((value_pln IS NOT NULL AND value_pln > 0) OR (value_eur IS NOT NULL AND value_eur > 0))
`).get();
console.log('TOTAL orders with delivery_date AND price:', totalWithBoth.cnt);

// Total with delivery but no price
const totalWithDelNoPrice = db.prepare(`
  SELECT COUNT(*) as cnt FROM orders
  WHERE delivery_date IS NOT NULL
    AND (value_pln IS NULL OR value_pln = 0)
    AND (value_eur IS NULL OR value_eur = 0)
`).get();
console.log('TOTAL orders with delivery_date BUT NO price:', totalWithDelNoPrice.cnt);

// Total with delivery
const totalWithDel = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE delivery_date IS NOT NULL").get();
console.log('TOTAL orders with delivery_date:', totalWithDel.cnt);

// 6. Check pending prices that ARE applied - what orders do they match?
console.log('\n=== APPLIED PENDING PRICES WITH ORDER VALUE CHECK ===');
const applied = db.prepare(`
  SELECT pop.order_number, pop.currency, pop.value_netto, pop.filename, pop.status,
         o.value_pln, o.value_eur, o.delivery_date
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'applied'
  ORDER BY pop.order_number
`).all();
console.log('Applied pending prices:', applied.length);
applied.forEach(a => {
  const pendVal = a.value_netto ? (a.value_netto / 100).toFixed(2) : '0';
  const orderPln = a.value_pln ? (a.value_pln / 100).toFixed(2) : '0';
  const orderEur = a.value_eur ? (a.value_eur / 100).toFixed(2) : '0';
  const del = a.delivery_date ? 'Y' : 'N';
  console.log('  ' + a.order_number + ' | pending=' + a.currency + ' ' + pendVal + ' | order: PLN=' + orderPln + ' EUR=' + orderEur + ' | del=' + del + ' | ' + (a.filename || '-'));
});

// 7. Check all pending with status != applied (unmatched)
console.log('\n=== PENDING (NOT APPLIED) - WITH MATCHING ORDERS ===');
const pendingNotApplied = db.prepare(`
  SELECT pop.order_number, pop.currency, pop.value_netto, pop.filename, pop.status,
         o.id as order_id, o.value_pln, o.value_eur
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status != 'applied' AND pop.order_number != 'UNKNOWN'
  ORDER BY pop.order_number
`).all();
console.log('Pending (not applied, not UNKNOWN):', pendingNotApplied.length);
const withOrder = pendingNotApplied.filter(p => p.order_id);
const withoutOrder = pendingNotApplied.filter(p => !p.order_id);
console.log('  With matching order:', withOrder.length);
withOrder.forEach(p => {
  const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
  console.log('    ' + p.order_number + ' | ' + p.currency + ' ' + val + ' | order PLN=' + (p.value_pln || 0) + ' EUR=' + (p.value_eur || 0) + ' | status=' + p.status + ' | ' + (p.filename || '-'));
});
console.log('  Without matching order:', withoutOrder.length);
withoutOrder.forEach(p => {
  const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
  console.log('    ' + p.order_number + ' | ' + p.currency + ' ' + val + ' | status=' + p.status + ' | ' + (p.filename || '-'));
});

// 8. SPECIFICALLY check if 53656 appears anywhere in pending with different variations
console.log('\n=== SEARCH FOR 53656 VARIATIONS ===');
const search53656 = db.prepare("SELECT order_number, filename, status, currency, value_netto FROM pending_order_prices WHERE order_number LIKE '%53656%' OR filename LIKE '%53656%'").all();
console.log('Found:', search53656.length);
search53656.forEach(s => console.log('  ', JSON.stringify(s)));

// Also search for the other order from the PDF: 251215042
const search251215 = db.prepare("SELECT order_number, filename, status, currency, value_netto FROM pending_order_prices WHERE order_number LIKE '%251215%' OR filename LIKE '%251215%'").all();
console.log('\nSearch 251215042:', search251215.length);
search251215.forEach(s => console.log('  ', JSON.stringify(s)));

db.close();
