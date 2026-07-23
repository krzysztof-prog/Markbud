/**
 * Jednorazowy skrypt: import dostawy szyb 05270_01469.csv
 * Rack number się powtarza (stojaki zwracane) - importujemy ręcznie
 */
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('fs');

const DB_PATH = 'a:/apps/api/prisma/prod.db';
// Plik już skonwertowany do UTF-8 przez iconv CLI
const path = require('path');
const CSV_PATH = path.join(__dirname, '05270_utf8.csv');

function parseOrderReference(reference) {
  const trimmed = reference.trim();
  const match = trimmed.match(/\d*\s*(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/);
  if (match) {
    return { orderNumber: match[1], orderSuffix: match[2] || null, position: match[3] || null };
  }
  const simple = trimmed.match(/(\d+)(?:-([a-zA-Z]+))?/);
  if (simple) {
    return { orderNumber: simple[1], orderSuffix: simple[2] || null, position: null };
  }
  return null;
}

// Czytaj CSV (już w UTF-8)
const content = readFileSync(CSV_PATH, 'utf-8');
const lines = content.split(/\r?\n/).filter(l => l.trim());

console.log(`Wczytano ${lines.length} linii z CSV`);

// Parse header
const headers = lines[0].split(';').map(h => h.trim());
const findIdx = (names) => {
  for (const name of names) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
};

const idx = {
  rack: findIdx(['Numer stojaka']),
  custOrder: findIdx(['Numer zamówienia klienta', 'zamówienia klienta']),
  suppOrder: findIdx(['Numer zamówienia dostawcy', 'zamówienia dostawcy']),
  position: findIdx(['Pozycja']),
  width: findIdx(['Szerokosc', 'Szerokość']),
  height: findIdx(['Wysokosc', 'Wysokość']),
  quantity: findIdx(['Sztuk', 'Ilość']),
  orderRef: findIdx(['Zlecenie']),
  composition: findIdx(['Zespolenie']),
  serial: findIdx(['Numer seryjny']),
  client: findIdx(['Kod klienta']),
};

console.log('Indeksy kolumn:', idx);

if (idx.orderRef === -1) {
  console.error('BLAD: Brak kolumny Zlecenie!');
  process.exit(1);
}

// Parse items
const items = [];
let rackNumber = '';
let customerOrderNumber = '';
let supplierOrderNumber = '';

for (let i = 1; i < lines.length; i++) {
  const vals = lines[i].split(';').map(v => v.trim());
  if (i === 1) {
    rackNumber = idx.rack >= 0 ? vals[idx.rack] || '' : '';
    customerOrderNumber = idx.custOrder >= 0 ? vals[idx.custOrder] || '' : '';
    supplierOrderNumber = idx.suppOrder >= 0 ? vals[idx.suppOrder] || '' : '';
  }

  const orderRef = vals[idx.orderRef] || '';
  if (!orderRef) continue;

  const parsed = parseOrderReference(orderRef);
  if (!parsed) continue;

  // Sprawdź czy to standardowa szyba (nie luzem, nie aluminiowa, nie reklamacyjna)
  const rowCustOrder = idx.custOrder >= 0 ? vals[idx.custOrder] || customerOrderNumber : customerOrderNumber;
  const upper = rowCustOrder.trim().toUpperCase();
  if (upper.includes('R/') || upper.includes('AL.') || /AL\d{2}/.test(upper)) continue;
  if (/^\d{9,11}/.test(upper)) continue;
  if (!/^\d{4,6}(?:\s|$|-)/.test(upper)) continue;

  items.push({
    orderNumber: parsed.orderNumber,
    orderSuffix: parsed.orderSuffix,
    position: String(idx.position >= 0 ? parseInt(vals[idx.position]) || i : i),
    widthMm: idx.width >= 0 ? parseInt(vals[idx.width]) || 0 : 0,
    heightMm: idx.height >= 0 ? parseInt(vals[idx.height]) || 0 : 0,
    quantity: idx.quantity >= 0 ? parseInt(vals[idx.quantity]) || 1 : 1,
    glassComposition: idx.composition >= 0 ? vals[idx.composition] || null : null,
    serialNumber: idx.serial >= 0 ? vals[idx.serial] || null : null,
    clientCode: idx.client >= 0 ? vals[idx.client] || null : null,
    customerOrderNumber: rowCustOrder || null,
    rackNumber: idx.rack >= 0 ? vals[idx.rack] || rackNumber : rackNumber,
  });
}

// Deduplikacja
const seen = new Set();
const uniqueItems = [];
for (const item of items) {
  const key = `${item.orderNumber}|${item.position}|${item.widthMm}|${item.heightMm}|${item.quantity}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueItems.push(item);
  }
}

console.log(`\nParsowano: ${items.length} pozycji, po deduplikacji: ${uniqueItems.length}`);
console.log(`Rack: ${rackNumber}, Customer: ${customerOrderNumber}, Supplier: ${supplierOrderNumber}`);

// Podsumowanie po zleceniach
const byOrder = {};
for (const item of uniqueItems) {
  const key = item.orderSuffix ? `${item.orderNumber}-${item.orderSuffix}` : item.orderNumber;
  if (!byOrder[key]) byOrder[key] = { count: 0, qty: 0 };
  byOrder[key].count++;
  byOrder[key].qty += item.quantity;
}
console.log('\nPozycje per zlecenie:');
for (const [order, stats] of Object.entries(byOrder)) {
  console.log(`  ${order}: ${stats.count} pozycji, ${stats.qty} szt.`);
}

// Zapis do bazy
const db = new DatabaseSync(DB_PATH);
const now = Date.now();

// 1. Utwórz glass_delivery
const insertDelivery = db.prepare(
  'INSERT INTO glass_deliveries (rack_number, customer_order_number, supplier_order_number, delivery_date, created_at) VALUES (?, ?, ?, ?, ?)'
);
insertDelivery.run(rackNumber, customerOrderNumber, supplierOrderNumber || '', now, now);
const deliveryId = db.prepare('SELECT last_insert_rowid() as id').get().id;
console.log(`\nUtworzono glass_delivery ID: ${deliveryId}`);

// 2. Wstaw items
const insertItem = db.prepare(
  'INSERT INTO glass_delivery_items (glass_delivery_id, order_number, order_suffix, position, width_mm, height_mm, quantity, glass_composition, serial_number, client_code, match_status, customer_order_number, rack_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

for (const item of uniqueItems) {
  insertItem.run(
    deliveryId,
    item.orderNumber,
    item.orderSuffix,
    item.position,
    item.widthMm,
    item.heightMm,
    item.quantity,
    item.glassComposition,
    item.serialNumber,
    item.clientCode,
    'pending',
    item.customerOrderNumber,
    item.rackNumber,
    now
  );
}
console.log(`Wstawiono ${uniqueItems.length} glass_delivery_items`);

// 3. Dopasuj z zamówieniami - aktualizuj delivered_glass_count
// Zbierz ilości per zlecenie
const deliveredByOrder = {};
for (const item of uniqueItems) {
  if (!deliveredByOrder[item.orderNumber]) deliveredByOrder[item.orderNumber] = 0;
  deliveredByOrder[item.orderNumber] += item.quantity;
}

console.log('\nAktualizacja delivered_glass_count:');
for (const [orderNumber, qty] of Object.entries(deliveredByOrder)) {
  // Sprawdź obecny stan
  const order = db.prepare('SELECT id, order_number, total_glasses, ordered_glass_count, delivered_glass_count, glass_order_status FROM orders WHERE order_number = ?').get(orderNumber);
  if (!order) {
    console.log(`  ${orderNumber}: nie znaleziono w bazie - pomijam`);
    continue;
  }

  const newDelivered = (order.delivered_glass_count || 0) + qty;
  const ordered = order.ordered_glass_count || 0;

  // Oblicz nowy status
  let newStatus = 'not_ordered';
  if (ordered === 0) {
    newStatus = 'not_ordered';
  } else if (newDelivered === 0) {
    newStatus = 'ordered';
  } else if (newDelivered < ordered) {
    newStatus = 'partially_delivered';
  } else if (newDelivered === ordered) {
    newStatus = 'delivered';
  } else {
    newStatus = 'over_delivered';
  }

  db.prepare('UPDATE orders SET delivered_glass_count = ?, glass_order_status = ? WHERE order_number = ?')
    .run(newDelivered, newStatus, orderNumber);

  console.log(`  ${orderNumber}: delivered ${order.delivered_glass_count || 0} -> ${newDelivered}, status: ${order.glass_order_status} -> ${newStatus}`);
}

// 4. Dopasuj items (match_status) z glass_order_items
console.log('\nDopasowywanie delivery items z order items:');
let matched = 0;
const deliveryItems = db.prepare('SELECT id, order_number, order_suffix, position, width_mm, height_mm, quantity FROM glass_delivery_items WHERE glass_delivery_id = ?').all(deliveryId);

for (const di of deliveryItems) {
  // Szukaj dopasowania w glass_order_items
  const orderItem = db.prepare(
    'SELECT id, glass_order_id FROM glass_order_items WHERE order_number = ? AND width_mm = ? AND height_mm = ? AND quantity = ?'
  ).get(di.order_number, di.width_mm, di.height_mm, di.quantity);

  if (orderItem) {
    db.prepare('UPDATE glass_delivery_items SET match_status = ?, matched_item_id = ?, glass_order_id = ? WHERE id = ?')
      .run('matched', orderItem.id, orderItem.glass_order_id, di.id);
    matched++;
  } else {
    db.prepare('UPDATE glass_delivery_items SET match_status = ? WHERE id = ?')
      .run('unmatched', di.id);
  }
}
console.log(`Dopasowano: ${matched}/${deliveryItems.length}`);

// 5. Utwórz file_import record
db.prepare(
  'INSERT INTO file_imports (filename, filepath, file_type, status, processed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
).run(
  '05270_01469.csv',
  '//192.168.1.6/Public/Markbud_import/dostawy_szyb/05270_01469.csv',
  'glass_delivery',
  'completed',
  now,
  now,
  now
);

// 6. Weryfikacja końcowa
console.log('\n=== WERYFIKACJA ===');
const targetOrders = ['53761','53828','53938','53952','53953','54003','53954','53977'];
for (const on of targetOrders) {
  const o = db.prepare('SELECT order_number, total_glasses, ordered_glass_count, delivered_glass_count, glass_order_status FROM orders WHERE order_number = ?').get(on);
  if (o) {
    console.log(`  ${o.order_number}: total=${o.total_glasses}, ordered=${o.ordered_glass_count}, delivered=${o.delivered_glass_count}, status=${o.glass_order_status}`);
  }
}

db.close();
console.log('\nGotowe!');
