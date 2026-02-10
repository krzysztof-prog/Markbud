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
          articleId: true
        }
      }
    }
  });

  console.log('=== STATUS DEMANDS DLA ARTYKUŁÓW Z ZAMIENNIKAMI ===\n');

  for (const oldArt of oldArticles) {
    const replacement = oldArt.replacedByArticle;

    // Demands na starym artykule
    const oldDemands = await prisma.okucDemand.groupBy({
      by: ['status'],
      where: { articleId: oldArt.id },
      _count: true,
      _sum: { quantity: true }
    });

    // Demands na zamienniku
    const newDemands = replacement ? await prisma.okucDemand.groupBy({
      by: ['status'],
      where: { articleId: replacement.id },
      _count: true,
      _sum: { quantity: true }
    }) : [];

    console.log(`📦 ${oldArt.articleId} (wygaszany) → ${replacement?.articleId || 'brak'} (zamiennik)`);

    console.log('   Stary artykuł:');
    if (oldDemands.length === 0) {
      console.log('     (brak demands)');
    } else {
      for (const d of oldDemands) {
        console.log(`     ${d.status}: ${d._count} demands, ${d._sum.quantity} szt.`);
      }
    }

    console.log('   Zamiennik:');
    if (newDemands.length === 0) {
      console.log('     (brak demands)');
    } else {
      for (const d of newDemands) {
        console.log(`     ${d.status}: ${d._count} demands, ${d._sum.quantity} szt.`);
      }
    }
    console.log('');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
