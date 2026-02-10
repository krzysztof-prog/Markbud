const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // Znajdź artykuły wygaszane (mające zamiennik)
  const oldArticles = await prisma.okucArticle.findMany({
    where: {
      replacedByArticleId: { not: null }
    },
    select: {
      id: true,
      articleId: true,
      name: true,
      replacedByArticleId: true,
      replacedByArticle: {
        select: {
          id: true,
          articleId: true,
          name: true
        }
      }
    }
  });

  console.log('=== ARTYKUŁY WYGASZANE Z ZAMIENNIKAMI ===');
  console.log('Znaleziono:', oldArticles.length);
  console.log('');

  let totalTransferred = 0;

  for (const oldArt of oldArticles) {
    const replacement = oldArt.replacedByArticle;
    if (!replacement) continue;

    // Znajdź completed demands które używają zamiennika
    const demandsToTransfer = await prisma.okucDemand.findMany({
      where: {
        articleId: replacement.id,
        status: 'completed'
      },
      select: {
        id: true,
        quantity: true,
        orderId: true
      }
    });

    if (demandsToTransfer.length === 0) {
      console.log(`${oldArt.articleId} ← ${replacement.articleId}: brak RW do przeniesienia`);
      continue;
    }

    // Przenieś demands na stary artykuł
    const demandIds = demandsToTransfer.map(d => d.id);
    const totalQty = demandsToTransfer.reduce((sum, d) => sum + d.quantity, 0);

    const result = await prisma.okucDemand.updateMany({
      where: { id: { in: demandIds } },
      data: { articleId: oldArt.id }
    });

    console.log(`${oldArt.articleId} ← ${replacement.articleId}: przeniesiono ${result.count} demands (${totalQty} szt.)`);
    totalTransferred += result.count;
  }

  console.log('');
  console.log('=== PODSUMOWANIE ===');
  console.log('Łącznie przeniesiono:', totalTransferred, 'demands');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
