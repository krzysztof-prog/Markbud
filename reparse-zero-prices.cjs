/**
 * Re-parse PDFs that have value_netto = 0 in pending_order_prices
 * Uses the current (fixed) parser to extract prices from archived PDFs
 *
 * Usage:
 *   node reparse-zero-prices.cjs --dry-run    # preview only
 *   node reparse-zero-prices.cjs              # apply changes
 */
const Database = require('./apps/api/node_modules/better-sqlite3');
const pdf = require('./apps/api/node_modules/pdf-parse');
const fs = require('fs');
const path = require('path');

const db = new Database('./apps/api/prisma/dev.db');
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
  console.log('=== DRY RUN MODE ===\n');
}

const ARCHIVE_DIR = 'C:\\DEV_DATA\\ceny\\_archiwum';

// ============================================================
// PRICE EXTRACTION (copy of current pdf-parser.ts logic)
// ============================================================

function parseNumber(str) {
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function extractSumaNetto(text) {
  // Wzorzec 1: Wiersz "Towar" - format PLN
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (towarMatch) return parseNumber(towarMatch[1]);

  // Wzorzec 2: Format EUR z Podsumowania - "1 399,74\n1 138,00261,74\n23%"
  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  if (eurPodsumowanieMatch) return parseNumber(eurPodsumowanieMatch[2]);

  // Wzorzec 3: Format z EUR - "Suma    1 147,00    263,81    1 410,81"
  const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (sumaEurMatch) return parseNumber(sumaEurMatch[1]);

  // Wzorzec 4: "Suma netto"
  const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
  if (nettoMatch) return parseNumber(nettoMatch[1]);

  // Wzorzec 5: Sklejone wartości
  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  if (sklejoneMatch) return parseNumber(sklejoneMatch[2]);

  // Wzorzec 6: Trzy liczby w wierszu
  const tripleMatch = text.match(/([\d]+[,.]\d{2})\s+([\d]+[,.]\d{2})\s+([\d]+[,.]\d{2})/);
  if (tripleMatch) return parseNumber(tripleMatch[1]);

  return 0;
}

function extractSumaBrutto(text) {
  const towarMatch = text.match(/Towar\s*[\d\s]+[,.]\d{2}\s+[\d\s]+[,.]\d{2}\s*\n\s*([\d\s]+[,.]\d{2})/i);
  if (towarMatch) return parseNumber(towarMatch[1]);

  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  if (eurPodsumowanieMatch) return parseNumber(eurPodsumowanieMatch[1]);

  const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  if (sumaEurMatch) return parseNumber(sumaEurMatch[3]);

  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  if (sklejoneMatch) return parseNumber(sklejoneMatch[1]);

  const bruttoMatch = text.match(/brutto[:\s]*([\d\s,.]+)/i);
  if (bruttoMatch) return parseNumber(bruttoMatch[1]);

  return 0;
}

function extractOrderNumber(text) {
  // Strategia 1: Po "SUMA:"
  const sumaMatch = text.match(/SUMA:.*?(\d{5})/s);
  if (sumaMatch) return sumaMatch[1];

  // Strategia 2: 5 cyfr + ZAMÓWIENIE
  const beforeZamMatch = text.match(/(\d{5})\s*ZAMÓWIENIE/);
  if (beforeZamMatch) return beforeZamMatch[1];

  // Strategia 3-4: Standalone na osobnej linii
  const lines = text.split('\n');
  for (const line of lines.slice(0, 40)) {
    const match = line.match(/^\s*(\d{5})\s*$/);
    if (match) return match[1];
  }

  // Strategia 5: 5-cyfrowy numer z lookahead/lookbehind
  const allFiveDigit = text.match(/(?<!\d)(\d{5})(?!\d)/g);
  if (allFiveDigit) {
    for (const num of allFiveDigit) {
      const n = parseInt(num);
      if (n >= 40000 && n <= 99999) return num;
    }
  }

  return 'UNKNOWN';
}

function detectCurrency(text) {
  const isEur = text.includes('€') || text.includes('EUR');
  return isEur ? 'EUR' : 'PLN';
}

// ============================================================
// MAIN LOGIC
// ============================================================

async function main() {
  // CZĘŚĆ 1: Re-parse 44 pending prices z value_netto = 0
  console.log('=== CZĘŚĆ 1: RE-PARSE PENDING Z VALUE_NETTO = 0 ===\n');

  const zeroPrices = db.prepare(`
    SELECT id, order_number, currency, value_netto, value_brutto, filename, filepath, status
    FROM pending_order_prices
    WHERE value_netto = 0 OR value_netto IS NULL
  `).all();

  console.log(`Pending prices z value_netto = 0: ${zeroPrices.length}\n`);

  let reparsed = 0;
  let priceFound = 0;
  let priceApplied = 0;
  let fileNotFound = 0;

  for (const p of zeroPrices) {
    // Spróbuj znaleźć plik - najpierw oryginalna ścieżka, potem archiwum
    let filepath = p.filepath;
    if (!fs.existsSync(filepath)) {
      filepath = path.join(ARCHIVE_DIR, p.filename);
    }
    if (!fs.existsSync(filepath)) {
      // Szukaj z lekko inną nazwą (spacje itp.)
      const archiveFiles = fs.readdirSync(ARCHIVE_DIR);
      const normalizedFilename = p.filename.replace(/\s+/g, ' ').trim();
      const found = archiveFiles.find(f => f.replace(/\s+/g, ' ').trim() === normalizedFilename);
      if (found) {
        filepath = path.join(ARCHIVE_DIR, found);
      }
    }

    if (!fs.existsSync(filepath)) {
      fileNotFound++;
      continue;
    }

    try {
      const dataBuffer = fs.readFileSync(filepath);
      const data = await pdf(dataBuffer);
      const text = data.text;

      const valueNetto = extractSumaNetto(text);
      const valueBrutto = extractSumaBrutto(text);
      const currency = detectCurrency(text);
      const orderNumber = extractOrderNumber(text);

      reparsed++;

      if (valueNetto > 0) {
        const valueInCents = Math.round(valueNetto * 100);
        const bruttoInCents = valueBrutto > 0 ? Math.round(valueBrutto * 100) : null;

        priceFound++;
        const val = valueNetto.toFixed(2);
        console.log(`  #${p.id}: "${p.filename}" -> netto ${currency} ${val} (order: ${orderNumber})`);

        if (!DRY_RUN) {
          // Zaktualizuj pending_order_price z poprawną ceną
          db.prepare(`
            UPDATE pending_order_prices
            SET value_netto = ?, value_brutto = ?, currency = ?
            WHERE id = ?
          `).run(valueInCents, bruttoInCents, currency, p.id);

          // Jeśli numer zlecenia się zmienił (np. UNKNOWN -> konkretny)
          if (orderNumber !== 'UNKNOWN' && orderNumber !== p.order_number) {
            db.prepare(`UPDATE pending_order_prices SET order_number = ? WHERE id = ?`).run(orderNumber, p.id);
          }
        }

        // Spróbuj zastosować cenę do zlecenia
        const matchOrderNumber = (orderNumber !== 'UNKNOWN') ? orderNumber : p.order_number;
        if (matchOrderNumber && matchOrderNumber !== 'UNKNOWN') {
          // Szukaj dokładnego matcha lub prefix matcha
          let order = db.prepare('SELECT id, order_number, value_pln, value_eur FROM orders WHERE order_number = ?').get(matchOrderNumber);
          if (!order) {
            const prefixOrders = db.prepare("SELECT id, order_number, value_pln, value_eur FROM orders WHERE order_number LIKE ? || '%'").all(matchOrderNumber);
            if (prefixOrders.length === 1) order = prefixOrders[0];
          }

          if (order) {
            const priceField = currency === 'EUR' ? 'value_eur' : 'value_pln';
            const existingPrice = currency === 'EUR' ? order.value_eur : order.value_pln;

            if (!DRY_RUN) {
              db.prepare(`
                UPDATE pending_order_prices
                SET status = 'applied', applied_at = datetime('now'), applied_to_order_id = ?, order_number = ?
                WHERE id = ?
              `).run(order.id, order.order_number, p.id);
            }

            if (!existingPrice || existingPrice === 0) {
              if (!DRY_RUN) {
                db.prepare(`UPDATE orders SET ${priceField} = ? WHERE id = ?`).run(valueInCents, order.id);
              }
              console.log(`    -> APPLIED ${currency} ${val} to ${order.order_number} (id=${order.id})`);
              priceApplied++;
            } else {
              const existVal = (existingPrice / 100).toFixed(2);
              console.log(`    -> SKIP (${order.order_number} ma już ${currency} ${existVal})`);
            }
          } else {
            console.log(`    -> NO ORDER MATCH for ${matchOrderNumber}`);
          }
        }
      }
    } catch (e) {
      console.log(`  #${p.id}: ERROR parsing "${p.filename}": ${e.message}`);
    }
  }

  console.log(`\nCzęść 1 podsumowanie:`);
  console.log(`  Re-parsed: ${reparsed}`);
  console.log(`  Cena znaleziona: ${priceFound}`);
  console.log(`  Cena zastosowana do zleceń: ${priceApplied}`);
  console.log(`  Plik nie znaleziony: ${fileNotFound}`);

  // CZĘŚĆ 2: Szukaj PDFów w archiwum które NIGDY nie trafiły do systemu
  console.log('\n\n=== CZĘŚĆ 2: PDFy Z ARCHIWUM BEZ PENDING PRICE ===\n');

  const archiveFiles = fs.readdirSync(ARCHIVE_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  const existingFilenames = new Set(
    db.prepare('SELECT DISTINCT filename FROM pending_order_prices').all().map(r => r.filename)
  );

  // Sprawdź też file_imports
  const importedFilenames = new Set(
    db.prepare("SELECT DISTINCT filename FROM file_imports WHERE file_type = 'ceny_pdf'").all().map(r => r.filename)
  );

  let newPdfs = 0;
  let newPricesApplied = 0;

  // Zlecenia bez ceny
  const ordersWithoutPrice = db.prepare(`
    SELECT id, order_number, project, value_pln, value_eur FROM orders
    WHERE (value_pln IS NULL OR value_pln = 0) AND (value_eur IS NULL OR value_eur = 0) AND archived_at IS NULL
  `).all();

  const ordersByNumber = new Map();
  ordersWithoutPrice.forEach(o => ordersByNumber.set(o.order_number, o));

  // Mapuj bazowe numery (53614 -> 53614-a)
  const ordersByBase = new Map();
  ordersWithoutPrice.forEach(o => {
    const base = o.order_number.split('-')[0];
    if (!ordersByBase.has(base)) ordersByBase.set(base, []);
    ordersByBase.get(base).push(o);
  });

  for (const filename of archiveFiles) {
    // Normalizuj nazwę do porównania
    const normalizedFilename = filename.replace(/\s+/g, ' ').trim();
    const existsInPending = [...existingFilenames].some(ef =>
      ef.replace(/\s+/g, ' ').trim() === normalizedFilename
    );
    const existsInImports = [...importedFilenames].some(ef =>
      ef.replace(/\s+/g, ' ').trim() === normalizedFilename
    );

    if (existsInPending || existsInImports) continue;

    // Ten PDF nigdy nie był przetworzony!
    const filepath = path.join(ARCHIVE_DIR, filename);

    try {
      const dataBuffer = fs.readFileSync(filepath);
      const data = await pdf(dataBuffer);
      const text = data.text;

      const orderNumber = extractOrderNumber(text);
      const valueNetto = extractSumaNetto(text);
      const valueBrutto = extractSumaBrutto(text);
      const currency = detectCurrency(text);

      if (orderNumber === 'UNKNOWN' && valueNetto === 0) continue;

      newPdfs++;
      const val = valueNetto > 0 ? valueNetto.toFixed(2) : '0';
      console.log(`  "${filename}" -> order: ${orderNumber} | ${currency} ${val}`);

      // Sprawdź czy zlecenie istnieje i nie ma ceny
      let order = ordersByNumber.get(orderNumber);
      if (!order) {
        // Prefix match
        const candidates = ordersByBase.get(orderNumber);
        if (candidates && candidates.length === 1) order = candidates[0];
      }

      const valueInCents = Math.round(valueNetto * 100);
      const bruttoInCents = valueBrutto > 0 ? Math.round(valueBrutto * 100) : null;

      if (order && valueNetto > 0) {
        const priceField = currency === 'EUR' ? 'value_eur' : 'value_pln';

        if (!DRY_RUN) {
          // Stwórz pending price
          db.prepare(`
            INSERT INTO pending_order_prices (order_number, currency, value_netto, value_brutto, filename, filepath, status, applied_at, applied_to_order_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'applied', datetime('now'), ?, datetime('now'))
          `).run(order.order_number, currency, valueInCents, bruttoInCents, filename, filepath, order.id);

          // Ustaw cenę
          db.prepare(`UPDATE orders SET ${priceField} = ? WHERE id = ?`).run(valueInCents, order.id);
        }

        console.log(`    -> APPLIED ${currency} ${val} to ${order.order_number} (id=${order.id})`);
        newPricesApplied++;

        // Usuń z mapy żeby nie duplikować
        ordersByNumber.delete(order.order_number);
      } else if (valueNetto > 0 && orderNumber !== 'UNKNOWN') {
        // Zlecenie ma cenę lub nie istnieje - stwórz pending
        const existingOrder = db.prepare('SELECT id, value_pln, value_eur FROM orders WHERE order_number = ?').get(orderNumber) ||
          db.prepare("SELECT id, order_number, value_pln, value_eur FROM orders WHERE order_number LIKE ? || '%'").all(orderNumber);

        if (Array.isArray(existingOrder) && existingOrder.length === 0) {
          console.log(`    -> NO ORDER (stworzę pending)`);
          if (!DRY_RUN) {
            db.prepare(`
              INSERT INTO pending_order_prices (order_number, currency, value_netto, value_brutto, filename, filepath, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
            `).run(orderNumber, currency, valueInCents, bruttoInCents, filename, filepath);
          }
        }
      }
    } catch (e) {
      // Ignoruj błędy parsowania
    }
  }

  console.log(`\nCzęść 2 podsumowanie:`);
  console.log(`  Nowe PDFy znalezione: ${newPdfs}`);
  console.log(`  Nowe ceny zastosowane: ${newPricesApplied}`);

  // PODSUMOWANIE KOŃCOWE
  const finalOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE archived_at IS NULL").get();
  const finalWithPrice = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE archived_at IS NULL AND ((value_pln IS NOT NULL AND value_pln > 0) OR (value_eur IS NOT NULL AND value_eur > 0))").get();
  const finalPending = db.prepare("SELECT COUNT(*) as cnt FROM pending_order_prices WHERE status = 'pending'").get();

  console.log(`\n\n=== PODSUMOWANIE KOŃCOWE ===`);
  console.log(`Aktywne zlecenia: ${finalOrders.cnt}`);
  console.log(`Z ceną: ${finalWithPrice.cnt} (${((finalWithPrice.cnt / finalOrders.cnt) * 100).toFixed(1)}%)`);
  console.log(`Bez ceny: ${finalOrders.cnt - finalWithPrice.cnt}`);
  console.log(`Pending prices: ${finalPending.cnt}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Żadne zmiany nie zostały zapisane.');
  }

  db.close();
}

main().catch(e => {
  console.error('FATAL:', e);
  db.close();
});
