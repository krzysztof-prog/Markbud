const Database = require('./apps/api/node_modules/better-sqlite3');
const fs = require('fs');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// 1. Check _archiwum and _pominiete folders
console.log('=== CENY FOLDER CONTENTS ===');
const dirs = [
  'C:/DEV_DATA/ceny',
  'C:/DEV_DATA/ceny/_archiwum',
  'C:/DEV_DATA/ceny/_pominiete',
];
dirs.forEach(d => {
  try {
    if (fs.existsSync(d)) {
      const files = fs.readdirSync(d);
      console.log(d + ': ' + files.length + ' files');
      files.slice(0, 30).forEach(f => console.log('  ' + f));
      if (files.length > 30) console.log('  ... and ' + (files.length - 30) + ' more');
    } else {
      console.log(d + ': NOT EXISTS');
    }
  } catch(e) { console.log(d + ': ' + e.message); }
});

// 2. UNKNOWN pending prices - filenames
console.log('\n=== UNKNOWN PENDING PRICES - FILENAMES ===');
const unknowns = db.prepare("SELECT filename, filepath, currency, value_netto FROM pending_order_prices WHERE order_number = 'UNKNOWN' ORDER BY filename").all();
console.log('Total UNKNOWN:', unknowns.length);
unknowns.forEach(u => {
  const val = u.value_netto ? (u.value_netto / 100).toFixed(2) : '0';
  console.log('  ' + (u.filename || '-') + ' | ' + u.currency + ' ' + val);
});

// 3. All distinct filenames in pending_order_prices
console.log('\n=== ALL DISTINCT FILENAMES IN PENDING PRICES ===');
const allFiles = db.prepare("SELECT DISTINCT filename, COUNT(*) as cnt FROM pending_order_prices GROUP BY filename ORDER BY filename").all();
console.log('Distinct files:', allFiles.length);
allFiles.forEach(f => console.log('  ' + (f.filename || 'NULL') + ' (' + f.cnt + ')'));

// 4. Orders with delivery_date but no price
console.log('\n=== ORDERS WITH DELIVERY_DATE BUT NO PRICE ===');
const withDelivery = db.prepare(`
  SELECT COUNT(*) as cnt FROM orders
  WHERE delivery_date IS NOT NULL
    AND (value_pln IS NULL OR value_pln = 0)
    AND (value_eur IS NULL OR value_eur = 0)
`).get();
console.log('Orders with delivery_date but no price:', withDelivery.cnt);

const withoutDelivery = db.prepare(`
  SELECT COUNT(*) as cnt FROM orders
  WHERE delivery_date IS NULL
    AND (value_pln IS NULL OR value_pln = 0)
    AND (value_eur IS NULL OR value_eur = 0)
`).get();
console.log('Orders without delivery_date and no price:', withoutDelivery.cnt);

// 5. Order number patterns for orders missing prices
console.log('\n=== FIRST 50 ORDERS WITHOUT PRICE ===');
const noPriceOrders = db.prepare(`
  SELECT order_number, delivery_date, status, client_name
  FROM orders
  WHERE (value_pln IS NULL OR value_pln = 0)
    AND (value_eur IS NULL OR value_eur = 0)
  ORDER BY order_number
  LIMIT 50
`).all();
noPriceOrders.forEach(o => {
  const del = o.delivery_date ? new Date(o.delivery_date).toISOString().substring(0, 10) : '-';
  console.log('  ' + o.order_number + ' | del=' + del + ' | status=' + (o.status || '-') + ' | client=' + (o.client_name || '-'));
});
if (noPriceOrders.length >= 50) console.log('  ... (first 50 only)');

// 6. Check file_imports table for ceny imports
console.log('\n=== FILE_IMPORTS FOR CENY ===');
try {
  const cenyImports = db.prepare(`
    SELECT id, filename, filepath, status, import_type, error_message
    FROM file_imports
    WHERE import_type LIKE '%cen%' OR import_type LIKE '%pdf%' OR filepath LIKE '%ceny%'
    ORDER BY id DESC
    LIMIT 30
  `).all();
  console.log('Ceny file imports:', cenyImports.length);
  cenyImports.forEach(i => {
    console.log('  id=' + i.id + ' | ' + (i.filename || '-') + ' | status=' + (i.status || '-') + ' | type=' + (i.import_type || '-') + ' | err=' + (i.error_message || '-').substring(0, 80));
  });
} catch(e) { console.log('file_imports error:', e.message); }

// 7. Check total stats
console.log('\n=== OVERALL STATS ===');
const totalOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders").get();
const withAnyPrice = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE (value_pln IS NOT NULL AND value_pln > 0) OR (value_eur IS NOT NULL AND value_eur > 0)").get();
const totalPending = db.prepare("SELECT COUNT(*) as cnt FROM pending_order_prices").get();
const pendingByStatus = db.prepare("SELECT status, COUNT(*) as cnt FROM pending_order_prices GROUP BY status").all();
console.log('Total orders:', totalOrders.cnt);
console.log('Orders with price:', withAnyPrice.cnt);
console.log('Orders without price:', totalOrders.cnt - withAnyPrice.cnt);
console.log('Total pending_order_prices:', totalPending.cnt);
pendingByStatus.forEach(s => console.log('  status=' + s.status + ': ' + s.cnt));

// 8. Check if the example PDF files from impl folder match any orders
console.log('\n=== EXAMPLE CENY PDFs FROM impl FOLDER ===');
const exampleDir = 'c:/Users/Krzysztof/Desktop/AKROBUD/impl/przykładowe pliki/ceny';
try {
  if (fs.existsSync(exampleDir)) {
    const files = fs.readdirSync(exampleDir).filter(f => f.endsWith('.pdf'));
    console.log('PDF files in examples:', files.length);
    // Show first 20
    files.slice(0, 20).forEach(f => console.log('  ' + f));
    if (files.length > 20) console.log('  ... and ' + (files.length - 20) + ' more');
  }
} catch(e) { console.log('Error:', e.message); }

// 9. Check which orders 53656 looks like
console.log('\n=== ORDER 53656 DETAILS ===');
const order53656 = db.prepare("SELECT * FROM orders WHERE order_number = '53656'").get();
if (order53656) {
  console.log('id:', order53656.id);
  console.log('order_number:', order53656.order_number);
  console.log('status:', order53656.status);
  console.log('client_name:', order53656.client_name);
  console.log('value_pln:', order53656.value_pln);
  console.log('value_eur:', order53656.value_eur);
  console.log('delivery_date:', order53656.delivery_date);
  console.log('pvc_delivery_date:', order53656.pvc_delivery_date);
} else {
  console.log('Order 53656 NOT FOUND');
}

// Also check pending for it
const pending53656 = db.prepare("SELECT * FROM pending_order_prices WHERE order_number = '53656'").all();
console.log('Pending prices for 53656:', pending53656.length);

db.close();
