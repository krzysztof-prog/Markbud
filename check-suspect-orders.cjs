const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/Krzysztof/Desktop/AKROBUD/apps/api/prisma/dev.db' } } });

async function main() {
  const suspects = ['53488-a', '53477-a', '53444-a'];

  for (const num of suspects) {
    const order = await prisma.order.findFirst({
      where: { orderNumber: num },
      select: {
        orderNumber: true,
        totalWindows: true,
        windowsMaterial: true,
        extrasValue: true,
        windows: { select: { position: true, widthMm: true, heightMm: true } },
        materials: {
          select: { position: true, category: true, glazing: true, fittings: true, parts: true, material: true, totalNet: true, glassQuantity: true },
          orderBy: { position: 'asc' },
        },
      }
    });

    if (!order) continue;

    console.log('=== ' + order.orderNumber + ' ===');
    console.log('totalWindows:', order.totalWindows);
    console.log('windowsMaterial:', order.windowsMaterial);
    console.log('extrasValue:', order.extrasValue);
    console.log('Windows (' + order.windows.length + '):');
    order.windows.forEach(function(w) {
      console.log('  pos=' + w.position + ' w=' + w.widthMm + ' h=' + w.heightMm);
    });
    console.log('Materials (' + order.materials.length + '):');
    order.materials.forEach(function(m) {
      console.log('  pos=' + m.position + ' cat=' + m.category +
        ' | gl=' + m.glazing + ' fit=' + m.fittings + ' parts=' + m.parts +
        ' | mat=' + m.material + ' totalNet=' + m.totalNet + ' glassQty=' + m.glassQuantity);
    });
    console.log('');
  }
}

main().catch(console.error).finally(function() { return prisma.$disconnect(); });
