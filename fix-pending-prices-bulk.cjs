/**
 * Bulk fix script: dopasowuje pending_order_prices do zleceń
 *
 * Strategie:
 * 1. Suffix matching: parsed "53614" -> order "53614-a"
 * 2. Filename-to-project matching: nazwy klientów z filename vs pole project w orders
 * 3. UNKNOWN z dopasowaniem po nazwie projektu
 *
 * Skrypt jest BEZPIECZNY - nie nadpisuje istniejących cen (sprawdza przed update)
 */
const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db');

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) {
  console.log('=== DRY RUN MODE (bez zmian w bazie) ===\n');
}

// Pobierz wszystkie pending prices bez dopasowania
const pendingAll = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename, pop.filepath
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending'
    AND o.id IS NULL
  ORDER BY pop.order_number
`).all();

console.log(`Pending prices bez dopasowania: ${pendingAll.length}`);
console.log(`  - nie-UNKNOWN: ${pendingAll.filter(p => p.order_number !== 'UNKNOWN').length}`);
console.log(`  - UNKNOWN: ${pendingAll.filter(p => p.order_number === 'UNKNOWN').length}`);
console.log('');

// Pobierz zlecenia z projektem
const allOrders = db.prepare(`
  SELECT id, order_number, project, value_pln, value_eur
  FROM orders
  WHERE project IS NOT NULL AND project != ''
`).all();

const stats = {
  suffixMatched: 0,
  nameMatched: 0,
  priceApplied: 0,
  priceSkipped: 0,
  markedApplied: 0,
  failed: 0,
};

/**
 * Wyciąga słowa-nazwy z nazwy pliku (pomija cyfry, daty, rozszerzenia)
 */
function extractNameParts(filename) {
  if (!filename) return [];
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/\d{2}\.\d{2}$/, '')  // data na końcu "13.01"
    .replace(/\s+\d+\s*$/, '')      // numer na końcu
    .trim()
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && !/^\d+$/.test(s));
}

/**
 * Dopasowuje nazwy do pola project zlecenia (exact word match, nie substring)
 */
function matchByProjectName(nameParts, orders) {
  let bestMatch = null;
  let bestScore = 0;

  for (const order of orders) {
    // Rozbij project na słowa i porównuj exact (nie substring)
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

  // Wymagaj minimum score 2 LUB score 1 z krótką listą nazw (np. 1 nazwa = 1 match OK)
  if (bestMatch && (bestScore >= 2 || (bestScore >= 1 && nameParts.length <= 2))) {
    return { match: bestMatch, score: bestScore };
  }
  return null;
}

/**
 * Aplikuje cenę do zlecenia (jeśli nie ma jeszcze ceny w tej walucie)
 */
function applyPrice(pendingId, orderId, orderNumber, currency, valueNetto) {
  const order = db.prepare('SELECT value_pln, value_eur FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    console.log(`    [SKIP] Zlecenie id=${orderId} nie znalezione`);
    stats.failed++;
    return;
  }

  const priceField = currency === 'EUR' ? 'value_eur' : 'value_pln';
  const existingPrice = currency === 'EUR' ? order.value_eur : order.value_pln;

  // Oznacz pending price jako applied
  if (!DRY_RUN) {
    db.prepare(`
      UPDATE pending_order_prices
      SET status = 'applied', applied_at = datetime('now'), applied_to_order_id = ?, order_number = ?
      WHERE id = ?
    `).run(orderId, orderNumber, pendingId);
  }
  stats.markedApplied++;

  // Aplikuj cenę tylko jeśli nie ma istniejącej i wartość > 0
  if (existingPrice && existingPrice > 0) {
    const existingVal = (existingPrice / 100).toFixed(2);
    console.log(`    [SKIP PRICE] Zlecenie ${orderNumber} ma już ${currency} ${existingVal}`);
    stats.priceSkipped++;
    return;
  }

  if (!valueNetto || valueNetto <= 0) {
    console.log(`    [SKIP PRICE] Wartość = 0, oznaczam pending ale nie aktualizuję ceny`);
    stats.priceSkipped++;
    return;
  }

  if (!DRY_RUN) {
    db.prepare(`UPDATE orders SET ${priceField} = ? WHERE id = ?`).run(valueNetto, orderId);
  }

  const val = (valueNetto / 100).toFixed(2);
  console.log(`    [APPLIED] ${currency} ${val} -> zlecenie ${orderNumber} (id=${orderId})`);
  stats.priceApplied++;
}

// ============================================================
// STRATEGIA 1: Suffix matching (53614 -> 53614-a)
// ============================================================
console.log('=== STRATEGIA 1: SUFFIX MATCHING ===');
const nonUnknown = pendingAll.filter(p => p.order_number !== 'UNKNOWN');

for (const p of nonUnknown) {
  const prefixOrders = db.prepare(
    `SELECT id, order_number, project, value_pln, value_eur
     FROM orders WHERE order_number LIKE ? || '%'`
  ).all(p.order_number);

  if (prefixOrders.length === 1) {
    const order = prefixOrders[0];
    const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
    console.log(`  #${p.id}: "${p.order_number}" -> "${order.order_number}" | ${p.currency} ${val}`);
    applyPrice(p.id, order.id, order.order_number, p.currency, p.value_netto);
    stats.suffixMatched++;
  }
}

// ============================================================
// STRATEGIA 2: Filename-to-project (nie-UNKNOWN bez suffix match)
// ============================================================
console.log('\n=== STRATEGIA 2: FILENAME-TO-PROJECT MATCHING ===');

// Pobierz pending prices które nie zostały jeszcze dopasowane
const remainingPending = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename
  FROM pending_order_prices pop
  WHERE pop.status = 'pending'
    AND pop.order_number != 'UNKNOWN'
  ORDER BY pop.filename
`).all();

for (const p of remainingPending) {
  const nameParts = extractNameParts(p.filename);
  if (nameParts.length === 0) continue;

  const result = matchByProjectName(nameParts, allOrders);
  if (result) {
    const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
    console.log(`  #${p.id}: "${p.filename}" -> "${result.match.order_number}" (score=${result.score})`);
    console.log(`    names: [${nameParts.join(', ')}] project: ${result.match.project}`);
    applyPrice(p.id, result.match.id, result.match.order_number, p.currency, p.value_netto);
    stats.nameMatched++;
  }
}

// ============================================================
// STRATEGIA 3: UNKNOWN z dopasowaniem po nazwie projektu
// ============================================================
console.log('\n=== STRATEGIA 3: UNKNOWN FILENAME-TO-PROJECT ===');

const unknownPending = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename
  FROM pending_order_prices pop
  WHERE pop.status = 'pending'
    AND pop.order_number = 'UNKNOWN'
  ORDER BY pop.filename
`).all();

for (const p of unknownPending) {
  const nameParts = extractNameParts(p.filename);
  if (nameParts.length === 0) continue;

  const result = matchByProjectName(nameParts, allOrders);
  if (result) {
    const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
    console.log(`  #${p.id}: "${p.filename}" -> "${result.match.order_number}" (score=${result.score})`);
    console.log(`    names: [${nameParts.join(', ')}] project: ${result.match.project}`);
    applyPrice(p.id, result.match.id, result.match.order_number, p.currency, p.value_netto);
    stats.nameMatched++;
  }
}

// ============================================================
// PODSUMOWANIE
// ============================================================
console.log('\n\n=== PODSUMOWANIE ===');
console.log(`Suffix matched: ${stats.suffixMatched}`);
console.log(`Name matched: ${stats.nameMatched}`);
console.log(`Ceny zastosowane: ${stats.priceApplied}`);
console.log(`Ceny pominięte (już istnieją lub 0): ${stats.priceSkipped}`);
console.log(`Pending prices oznaczone jako applied: ${stats.markedApplied}`);
console.log(`Błędy: ${stats.failed}`);
if (DRY_RUN) {
  console.log('\n[DRY RUN] Żadne zmiany nie zostały zapisane w bazie.');
  console.log('Uruchom bez --dry-run aby zastosować zmiany.');
}

// Sprawdź ile pending prices pozostało
const remaining = db.prepare(`
  SELECT COUNT(*) as cnt FROM pending_order_prices WHERE status = 'pending'
`).get();
console.log(`\nPozostało pending prices: ${remaining.cnt}`);

db.close();
