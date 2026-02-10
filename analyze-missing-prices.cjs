const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// 1. Pending price #16 - dlaczego value_netto = 0?
const allForFile = db.prepare("SELECT * FROM pending_order_prices WHERE filename LIKE '%D3088%'").all();
console.log('=== WSZYSTKIE PENDING DLA D3088 ===');
allForFile.forEach(p => {
  console.log(`  id:${p.id} order:${p.order_number} currency:${p.currency} netto:${p.value_netto} brutto:${p.value_brutto} status:${p.status}`);
});

// 2. Ile pending prices ma value_netto = 0
const zeroValue = db.prepare("SELECT COUNT(*) as cnt FROM pending_order_prices WHERE value_netto = 0 OR value_netto IS NULL").get();
const nonZeroValue = db.prepare("SELECT COUNT(*) as cnt FROM pending_order_prices WHERE value_netto > 0").get();
console.log('\n=== PENDING PRICES - WARTOŚCI ===');
console.log(`Z ceną (value_netto > 0): ${nonZeroValue.cnt}`);
console.log(`Bez ceny (value_netto = 0): ${zeroValue.cnt}`);

// 3. Ile z 316 zleceń bez ceny w ogóle nie ma pending price?
const noPendingAtAll = db.prepare(`
  SELECT COUNT(*) as cnt FROM orders o
  WHERE (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
    AND o.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM pending_order_prices pop
      WHERE pop.order_number = o.order_number
    )
`).get();
console.log(`\nZlecenia bez ceny I bez pending price: ${noPendingAtAll.cnt}`);

// 4. Ile zleceń bez ceny ma pending price z value > 0?
const hasPendingWithValue = db.prepare(`
  SELECT COUNT(DISTINCT o.id) as cnt FROM orders o
  JOIN pending_order_prices pop ON pop.order_number = o.order_number AND pop.value_netto > 0
  WHERE (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
    AND o.archived_at IS NULL
`).get();
console.log(`Zlecenia bez ceny ALE mają pending z value > 0: ${hasPendingWithValue.cnt}`);

// 5. Ile zleceń bez ceny ma pending price z value = 0?
const hasPendingWithZero = db.prepare(`
  SELECT COUNT(DISTINCT o.id) as cnt FROM orders o
  JOIN pending_order_prices pop ON pop.order_number = o.order_number AND (pop.value_netto = 0 OR pop.value_netto IS NULL)
  WHERE (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
    AND o.archived_at IS NULL
`).get();
console.log(`Zlecenia bez ceny z pending z value = 0: ${hasPendingWithZero.cnt}`);

// 6. Przykłady zleceń bez ceny i bez pending
const examples = db.prepare(`
  SELECT o.id, o.order_number, o.project FROM orders o
  WHERE (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
    AND o.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM pending_order_prices pop
      WHERE pop.order_number = o.order_number
    )
  ORDER BY o.order_number DESC
  LIMIT 20
`).all();
console.log(`\nPrzykłady zleceń bez ceny i bez pending (ostatnie 20):`);
examples.forEach(o => {
  console.log(`  ${o.order_number} | project: ${o.project || '-'}`);
});

// 7. Sprawdźmy czy pliki PDF z cenami istnieją na dysku ale nie zostały zaimportowane
// Porównaj zlecenia z tym co jest w folderze ceny
const fs = require('fs');
const path = require('path');
const cenyFolder = 'C:/DEV_DATA/ceny';

let pdfFiles = [];
try {
  if (fs.existsSync(cenyFolder)) {
    pdfFiles = fs.readdirSync(cenyFolder).filter(f => f.toLowerCase().endsWith('.pdf'));
    console.log(`\n=== PLIKI PDF W FOLDERZE CENY ===`);
    console.log(`Ilość plików PDF: ${pdfFiles.length}`);
  } else {
    console.log(`\nFolder ${cenyFolder} nie istnieje`);
  }
} catch (e) {
  console.log(`\nBłąd czytania folderu ceny: ${e.message}`);
}

// 8. Sprawdźmy ile pending prices ma status = applied ale zlecenie ma value = 0
const appliedButZeroPrice = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename, o.value_pln, o.value_eur
  FROM pending_order_prices pop
  JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'applied'
    AND pop.value_netto > 0
    AND (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
`).all();
console.log(`\n=== APPLIED PENDING Z CENĄ > 0 ALE ZLECENIE MA CENĘ = 0 ===`);
console.log(`Ilość: ${appliedButZeroPrice.length}`);
appliedButZeroPrice.forEach(p => {
  const val = (p.value_netto / 100).toFixed(2);
  console.log(`  #${p.id}: ${p.order_number} | ${p.currency} ${val} | ${p.filename}`);
  console.log(`    order: PLN=${p.value_pln || 0} EUR=${p.value_eur || 0}`);
});

// 9. Sprawdź prefix match - zlecenia z suffixem które mogą mieć pending
const suffixOrders = db.prepare(`
  SELECT o.id, o.order_number, o.project, o.value_pln, o.value_eur
  FROM orders o
  WHERE o.order_number LIKE '%-_'
    AND (o.value_pln IS NULL OR o.value_pln = 0)
    AND (o.value_eur IS NULL OR o.value_eur = 0)
    AND o.archived_at IS NULL
  ORDER BY o.order_number
`).all();
console.log(`\n=== ZLECENIA Z SUFFIXEM BEZ CENY ===`);
console.log(`Ilość: ${suffixOrders.length}`);
suffixOrders.forEach(o => {
  const base = o.order_number.split('-')[0];
  const pending = db.prepare("SELECT id, value_netto, currency, status FROM pending_order_prices WHERE order_number = ?").all(base);
  if (pending.length > 0) {
    console.log(`  ${o.order_number} (base=${base}) - MA PENDING:`);
    pending.forEach(p => {
      const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
      console.log(`    #${p.id}: ${p.currency} ${val} status=${p.status}`);
    });
  }
});

// 10. Główna przyczyna: ile PDF-ów nigdy nie zostało zaimportowanych?
const allImported = db.prepare("SELECT COUNT(DISTINCT filename) as cnt FROM pending_order_prices").get();
const allImportedFiles = db.prepare("SELECT COUNT(*) as cnt FROM file_imports WHERE file_type = 'ceny_pdf'").get();
console.log(`\n=== IMPORT STATS ===`);
console.log(`Unique filenames w pending_order_prices: ${allImported.cnt}`);
console.log(`File imports typu ceny_pdf: ${allImportedFiles.cnt}`);

// Ile jest WSZYSTKICH zleceń?
const totalOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE archived_at IS NULL").get();
const ordersWithPrice = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE archived_at IS NULL AND ((value_pln IS NOT NULL AND value_pln > 0) OR (value_eur IS NOT NULL AND value_eur > 0))").get();
console.log(`\nWszystkich aktywnych zleceń: ${totalOrders.cnt}`);
console.log(`Z ceną: ${ordersWithPrice.cnt}`);
console.log(`Bez ceny: ${totalOrders.cnt - ordersWithPrice.cnt}`);
console.log(`% z ceną: ${((ordersWithPrice.cnt / totalOrders.cnt) * 100).toFixed(1)}%`);

db.close();
