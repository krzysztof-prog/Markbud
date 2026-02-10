const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // 9 zleceń z 26-27 stycznia (bez 53427-b które było osobną naprawą)
  const orderNumbers = ['53822', '53852', '53853', '53854', '53855', '53856', '53857', '53860', '53874'];

  // Pobierz wszystkie demands (completed) z tych zleceń
  const demands = await prisma.okucDemand.findMany({
    where: {
      status: 'completed',
      order: {
        orderNumber: { in: orderNumbers }
      }
    },
    select: {
      quantity: true,
      article: { select: { articleId: true, name: true } },
      order: { select: { orderNumber: true } }
    }
  });

  console.log('=== SUMARYCZNE ILOŚCI OKUĆ Z 9 ZLECEŃ ===');
  console.log('Zlecenia: ' + orderNumbers.join(', '));
  console.log('');

  // Grupuj po artykule
  const byArticle = new Map();
  for (const d of demands) {
    const key = d.article.articleId;
    if (!byArticle.has(key)) {
      byArticle.set(key, { articleId: key, name: d.article.name, quantity: 0 });
    }
    byArticle.get(key).quantity += d.quantity;
  }

  // Sortuj po articleId
  const sorted = Array.from(byArticle.values()).sort((a, b) => a.articleId.localeCompare(b.articleId));

  let totalItems = 0;
  for (const art of sorted) {
    console.log(`${art.articleId}: ${art.quantity} szt.`);
    totalItems += art.quantity;
  }

  console.log('');
  console.log('=== PODSUMOWANIE ===');
  console.log(`Pozycji (artykułów): ${sorted.length}`);
  console.log(`Suma sztuk: ${totalItems}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
