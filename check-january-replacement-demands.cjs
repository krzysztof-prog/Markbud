const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // Pobierz mapę zamienników: zamiennik_id -> stary_artykuł
  const oldArticles = await prisma.okucArticle.findMany({
    where: { replacedByArticleId: { not: null } },
    select: {
      id: true,
      articleId: true,
      replacedByArticleId: true,
      replacedByArticle: { select: { id: true, articleId: true } }
    }
  });

  // Mapa: replacementId -> oldArticle
  const replacementMap = new Map();
  for (const old of oldArticles) {
    if (old.replacedByArticle) {
      replacementMap.set(old.replacedByArticle.id, {
        oldId: old.id,
        oldArticleId: old.articleId,
        newArticleId: old.replacedByArticle.articleId
      });
    }
  }

  console.log('=== MAPA ZAMIENNIKÓW ===');
  for (const [newId, mapping] of replacementMap) {
    console.log(`  ${mapping.newArticleId} → ${mapping.oldArticleId}`);
  }
  console.log('');

  // Pobierz ukończone zlecenia ze stycznia 2026
  const januaryOrders = await prisma.order.findMany({
    where: {
      productionDate: {
        gte: new Date('2026-01-01'),
        lt: new Date('2026-02-01')
      },
      status: 'completed',
      archivedAt: null
    },
    select: { id: true, orderNumber: true }
  });

  console.log(`=== UKOŃCZONE ZLECENIA STYCZEŃ 2026: ${januaryOrders.length} ===\n`);

  const orderIds = januaryOrders.map(o => o.id);

  // Znajdź demands dla tych zleceń które używają zamienników
  const replacementIds = Array.from(replacementMap.keys());

  const demandsWithReplacements = await prisma.okucDemand.findMany({
    where: {
      orderId: { in: orderIds },
      articleId: { in: replacementIds }
    },
    select: {
      id: true,
      articleId: true,
      quantity: true,
      status: true,
      order: { select: { orderNumber: true } },
      article: { select: { articleId: true, name: true } }
    }
  });

  console.log(`=== DEMANDS UŻYWAJĄCE ZAMIENNIKÓW: ${demandsWithReplacements.length} ===\n`);

  if (demandsWithReplacements.length === 0) {
    console.log('Brak demands do przeniesienia.');
    return;
  }

  // Grupuj po artykule
  const byArticle = new Map();
  for (const d of demandsWithReplacements) {
    const key = d.article.articleId;
    if (!byArticle.has(key)) {
      byArticle.set(key, { count: 0, qty: 0, statuses: new Set(), mapping: replacementMap.get(d.articleId) });
    }
    const entry = byArticle.get(key);
    entry.count++;
    entry.qty += d.quantity;
    entry.statuses.add(d.status);
  }

  console.log('Podsumowanie:');
  for (const [artId, data] of byArticle) {
    console.log(`  ${artId} → ${data.mapping.oldArticleId}: ${data.count} demands, ${data.qty} szt., statuses: [${[...data.statuses].join(', ')}]`);
  }

  console.log('\n=== SZCZEGÓŁY (pierwsze 20) ===');
  demandsWithReplacements.slice(0, 20).forEach(d => {
    const mapping = replacementMap.get(d.articleId);
    console.log(`  Zlecenie ${d.order?.orderNumber}: ${d.article.articleId} → ${mapping.oldArticleId}, ${d.quantity} szt., status: ${d.status}`);
  });

  if (demandsWithReplacements.length > 20) {
    console.log(`  ... i ${demandsWithReplacements.length - 20} więcej`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
