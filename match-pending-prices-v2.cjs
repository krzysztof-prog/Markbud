const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// Check if unmatched pending prices have orders with suffix like "53614-a"
console.log('=== SUFFIX MATCHING CHECK ===');
const pending = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending'
    AND pop.order_number != 'UNKNOWN'
    AND o.id IS NULL
  ORDER BY pop.order_number
`).all();

console.log('Pending without exact match:', pending.length);

let suffixMatched = 0;
const suffixMatches = [];

for (const p of pending) {
  // Try prefix match: order_number LIKE 'parsed_number%'
  const prefixOrders = db.prepare(
    `SELECT id, order_number, project FROM orders WHERE order_number LIKE ? || '%'`
  ).all(p.order_number);

  if (prefixOrders.length > 0) {
    suffixMatched++;
    suffixMatches.push({
      pendingId: p.id,
      pendingOrderNumber: p.order_number,
      filename: p.filename,
      currency: p.currency,
      valueNetto: p.value_netto,
      matchedOrders: prefixOrders.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        project: o.project,
      })),
    });
  }
}

console.log('Matched by suffix:', suffixMatched);
console.log('');

suffixMatches.forEach(m => {
  const val = m.valueNetto ? (m.valueNetto / 100).toFixed(2) : '0';
  console.log(`pending #${m.pendingId}: parsed="${m.pendingOrderNumber}" | ${m.currency} ${val} | "${m.filename}"`);
  m.matchedOrders.forEach(o => {
    console.log(`  -> order "${o.orderNumber}" (id=${o.id}) project: ${o.project || '-'}`);
  });
});

// Also check the 40 unmatched from first script (no project match either)
console.log('\n\n=== COMPLETELY UNMATCHED (no suffix, no project match) ===');
const completelyUnmatched = [];
for (const p of pending) {
  const prefixOrders = db.prepare(
    `SELECT id FROM orders WHERE order_number LIKE ? || '%'`
  ).all(p.order_number);

  if (prefixOrders.length === 0) {
    // Also check project matching
    const allOrders = db.prepare(`SELECT id, order_number, project FROM orders WHERE project IS NOT NULL AND project != ''`).all();
    const namePartRaw = (p.filename || '')
      .replace(/\.pdf$/i, '')
      .replace(/\d{2}\.\d{2}$/, '')
      .replace(/\s+\d+\s*$/, '')
      .trim();
    const nameParts = namePartRaw
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 3 && !/^\d+$/.test(s));

    let hasProjectMatch = false;
    for (const order of allOrders) {
      const projectWords = order.project.split(/[,\s]+/).map(s => s.trim().toUpperCase());
      for (const name of nameParts) {
        if (projectWords.includes(name.toUpperCase())) {
          hasProjectMatch = true;
          break;
        }
      }
      if (hasProjectMatch) break;
    }

    if (!hasProjectMatch) {
      completelyUnmatched.push(p);
    }
  }
}

console.log('Completely unmatched:', completelyUnmatched.length);
completelyUnmatched.forEach(p => {
  const val = p.value_netto ? (p.value_netto / 100).toFixed(2) : '0';
  console.log(`  pending #${p.id}: "${p.filename}" | order: ${p.order_number} | ${p.currency} ${val}`);
});

// Check if ANY of the parsed order numbers exist as standalone orders
console.log('\n\n=== PARSED ORDER NUMBERS CHECK ===');
const allParsedNums = [...new Set(pending.map(p => p.order_number))];
console.log('Unique parsed order numbers:', allParsedNums.length);
for (const num of allParsedNums) {
  const exact = db.prepare('SELECT id, order_number FROM orders WHERE order_number = ?').get(num);
  const prefix = db.prepare('SELECT id, order_number FROM orders WHERE order_number LIKE ? || \'%\'').all(num);
  if (exact) {
    console.log(`  ${num}: EXACT MATCH (id=${exact.id})`);
  } else if (prefix.length > 0) {
    console.log(`  ${num}: PREFIX MATCH -> ${prefix.map(o => o.order_number).join(', ')}`);
  } else {
    console.log(`  ${num}: NO MATCH`);
  }
}

db.close();
