const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // Znajdź artykuły z zamiennikami
  const articlesWithReplacements = await prisma.okucArticle.findMany({
    where: {
      replacedByArticleId: { not: null }
    },
    select: {
      id: true,
      articleId: true,
      name: true,
      stocks: {
        select: {
          warehouseType: true,
          subWarehouse: true,
          currentQuantity: true
        }
      },
      replacedByArticle: {
        select: {
          id: true,
          articleId: true,
          stocks: {
            select: {
              warehouseType: true,
              subWarehouse: true,
              currentQuantity: true
            }
          }
        }
      }
    }
  });

  console.log('=== STANY MAGAZYNOWE - ARTYKUŁY WYGASZANE I ZAMIENNIKI ===\n');

  for (const art of articlesWithReplacements) {
    const repl = art.replacedByArticle;

    // Suma stanu starego artykułu
    const oldStock = art.stocks.reduce((sum, s) => sum + s.currentQuantity, 0);

    // Suma stanu zamiennika
    const newStock = repl ? repl.stocks.reduce((sum, s) => sum + s.currentQuantity, 0) : 0;

    // RW (completed demands) dla starego artykułu
    const oldRw = await prisma.okucDemand.aggregate({
      where: { articleId: art.id, status: 'completed' },
      _sum: { quantity: true }
    });

    const rw = oldRw._sum.quantity || 0;

    console.log(`📦 ${art.articleId} (wygaszany)`);
    console.log(`   Stan w bazie: ${oldStock} szt.`);
    console.log(`   RW (zużycie): ${rw} szt.`);

    if (oldStock < 0) {
      console.log(`   ⚠️ UJEMNY STAN!`);
    }

    if (repl) {
      // RW zamiennika
      const newRw = await prisma.okucDemand.aggregate({
        where: { articleId: repl.id, status: 'completed' },
        _sum: { quantity: true }
      });
      const replRw = newRw._sum.quantity || 0;
      console.log(`   → Zamiennik ${repl.articleId}: stan ${newStock}, RW ${replRw}`);
    }
    console.log('');
  }

  // Sprawdź artykuły z ujemnym stanem
  const negativeStocks = await prisma.okucStock.findMany({
    where: { currentQuantity: { lt: 0 } },
    select: {
      currentQuantity: true,
      warehouseType: true,
      article: { select: { articleId: true, name: true } }
    }
  });

  console.log('=== WSZYSTKIE ARTYKUŁY Z UJEMNYM STANEM ===');
  if (negativeStocks.length === 0) {
    console.log('Brak artykułów z ujemnym stanem w bazie');
  } else {
    negativeStocks.forEach(s => {
      console.log(`  ${s.article.articleId} (${s.warehouseType}): ${s.currentQuantity} szt.`);
    });
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
