/**
 * Fix remaining pending prices:
 * 1. Pending z order_number != UNKNOWN ale brak exact match -> sprawdź prefix
 * 2. ZAM pliki -> dopasuj po numerze w nazwie pliku
 * 3. UNKNOWN z ceną -> dopasuj po D-numerach w nazwie pliku (Schüco numer -> order project)
 */
const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db');

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) {
  console.log('=== DRY RUN MODE ===\n');
}

const stats = {
  prefixMatched: 0,
  zamMatched: 0,
  projectMatched: 0,
  priceApplied: 0,
  priceSkipped: 0,
  markedApplied: 0,
};

function applyPrice(pendingId, orderId, orderNumber, currency, valueNetto) {
  const order = db.prepare('SELECT value_pln, value_eur FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    console.log(`    [ERROR] order id=${orderId} not found`);
    return;
  }

  const priceField = currency === 'EUR' ? 'value_eur' : 'value_pln';
  const existingPrice = currency === 'EUR' ? order.value_eur : order.value_pln;

  if (!DRY_RUN) {
    db.prepare(`
      UPDATE pending_order_prices
      SET status = 'applied', applied_at = datetime('now'), applied_to_order_id = ?, order_number = ?
      WHERE id = ?
    `).run(orderId, orderNumber, pendingId);
  }
  stats.markedApplied++;

  if (existingPrice && existingPrice > 0) {
    const existingVal = (existingPrice / 100).toFixed(2);
    console.log(`    [SKIP PRICE] ${orderNumber} ma już ${currency} ${existingVal}`);
    stats.priceSkipped++;
    return;
  }

  if (!valueNetto || valueNetto <= 0) {
    console.log(`    [SKIP PRICE] value=0`);
    stats.priceSkipped++;
    return;
  }

  if (!DRY_RUN) {
    db.prepare(`UPDATE orders SET ${priceField} = ? WHERE id = ?`).run(valueNetto, orderId);
  }

  const val = (valueNetto / 100).toFixed(2);
  console.log(`    [APPLIED] ${currency} ${val} -> ${orderNumber} (id=${orderId})`);
  stats.priceApplied++;
}

// ============================================================
// STRATEGIA 1: Pending z order_number ale brak exact match -> prefix
// ============================================================
console.log('=== STRATEGIA 1: PREFIX MATCHING DLA NIEDOPASOWANYCH ===');

const pendingNoMatch = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending'
    AND pop.order_number != 'UNKNOWN'
    AND o.id IS NULL
  ORDER BY pop.order_number
`).all();

console.log(`Pending bez exact match: ${pendingNoMatch.length}`);

for (const p of pendingNoMatch) {
  // Próbuj prefix match
  const prefixOrders = db.prepare(
    `SELECT id, order_number, project, value_pln, value_eur
     FROM orders WHERE order_number LIKE ? || '-%'`
  ).all(p.order_number);

  if (prefixOrders.length === 1) {
    const order = prefixOrders[0];
    const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
    console.log(`  #${p.id}: "${p.order_number}" -> "${order.order_number}" | ${p.currency} ${val}`);
    applyPrice(p.id, order.id, order.order_number, p.currency, p.value_netto);
    stats.prefixMatched++;
  } else if (prefixOrders.length > 1) {
    console.log(`  #${p.id}: "${p.order_number}" -> MULTIPLE MATCHES (${prefixOrders.map(o => o.order_number).join(', ')}) - skip`);
  }
  // Jeśli 0 - szukaj odwrotnie: maybe order_number starts with pending but pending ma krótszy
}

// ============================================================
// STRATEGIA 2: ZAM pliki - dopasuj po numerze w nazwie pliku
// ============================================================
console.log('\n=== STRATEGIA 2: ZAM PLIKI ===');

const zamPending = db.prepare(`
  SELECT id, order_number, currency, value_netto, filename
  FROM pending_order_prices
  WHERE status = 'pending'
    AND filename LIKE 'ZAM %'
`).all();

console.log(`ZAM pending: ${zamPending.length}`);

for (const p of zamPending) {
  // Wyciągnij 5-cyfrowy numer ze słowa ZAM w nazwie
  const match = p.filename.match(/ZAM\s+(\d{5})/i);
  if (match) {
    const orderNum = match[1];
    // Szukaj exact match
    let order = db.prepare('SELECT id, order_number, value_pln, value_eur FROM orders WHERE order_number = ?').get(orderNum);
    // Albo prefix
    if (!order) {
      order = db.prepare('SELECT id, order_number, value_pln, value_eur FROM orders WHERE order_number LIKE ? ORDER BY order_number ASC LIMIT 1').get(orderNum + '-%');
    }
    if (order) {
      const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
      console.log(`  #${p.id}: "${p.filename}" -> order ${order.order_number} | ${p.currency} ${val}`);
      applyPrice(p.id, order.id, order.order_number, p.currency, p.value_netto);
      stats.zamMatched++;
    } else {
      console.log(`  #${p.id}: "${p.filename}" -> numer ${orderNum} nie znaleziony w orders`);
    }
  }
}

// ============================================================
// STRATEGIA 3: UNKNOWN z D-numerami -> dopasuj po project
// ============================================================
console.log('\n=== STRATEGIA 3: UNKNOWN Z D-NUMERAMI -> PROJECT MATCH ===');

const unknownPending = db.prepare(`
  SELECT id, order_number, currency, value_netto, filename
  FROM pending_order_prices
  WHERE status = 'pending'
    AND order_number = 'UNKNOWN'
    AND value_netto > 0
`).all();

console.log(`UNKNOWN z ceną: ${unknownPending.length}`);

for (const p of unknownPending) {
  if (!p.filename) continue;

  // Wyciągnij D-numery z nazwy pliku (np. "D4073  SZYBA 6.02.pdf" -> D4073)
  const dNumbers = p.filename.match(/[CD]\d{3,5}/gi) || [];

  if (dNumbers.length === 0) continue;

  // Szukaj zlecenia które ma te D-numery w project
  for (const dNum of dNumbers) {
    const orders = db.prepare(`
      SELECT id, order_number, project, value_pln, value_eur
      FROM orders
      WHERE project LIKE '%' || ? || '%'
        AND archived_at IS NULL
    `).all(dNum.toUpperCase());

    if (orders.length === 1) {
      const order = orders[0];
      const val = (p.value_netto / 100).toFixed(2);
      console.log(`  #${p.id}: "${p.filename}" D-num=${dNum} -> order ${order.order_number} (project: ${order.project}) | ${p.currency} ${val}`);

      // Te ceny to zazwyczaj SZYBY albo klamki - mogą być dodatkowe, nie zastępują
      // Ale sprawdź - jeśli zlecenie nie ma ceny, zastosuj
      applyPrice(p.id, order.id, order.order_number, p.currency, p.value_netto);
      stats.projectMatched++;
      break; // Dopasuj do pierwszego znalezionego
    } else if (orders.length > 1) {
      console.log(`  #${p.id}: "${p.filename}" D-num=${dNum} -> MULTIPLE: ${orders.map(o => o.order_number).join(', ')}`);
    }
  }
}

// ============================================================
// STRATEGIA 4: UNKNOWN z nazwiskami -> dopasuj po project
// ============================================================
console.log('\n=== STRATEGIA 4: UNKNOWN Z NAZWISKAMI -> PROJECT MATCH ===');

const allOrders = db.prepare(`
  SELECT id, order_number, project, value_pln, value_eur
  FROM orders
  WHERE project IS NOT NULL AND project != '' AND archived_at IS NULL
`).all();

const remainingUnknown = db.prepare(`
  SELECT id, order_number, currency, value_netto, filename
  FROM pending_order_prices
  WHERE status = 'pending'
    AND order_number = 'UNKNOWN'
    AND value_netto > 0
`).all();

for (const p of remainingUnknown) {
  if (!p.filename) continue;

  // Wyciągnij nazwiska z pliku (pomijaj SZYBA, ZAM, daty, numery)
  const nameParts = p.filename
    .replace(/\.pdf$/i, '')
    .replace(/\d{1,2}\.\d{2}(\s+[IV]+)?$/i, '') // data + opcjonalnie I/II/III
    .replace(/\bSZYBA\b|\bSZYBY\b|\bRAMA\b|\bSKRZYDLO\b|\bPANEL\b|\bKLAMKI\b|\bAKR\b|\bSYSTEM\b|\bZAM\b/gi, '')
    .trim()
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && !/^\d+$/.test(s) && !/^[IVX]+$/i.test(s));

  if (nameParts.length === 0) continue;

  let bestMatch = null;
  let bestScore = 0;

  for (const order of allOrders) {
    const projectWords = order.project
      .split(/[,\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length >= 3);

    let score = 0;
    for (const name of nameParts) {
      if (projectWords.includes(name.toUpperCase())) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = order;
    }
  }

  if (bestMatch && bestScore >= 1) {
    const val = (p.value_netto / 100).toFixed(2);
    console.log(`  #${p.id}: "${p.filename}" -> order ${bestMatch.order_number} (score=${bestScore})`);
    console.log(`    names: [${nameParts.join(', ')}] project: ${bestMatch.project}`);
    applyPrice(p.id, bestMatch.id, bestMatch.order_number, p.currency, p.value_netto);
    stats.projectMatched++;
  }
}

// ============================================================
// PODSUMOWANIE
// ============================================================
console.log('\n\n=== PODSUMOWANIE ===');
console.log(`Prefix matched: ${stats.prefixMatched}`);
console.log(`ZAM matched: ${stats.zamMatched}`);
console.log(`Project matched: ${stats.projectMatched}`);
console.log(`Ceny zastosowane: ${stats.priceApplied}`);
console.log(`Ceny pominięte: ${stats.priceSkipped}`);
console.log(`Pending -> applied: ${stats.markedApplied}`);

if (DRY_RUN) {
  console.log('\n[DRY RUN] Żadne zmiany nie zostały zapisane.');
}

// Stan końcowy
const totalOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE archived_at IS NULL").get();
const ordersWithPrice = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE archived_at IS NULL AND ((value_pln IS NOT NULL AND value_pln > 0) OR (value_eur IS NOT NULL AND value_eur > 0))").get();
const remainingPending = db.prepare("SELECT COUNT(*) as cnt FROM pending_order_prices WHERE status = 'pending'").get();
console.log(`\nAktywne zlecenia: ${totalOrders.cnt}`);
console.log(`Z ceną: ${ordersWithPrice.cnt} (${((ordersWithPrice.cnt / totalOrders.cnt) * 100).toFixed(1)}%)`);
console.log(`Bez ceny: ${totalOrders.cnt - ordersWithPrice.cnt}`);
console.log(`Pending prices remaining: ${remainingPending.cnt}`);

db.close();
