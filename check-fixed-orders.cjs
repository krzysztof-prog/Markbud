const path = require('path');
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const dbPath = path.resolve(__dirname, 'apps/api/prisma/dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

async function main() {
  // Znajdź demands które właśnie naprawiliśmy
  // (completed, updatedAt = dzisiaj, zlecenia styczniowe)

  const today = new Date();
  today.setHours(0,0,0,0);

  const recentlyFixedDemands = await prisma.okucDemand.findMany({
    where: {
      updatedAt: { gte: today },
      status: 'completed',
      order: {
        productionDate: {
          gte: new Date('2026-01-01'),
          lt: new Date('2026-02-01')
        },
        status: 'completed'
      }
    },
    select: {
      id: true,
      quantity: true,
      article: { select: { articleId: true } },
      order: { select: { orderNumber: true, productionDate: true } }
    },
    orderBy: { order: { orderNumber: 'asc' } }
  });

  console.log('=== ZLECENIA Z NAPRAWIONYMI DEMANDS ===');
  console.log('(Demands przeniesione z zamienników na stare artykuły dzisiaj)\n');

  // Grupuj po zleceniu
  const byOrder = new Map();
  for (const d of recentlyFixedDemands) {
    const key = d.order.orderNumber;
    if (!byOrder.has(key)) {
      byOrder.set(key, { orderNumber: key, productionDate: d.order.productionDate, demands: [] });
    }
    byOrder.get(key).demands.push({ articleId: d.article.articleId, quantity: d.quantity });
  }

  for (const [orderNum, data] of byOrder) {
    const prodDate = new Date(data.productionDate).toISOString().slice(0,10);
    console.log(`Zlecenie ${orderNum} (prod: ${prodDate})`);
    for (const dem of data.demands) {
      console.log(`  - ${dem.articleId}: ${dem.quantity} szt.`);
    }
  }

  console.log(`\nŁącznie zleceń: ${byOrder.size}`);
  console.log(`Łącznie demands: ${recentlyFixedDemands.length}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
