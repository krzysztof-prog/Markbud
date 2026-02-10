const Database = require('./apps/api/node_modules/better-sqlite3');
const db = new Database('./apps/api/prisma/dev.db', { readonly: true });

// 1. Get all pending prices that have no matching order (status='pending', not UNKNOWN)
const pending = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename, pop.filepath
  FROM pending_order_prices pop
  LEFT JOIN orders o ON o.order_number = pop.order_number
  WHERE pop.status = 'pending'
    AND pop.order_number != 'UNKNOWN'
    AND o.id IS NULL
  ORDER BY pop.filename
`).all();

console.log('=== PENDING PRICES BEZ DOPASOWANIA (nie-UNKNOWN) ===');
console.log('Total:', pending.length);

// 2. For each pending, extract name parts from filename and try to match
const allOrders = db.prepare(`
  SELECT id, order_number, project
  FROM orders
  WHERE project IS NOT NULL AND project != ''
`).all();

console.log('Orders with project:', allOrders.length);

let matched = 0;
let unmatched = 0;
const matches = [];
const noMatches = [];

for (const p of pending) {
  if (!p.filename) {
    noMatches.push({ ...p, reason: 'no filename' });
    unmatched++;
    continue;
  }

  // Extract name parts from filename
  // Format: "GRAAF,NOUWS,ZOLDER 241017   13.01.pdf"
  // We want: ["GRAAF", "NOUWS", "ZOLDER"]
  const namePartRaw = p.filename
    .replace(/\.pdf$/i, '')     // Remove .pdf
    .replace(/\d{2}\.\d{2}$/, '') // Remove date at end "13.01"
    .replace(/\s+\d+\s*$/, '')    // Remove trailing numbers "241017"
    .trim();

  // Split by comma, space, or both
  const nameParts = namePartRaw
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && !/^\d+$/.test(s)); // Only alpha parts, min 3 chars

  if (nameParts.length === 0) {
    noMatches.push({ ...p, reason: 'no name parts extracted', namePartRaw });
    unmatched++;
    continue;
  }

  // Try to match against order projects
  let bestMatch = null;
  let bestScore = 0;

  for (const order of allOrders) {
    const project = order.project.toUpperCase();
    let score = 0;
    for (const name of nameParts) {
      if (project.includes(name.toUpperCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = order;
    }
  }

  if (bestMatch && bestScore >= 1) {
    matched++;
    matches.push({
      pendingId: p.id,
      pendingOrderNumber: p.order_number,
      filename: p.filename,
      currency: p.currency,
      valueNetto: p.value_netto,
      matchedOrderId: bestMatch.id,
      matchedOrderNumber: bestMatch.order_number,
      matchedProject: bestMatch.project,
      nameParts,
      score: bestScore,
    });
  } else {
    noMatches.push({ ...p, reason: 'no project match', nameParts });
    unmatched++;
  }
}

console.log('\n=== WYNIKI DOPASOWANIA ===');
console.log('Dopasowane:', matched);
console.log('Niedopasowane:', unmatched);

console.log('\n=== DOPASOWANE - SZCZEGÓŁY ===');
matches.forEach(m => {
  const val = m.valueNetto ? (m.valueNetto / 100).toFixed(2) : '0';
  console.log(`  pending #${m.pendingId}: "${m.filename}"`);
  console.log(`    parsed order: ${m.pendingOrderNumber} -> matched: ${m.matchedOrderNumber} (id=${m.matchedOrderId})`);
  console.log(`    project: ${m.matchedProject}`);
  console.log(`    value: ${m.currency} ${val} | name parts: [${m.nameParts.join(', ')}] | score: ${m.score}`);
  console.log('');
});

console.log('\n=== NIEDOPASOWANE ===');
noMatches.forEach(nm => {
  const val = nm.value_netto ? (nm.value_netto / 100).toFixed(2) : '0';
  console.log(`  pending #${nm.id}: "${nm.filename || 'NULL'}" | order: ${nm.order_number} | ${nm.currency} ${val}`);
  console.log(`    reason: ${nm.reason} | nameParts: ${nm.nameParts ? '[' + nm.nameParts.join(', ') + ']' : '-'}`);
});

// 3. Also analyze UNKNOWN pending prices
console.log('\n\n=== UNKNOWN PENDING PRICES - ANALYSIS ===');
const unknowns = db.prepare(`
  SELECT pop.id, pop.order_number, pop.currency, pop.value_netto, pop.filename
  FROM pending_order_prices pop
  WHERE pop.order_number = 'UNKNOWN' AND pop.status = 'pending'
  ORDER BY pop.filename
`).all();

console.log('UNKNOWN total:', unknowns.length);

let unknownMatched = 0;
const unknownMatches = [];

for (const u of unknowns) {
  if (!u.filename) continue;

  const namePartRaw = u.filename
    .replace(/\.pdf$/i, '')
    .replace(/\d{2}\.\d{2}$/, '')
    .replace(/\s+\d+\s*$/, '')
    .trim();

  const nameParts = namePartRaw
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && !/^\d+$/.test(s));

  if (nameParts.length === 0) continue;

  let bestMatch = null;
  let bestScore = 0;

  for (const order of allOrders) {
    const project = order.project.toUpperCase();
    let score = 0;
    for (const name of nameParts) {
      if (project.includes(name.toUpperCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = order;
    }
  }

  if (bestMatch && bestScore >= 1) {
    unknownMatched++;
    unknownMatches.push({
      pendingId: u.id,
      filename: u.filename,
      currency: u.currency,
      valueNetto: u.value_netto,
      matchedOrderId: bestMatch.id,
      matchedOrderNumber: bestMatch.order_number,
      matchedProject: bestMatch.project,
      nameParts,
      score: bestScore,
    });
  }
}

console.log('UNKNOWN dopasowane po nazwie:', unknownMatched);
unknownMatches.forEach(m => {
  const val = m.valueNetto ? (m.valueNetto / 100).toFixed(2) : '0';
  console.log(`  pending #${m.pendingId}: "${m.filename}"`);
  console.log(`    -> matched: ${m.matchedOrderNumber} (id=${m.matchedOrderId}) | ${m.matchedProject}`);
  console.log(`    value: ${m.currency} ${val} | parts: [${m.nameParts.join(', ')}] | score: ${m.score}`);
});

// Summary
console.log('\n\n=== PODSUMOWANIE ===');
console.log('Nie-UNKNOWN pending bez dopasowania:', pending.length);
console.log('  -> dopasowane po nazwie projektu:', matched);
console.log('  -> niedopasowane:', unmatched);
console.log('UNKNOWN pending:', unknowns.length);
console.log('  -> dopasowane po nazwie projektu:', unknownMatched);
console.log('RAZEM do auto-fix:', matched + unknownMatched);

db.close();
