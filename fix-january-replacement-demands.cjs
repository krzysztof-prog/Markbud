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

  const orderIds = januaryOrders.map(o => o.id);
  const replacementIds = Array.from(replacementMap.keys());

  // Znajdź demands do naprawienia
  const demandsToFix = await prisma.okucDemand.findMany({
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
      article: { select: { articleId: true } }
    }
  });

  console.log(`=== NAPRAWIANIE ${demandsToFix.length} DEMANDS ===\n`);

  let totalFixed = 0;

  // Grupuj po zamienniku i napraw
  for (const [replacementId, mapping] of replacementMap) {
    const demandsForArticle = demandsToFix.filter(d => d.articleId === replacementId);

    if (demandsForArticle.length === 0) continue;

    const demandIds = demandsForArticle.map(d => d.id);
    const totalQty = demandsForArticle.reduce((sum, d) => sum + d.quantity, 0);

    // Przenieś na stary artykuł i oznacz jako completed
    const result = await prisma.okucDemand.updateMany({
      where: { id: { in: demandIds } },
      data: {
        articleId: mapping.oldId,
        status: 'completed',
        updatedAt: new Date()
      }
    });

    console.log(`✅ ${mapping.newArticleId} → ${mapping.oldArticleId}: ${result.count} demands, ${totalQty} szt.`);
    totalFixed += result.count;
  }

  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Naprawiono: ${totalFixed} demands`);
  console.log(`- Przeniesiono z zamienników na stare artykuły`);
  console.log(`- Oznaczono jako completed (zlecenia są ukończone)`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
