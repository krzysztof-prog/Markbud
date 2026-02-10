/**
 * Skrypt do przetworzenia plików zamówień szyb z folderu _pominiete
 *
 * Problem: Pliki trafiły do _pominiete bo były wcześniej zaimportowane,
 * potem zlecenia zostały usunięte, a nowe zlecenia nie podpięły się do starych importów.
 *
 * Co robi skrypt:
 * 1. Czyta wszystkie pliki .txt z folderu _pominiete
 * 2. Parsuje każdy plik (wyciąga numer zamówienia szyb, datę dostawy, pozycje)
 * 3. Tworzy GlassOrder + GlassOrderItems w bazie
 * 4. Aktualizuje Order.glassDeliveryDate dla pasujących zleceń
 * 5. Przenosi przetworzone pliki do _archiwum
 *
 * Tryb: DRY RUN (domyślnie) - nie zapisuje zmian
 * Uruchom z --apply aby zapisać zmiany
 *
 * Użycie:
 *   node scripts/process-skipped-glass-orders.cjs          # DRY RUN
 *   node scripts/process-skipped-glass-orders.cjs --apply  # Zapisz zmiany
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// Ścieżka do folderu _pominiete (DEV)
const SKIPPED_FOLDER = 'C:/DEV_DATA/zamowienia_szyb/_pominiete';
const ARCHIVE_FOLDER = 'C:/DEV_DATA/zamowienia_szyb/_archiwum';

/**
 * Wykrywa kodowanie pliku (UTF-8 lub Windows-1250)
 */
function detectEncoding(buffer) {
  const utf8Text = buffer.toString('utf-8');
  if (!/�/.test(utf8Text) && !/\uFFFD/.test(utf8Text)) {
    return 'utf-8';
  }
  return 'windows-1250';
}

/**
 * Parsuje polską datę w formacie DD.MM.YYYY lub D M YY
 */
function parsePolishDate(dateStr) {
  // Format DD.MM.YYYY
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    return new Date(
      parseInt(dotMatch[3]),
      parseInt(dotMatch[2]) - 1,
      parseInt(dotMatch[1])
    );
  }

  // Format D M YY (z "Dostawa na")
  const spaceMatch = dateStr.match(/(\d{1,2})\s+(\d{1,2})\s+(\d{2})/);
  if (spaceMatch) {
    return new Date(
      2000 + parseInt(spaceMatch[3]),
      parseInt(spaceMatch[2]) - 1,
      parseInt(spaceMatch[1])
    );
  }

  return null;
}

/**
 * Parsuje referencję zlecenia (np. "53479 poz.1" lub "53480-a poz.2")
 */
function parseOrderReference(reference) {
  const trimmed = reference.trim();
  const match = trimmed.match(/(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/);

  if (!match) {
    return null;
  }

  return {
    orderNumber: match[1],
    orderSuffix: match[2] || null,
    fullReference: trimmed,
  };
}

/**
 * Parsuje plik TXT z zamówieniem szyb
 */
function parseGlassOrderTxt(fileContent) {
  let content;

  if (Buffer.isBuffer(fileContent)) {
    const encoding = detectEncoding(fileContent);
    content = iconv.decode(fileContent, encoding);
  } else {
    content = fileContent;
  }

  const lines = content.split(/\r?\n/);

  // Parse header
  let orderDate = new Date();
  let glassOrderNumber = '';
  let supplier = 'NIEZNANY';

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // Data i godzina
    const dateMatch = line.match(/Data\s+(\d{1,2}\.\d{1,2}\.\d{4})/i);
    if (dateMatch) {
      orderDate = parsePolishDate(dateMatch[1]) || orderDate;
    }

    // Numer zamówienia
    const numberMatch = line.match(/Numer\s+(.+)/i);
    if (numberMatch) {
      glassOrderNumber = numberMatch[1].trim();
    }

    // Dostawca
    if (/PILKINGTON|GUARDIAN|SAINT.?GOBAIN/i.test(line)) {
      supplier = line.trim().toUpperCase();
    }
  }

  if (!glassOrderNumber) {
    return null;
  }

  // Find table start
  const tableStartIndex = lines.findIndex((line) =>
    line.includes('Symbol') && line.includes('Ilość') && line.includes('Zlecenie')
  );

  if (tableStartIndex === -1) {
    return null;
  }

  // Parse items
  const items = [];

  for (let i = tableStartIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || /^\s*[A-ZŻŹĆĄĘŁÓŚŃ]\.[A-Za-zżźćąęłóśń]/.test(line)) {
      continue;
    }

    if (/Dostawa na/i.test(line)) {
      continue;
    }

    const parts = line.split(/\s{2,}|\t/).filter(Boolean);

    if (parts.length < 6) continue;

    try {
      const glassType = parts[0];
      const quantity = parseInt(parts[1]);
      const widthMm = parseInt(parts[2]);
      const heightMm = parseInt(parts[3]);
      const position = parts[4];
      const orderRef = parts.slice(5).join(' ');

      if (isNaN(quantity) || isNaN(widthMm) || isNaN(heightMm)) {
        continue;
      }

      const parsed = parseOrderReference(orderRef);
      if (!parsed) continue;

      items.push({
        glassType,
        quantity,
        widthMm,
        heightMm,
        position,
        orderNumber: parsed.orderNumber,
        orderSuffix: parsed.orderSuffix,
        fullReference: parsed.fullReference,
      });
    } catch (error) {
      // Skip invalid lines
    }
  }

  // Parse footer (orderedBy, expectedDeliveryDate)
  let orderedBy = '';
  let expectedDeliveryDate = null;

  for (let i = tableStartIndex + items.length; i < lines.length; i++) {
    const line = lines[i];

    const nameMatch = line.match(/^\s*([A-ZŻŹĆĄĘŁÓŚŃ]\.[A-Za-zżźćąęłóśń]+)/);
    if (nameMatch) {
      orderedBy = nameMatch[1];
    }

    const deliveryMatch = line.match(/Dostawa\s+na\s+(\d{1,2}\s+\d{1,2}\s+\d{2})/i);
    if (deliveryMatch) {
      expectedDeliveryDate = parsePolishDate(deliveryMatch[1]);
    }
  }

  return {
    metadata: {
      orderDate,
      glassOrderNumber,
      supplier,
      orderedBy,
      expectedDeliveryDate,
    },
    items,
  };
}

/**
 * Przenosi plik do archiwum
 */
async function moveToArchive(filePath) {
  const filename = path.basename(filePath);
  const archivePath = path.join(ARCHIVE_FOLDER, filename);

  // Utwórz folder archiwum jeśli nie istnieje
  if (!fs.existsSync(ARCHIVE_FOLDER)) {
    fs.mkdirSync(ARCHIVE_FOLDER, { recursive: true });
  }

  fs.renameSync(filePath, archivePath);
  return archivePath;
}

async function main() {
  console.log(APPLY ? '=== TRYB ZAPISU (--apply) ===' : '=== DRY RUN (bez --apply nie zapisuje) ===');
  console.log('');
  console.log(`Folder źródłowy: ${SKIPPED_FOLDER}`);
  console.log(`Folder archiwum: ${ARCHIVE_FOLDER}`);
  console.log('');

  // Sprawdź czy folder istnieje
  if (!fs.existsSync(SKIPPED_FOLDER)) {
    console.error(`❌ Folder nie istnieje: ${SKIPPED_FOLDER}`);
    process.exit(1);
  }

  // Pobierz listę plików TXT
  const files = fs.readdirSync(SKIPPED_FOLDER)
    .filter(f => f.toLowerCase().endsWith('.txt'))
    .map(f => path.join(SKIPPED_FOLDER, f));

  console.log(`Znaleziono ${files.length} plików TXT do przetworzenia.`);
  console.log('');

  const results = {
    processed: [],
    skipped: [],
    errors: [],
    ordersUpdated: new Set(),
  };

  for (const filePath of files) {
    const filename = path.basename(filePath);
    console.log(`\n📄 Przetwarzanie: ${filename}`);

    try {
      // Wczytaj i sparsuj plik
      const buffer = fs.readFileSync(filePath);
      const parsed = parseGlassOrderTxt(buffer);

      if (!parsed) {
        console.log(`   ⚠️ Nie udało się sparsować pliku`);
        results.errors.push({ filename, error: 'Parse failed' });
        continue;
      }

      const { metadata, items } = parsed;
      console.log(`   📋 Numer zamówienia szyb: ${metadata.glassOrderNumber}`);
      console.log(`   📅 Data zamówienia: ${metadata.orderDate.toLocaleDateString('pl-PL')}`);
      console.log(`   📅 Data dostawy: ${metadata.expectedDeliveryDate?.toLocaleDateString('pl-PL') || 'BRAK'}`);
      console.log(`   🏭 Dostawca: ${metadata.supplier}`);
      console.log(`   📦 Pozycje: ${items.length}`);

      if (items.length === 0) {
        console.log(`   ⚠️ Brak pozycji do importu`);
        results.skipped.push({ filename, reason: 'No items' });
        continue;
      }

      // Zbierz unikalne numery zleceń
      const orderNumbers = [...new Set(items.map(i => i.orderNumber))];
      console.log(`   🔗 Zlecenia: ${orderNumbers.join(', ')}`);

      // Sprawdź czy GlassOrder już istnieje
      const existingGlassOrder = await prisma.glassOrder.findUnique({
        where: { glassOrderNumber: metadata.glassOrderNumber },
      });

      if (existingGlassOrder && !existingGlassOrder.deletedAt) {
        console.log(`   ⏭️ GlassOrder już istnieje (ID: ${existingGlassOrder.id}) - pomijam`);
        results.skipped.push({ filename, reason: 'GlassOrder exists', glassOrderNumber: metadata.glassOrderNumber });
        continue;
      }

      // Sprawdź które zlecenia istnieją w bazie
      const existingOrders = await prisma.order.findMany({
        where: { orderNumber: { in: orderNumbers } },
        select: { orderNumber: true, glassDeliveryDate: true },
      });
      const existingOrderNumbers = new Set(existingOrders.map(o => o.orderNumber));

      const matchedOrders = orderNumbers.filter(on => existingOrderNumbers.has(on));
      const missingOrders = orderNumbers.filter(on => !existingOrderNumbers.has(on));

      console.log(`   ✅ Pasujące zlecenia: ${matchedOrders.length} (${matchedOrders.join(', ') || 'brak'})`);
      if (missingOrders.length > 0) {
        console.log(`   ⚠️ Brak w bazie: ${missingOrders.length} (${missingOrders.join(', ')})`);
      }

      // Policz ilości per zlecenie
      const quantityByOrder = new Map();
      for (const item of items) {
        const current = quantityByOrder.get(item.orderNumber) || 0;
        quantityByOrder.set(item.orderNumber, current + item.quantity);
      }

      if (APPLY) {
        // Jeśli istnieje soft-deleted GlassOrder, usuń go całkowicie
        if (existingGlassOrder && existingGlassOrder.deletedAt) {
          console.log(`   🗑️ Usuwam soft-deleted GlassOrder (ID: ${existingGlassOrder.id})`);
          await prisma.glassOrderItem.deleteMany({ where: { glassOrderId: existingGlassOrder.id } });
          await prisma.glassOrderValidation.deleteMany({ where: { glassOrderId: existingGlassOrder.id } });
          await prisma.glassOrder.delete({ where: { id: existingGlassOrder.id } });
        }

        // Utwórz GlassOrder z items w transakcji
        const glassOrder = await prisma.$transaction(async (tx) => {
          // Utwórz GlassOrder
          const created = await tx.glassOrder.create({
            data: {
              glassOrderNumber: metadata.glassOrderNumber,
              orderDate: metadata.orderDate,
              supplier: metadata.supplier,
              orderedBy: metadata.orderedBy || null,
              expectedDeliveryDate: metadata.expectedDeliveryDate,
              status: 'ordered',
              items: {
                create: items.map((item) => ({
                  orderNumber: item.orderNumber,
                  orderSuffix: item.orderSuffix || null,
                  position: item.position,
                  glassType: item.glassType,
                  widthMm: item.widthMm,
                  heightMm: item.heightMm,
                  quantity: item.quantity,
                })),
              },
            },
            include: { items: true },
          });

          // Aktualizuj zlecenia produkcyjne
          for (const [orderNumber, quantity] of quantityByOrder) {
            if (existingOrderNumbers.has(orderNumber)) {
              const updateData = {
                orderedGlassCount: { increment: quantity },
                glassOrderStatus: 'ordered',
              };

              // Ustaw datę dostawy szyb tylko jeśli mamy ją w pliku
              if (metadata.expectedDeliveryDate) {
                updateData.glassDeliveryDate = metadata.expectedDeliveryDate;
              }

              await tx.order.update({
                where: { orderNumber },
                data: updateData,
              });

              results.ordersUpdated.add(orderNumber);
            } else {
              // Utwórz warning dla brakującego zlecenia
              await tx.glassOrderValidation.create({
                data: {
                  glassOrderId: created.id,
                  orderNumber,
                  validationType: 'missing_production_order',
                  severity: 'warning',
                  orderedQuantity: quantity,
                  message: `Nie znaleziono zlecenia produkcyjnego ${orderNumber}`,
                },
              });
            }
          }

          return created;
        }, {
          timeout: 60000,
          maxWait: 10000,
        });

        console.log(`   ✅ Utworzono GlassOrder (ID: ${glassOrder.id}) z ${glassOrder.items.length} pozycjami`);

        // Przenieś plik do archiwum
        const archivePath = await moveToArchive(filePath);
        console.log(`   📁 Przeniesiono do: ${path.basename(archivePath)}`);

        results.processed.push({
          filename,
          glassOrderNumber: metadata.glassOrderNumber,
          glassOrderId: glassOrder.id,
          itemsCount: items.length,
          matchedOrders: matchedOrders.length,
          missingOrders: missingOrders.length,
        });
      } else {
        // DRY RUN - tylko raportuj
        results.processed.push({
          filename,
          glassOrderNumber: metadata.glassOrderNumber,
          itemsCount: items.length,
          matchedOrders: matchedOrders.length,
          missingOrders: missingOrders.length,
          deliveryDate: metadata.expectedDeliveryDate?.toLocaleDateString('pl-PL'),
        });
      }
    } catch (error) {
      console.log(`   ❌ Błąd: ${error.message}`);
      results.errors.push({ filename, error: error.message });
    }
  }

  // Podsumowanie
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                        PODSUMOWANIE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`✅ Przetworzono pomyślnie: ${results.processed.length} plików`);
  console.log(`⏭️ Pominięto: ${results.skipped.length} plików`);
  console.log(`❌ Błędy: ${results.errors.length} plików`);
  console.log(`🔗 Zaktualizowano zleceń: ${results.ordersUpdated.size}`);
  console.log('');

  if (results.processed.length > 0) {
    console.log('Przetworzone pliki:');
    console.table(results.processed.map(p => ({
      'Plik': p.filename.substring(0, 30),
      'Nr zamówienia': p.glassOrderNumber,
      'Pozycje': p.itemsCount,
      'Pasujące': p.matchedOrders,
      'Brak': p.missingOrders,
      'Data dostawy': p.deliveryDate || '-',
    })));
  }

  if (results.skipped.length > 0) {
    console.log('\nPominięte pliki:');
    console.table(results.skipped.map(s => ({
      'Plik': s.filename.substring(0, 30),
      'Powód': s.reason,
      'Nr zamówienia': s.glassOrderNumber || '-',
    })));
  }

  if (results.errors.length > 0) {
    console.log('\nPliki z błędami:');
    console.table(results.errors.map(e => ({
      'Plik': e.filename.substring(0, 30),
      'Błąd': e.error.substring(0, 50),
    })));
  }

  if (!APPLY && results.processed.length > 0) {
    console.log('\n');
    console.log('⚠️  DRY RUN - nic nie zapisano.');
    console.log('    Uruchom z flagą --apply aby zapisać zmiany:');
    console.log('    node scripts/process-skipped-glass-orders.cjs --apply');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('BŁĄD KRYTYCZNY:', e);
  await prisma.$disconnect();
  process.exit(1);
});