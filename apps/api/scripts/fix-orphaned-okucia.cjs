/**
 * Script: Naprawia osierocone (orderId=null) rekordy okucDemand
 *
 * Problem: Po rozwiązaniu konfliktu replaceBase, okucia importowane
 * przed zmianą nazwy zlecenia mają orderId=null.
 *
 * Rozwiązanie:
 * 1. Usuwa osierocone okucDemand (orderId=null)
 * 2. Reimportuje z archiwalnych CSV dla zleceń które teraz istnieją
 * 3. Aktualizuje FileImport metadata
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const ARCHIVE_DIR = 'C:/DEV_DATA/okucia_zap/_archiwum';

async function main() {
  console.log('=== Naprawa osieroconych okucia ===\n');

  // 1. Policz osierocone rekordy
  const orphanedCount = await prisma.okucDemand.count({ where: { orderId: null } });
  console.log(`Osieroconych okucDemand (orderId=null): ${orphanedCount}\n`);

  // 2. Znajdź FileImport z orderId=null w metadata
  const allImports = await prisma.fileImport.findMany({
    where: { fileType: 'okuc_zapotrzebowanie', metadata: { contains: '"orderId":null' } },
    select: { id: true, filename: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`FileImport z orderId=null: ${allImports.length}\n`);

  // 3. Sprawdź które zlecenia teraz istnieją
  const fixable = [];
  const unfixable = [];

  for (const imp of allImports) {
    const meta = JSON.parse(imp.metadata || '{}');
    const orderNumber = meta.orderNumber;
    if (!orderNumber) { unfixable.push(imp); continue; }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, orderNumber: true }
    });

    if (order) {
      fixable.push({ imp, order, orderNumber });
    } else {
      unfixable.push(imp);
      console.log(`  BRAK ZLECENIA: ${imp.filename} -> ${orderNumber}`);
    }
  }

  console.log(`\nNaprawialnych: ${fixable.length}, Bez zlecenia: ${unfixable.length}\n`);

  // 4. Usuń WSZYSTKIE osierocone okucDemand
  console.log(`Usuwam ${orphanedCount} osieroconych okucDemand...`);
  const deleted = await prisma.okucDemand.deleteMany({ where: { orderId: null } });
  console.log(`Usunięto: ${deleted.count}\n`);

  // 5. Reimportuj z archiwum CSV
  let totalCreated = 0;
  let ordersFixed = 0;

  for (const { imp, order } of fixable) {
    // Sprawdź czy zlecenie już ma okucia (z innego importu)
    const existingCount = await prisma.okucDemand.count({ where: { orderId: order.id } });
    if (existingCount > 0) {
      console.log(`POMIJAM: ${imp.filename} -> ${order.orderNumber} (ma ${existingCount} okucia)`);
      // Aktualizuj metadata mimo to
      await updateImportMetadata(imp, order.id);
      continue;
    }

    // Znajdź plik CSV w archiwum
    const csvPath = path.join(ARCHIVE_DIR, imp.filename);

    if (!fs.existsSync(csvPath)) {
      console.log(`BRAK PLIKU: ${csvPath}`);
      continue;
    }

    // Parsuj CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim());
    const dataLines = lines.slice(1); // Pomijamy nagłówek

    if (dataLines.length === 0) {
      console.log(`PUSTY: ${imp.filename} (tylko nagłówek)`);
      await updateImportMetadata(imp, order.id);
      continue;
    }

    // Oblicz expectedWeek z daty importu
    const expectedWeek = getISOWeek(new Date(imp.createdAt));

    let created = 0;
    for (const line of dataLines) {
      const parts = line.split(';');
      if (parts.length < 3) continue;

      const articleNumber = parts[0].trim();
      const name = parts[1].trim();
      const quantity = parseInt(parts[2].trim(), 10);

      if (!articleNumber || isNaN(quantity) || quantity <= 0) continue;

      // Znajdź lub utwórz artykuł
      let article = await prisma.okucArticle.findUnique({
        where: { articleId: articleNumber }
      });

      if (!article) {
        const alias = await prisma.okucArticleAlias.findUnique({
          where: { aliasNumber: articleNumber },
          include: { article: true }
        });

        if (alias) {
          article = alias.article;
        } else {
          article = await prisma.okucArticle.create({
            data: { articleId: articleNumber, name: name }
          });
          console.log(`  Nowy artykuł: ${articleNumber} - ${name}`);
        }
      }

      await prisma.okucDemand.create({
        data: {
          articleId: article.id,
          orderId: order.id,
          expectedWeek: expectedWeek,
          quantity: quantity,
          status: 'pending',
          source: 'csv_import',
        }
      });
      created++;
    }

    // Aktualizuj metadata
    await updateImportMetadata(imp, order.id);

    // Aktualizuj status okucia na zleceniu
    await prisma.order.update({
      where: { id: order.id },
      data: { okucDemandStatus: 'imported' }
    });

    console.log(`OK: ${imp.filename} -> ${order.orderNumber} (id:${order.id}): ${created} okucia`);
    totalCreated += created;
    ordersFixed++;
  }

  // 6. Podsumowanie
  const finalOrphaned = await prisma.okucDemand.count({ where: { orderId: null } });
  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Usunięto osieroconych: ${deleted.count}`);
  console.log(`Zlecenia naprawione: ${ordersFixed}`);
  console.log(`Nowych okucDemand: ${totalCreated}`);
  console.log(`Pozostałe osierocone: ${finalOrphaned}`);
}

async function updateImportMetadata(imp, orderId) {
  const oldMeta = JSON.parse(imp.metadata || '{}');
  oldMeta.orderId = orderId;
  oldMeta.orderExists = true;
  oldMeta.fixedAt = new Date().toISOString();
  oldMeta.fixReason = 'orphaned-okucia-fix-script';

  await prisma.fileImport.update({
    where: { id: imp.id },
    data: { metadata: JSON.stringify(oldMeta) }
  });
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

main()
  .catch(e => {
    console.error('BŁĄD:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
