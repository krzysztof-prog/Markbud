/**
 * Fix zduplikowanych OrderGlass, OrderWindow, OrderMaterial
 * Bug: ścieżka 'add_new' w UzyteBeleParser nie usuwała starych rekordów
 * Użycie: node scripts/fix-duplicate-glasses.cjs
 */
const path = require('path');
const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'));
const dbPath = path.join(__dirname, '..', 'prisma', 'prod.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('=== Naprawa zduplikowanych rekordów ===\n');
console.log('Baza:', dbPath, '\n');

// Stan PRZED naprawą
const beforeStats = db.prepare(`
  SELECT o.order_number, o.total_glasses, o.delivered_glass_count,
         COUNT(og.id) as glassRecords
  FROM orders o
  JOIN order_glasses og ON og.order_id = o.id
  WHERE o.order_number IN ('54040','54041','54042','54043','54044','54045','54046','53901')
  GROUP BY o.id
  ORDER BY o.order_number
`).all();

console.log('PRZED naprawą:');
console.table(beforeStats);

// Duplikaty szyb po order_id + lp (re-import tworzy te same lp)
const duplicates = db.prepare(`
  SELECT order_id, lp,
         COUNT(*) as cnt, GROUP_CONCAT(id) as ids
  FROM order_glasses
  GROUP BY order_id, lp
  HAVING COUNT(*) > 1
`).all();

console.log(`\nZnaleziono ${duplicates.length} grup zduplikowanych szyb.\n`);

let totalRemoved = 0;
const affectedOrders = new Set();
const deleteStmt = db.prepare('DELETE FROM order_glasses WHERE id = ?');

if (duplicates.length > 0) {
  const fix = db.transaction(() => {
    for (const dup of duplicates) {
      const ids = dup.ids.split(',').map(Number);
      for (const id of ids.slice(1)) { deleteStmt.run(id); }
      totalRemoved += ids.length - 1;
      affectedOrders.add(dup.order_id);
    }
  });
  fix();
  console.log(`Usunięto ${totalRemoved} duplikatów szyb z ${affectedOrders.size} zleceń.\n`);

  // Przelicz total_glasses
  const recalc = db.prepare(`
    UPDATE orders SET total_glasses = (
      SELECT COUNT(*) FROM order_glasses og
      WHERE og.order_id = orders.id
      AND LOWER(COALESCE(og.package_type, '')) NOT LIKE '%panel%'
      AND LOWER(COALESCE(og.package_type, '')) NOT LIKE '%wypełnienie%'
      AND LOWER(COALESCE(og.package_type, '')) NOT LIKE '%wypelnienie%'
    )
    WHERE id = ?
  `);
  const recalcTx = db.transaction(() => {
    for (const orderId of affectedOrders) { recalc.run(orderId); }
  });
  recalcTx();
}

// Stan PO naprawie
const afterStats = db.prepare(`
  SELECT o.order_number, o.total_glasses, o.delivered_glass_count,
         COUNT(og.id) as glassRecords
  FROM orders o
  JOIN order_glasses og ON og.order_id = o.id
  WHERE o.order_number IN ('54040','54041','54042','54043','54044','54045','54046','53901')
  GROUP BY o.id
  ORDER BY o.order_number
`).all();

console.log('PO naprawie szyb:');
console.table(afterStats);

// Duplikaty okien (po order_id + position)
const dupWindows = db.prepare(`
  SELECT order_id, position,
         COUNT(*) as cnt, GROUP_CONCAT(id) as ids
  FROM order_windows
  GROUP BY order_id, position
  HAVING COUNT(*) > 1
`).all();

if (dupWindows.length > 0) {
  let winRemoved = 0;
  const deleteWin = db.prepare('DELETE FROM order_windows WHERE id = ?');
  const fixWin = db.transaction(() => {
    for (const dup of dupWindows) {
      const ids = dup.ids.split(',').map(Number);
      for (const id of ids.slice(1)) { deleteWin.run(id); }
      winRemoved += ids.length - 1;
    }
  });
  fixWin();
  console.log(`Usunięto ${winRemoved} zduplikowanych okien.`);
} else {
  console.log('Brak zduplikowanych okien.');
}

// Duplikaty materiałów (po order_id + position + category)
const dupMaterials = db.prepare(`
  SELECT order_id, position, category,
         COUNT(*) as cnt, GROUP_CONCAT(id) as ids
  FROM order_materials
  GROUP BY order_id, position, category
  HAVING COUNT(*) > 1
`).all();

if (dupMaterials.length > 0) {
  let matRemoved = 0;
  const deleteMat = db.prepare('DELETE FROM order_materials WHERE id = ?');
  const fixMat = db.transaction(() => {
    for (const dup of dupMaterials) {
      const ids = dup.ids.split(',').map(Number);
      for (const id of ids.slice(1)) { deleteMat.run(id); }
      matRemoved += ids.length - 1;
    }
  });
  fixMat();
  console.log(`Usunięto ${matRemoved} zduplikowanych materiałów.`);
} else {
  console.log('Brak zduplikowanych materiałów.');
}

console.log('\nGotowe!');
db.close();
