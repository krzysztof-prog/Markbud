const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/Krzysztof/Desktop/AKROBUD/apps/api/prisma/dev.db' } } });

async function main() {
  // 1. Sprawdź profil typowego "dodatki" - ile mają glazing/fittings/parts
  console.log('=== ANALIZA KATEGORII MATERIALOW ===');
  console.log('');

  // Prawdziwe "dodatki" (sprawdź ile mają szklenia/okucia/czesci)
  const realExtras = await prisma.orderMaterial.findMany({
    where: { category: 'dodatki' },
    select: {
      orderId: true,
      position: true,
      glazing: true,
      fittings: true,
      parts: true,
      material: true,
      totalNet: true,
      glassQuantity: true,
      order: { select: { orderNumber: true, totalWindows: true } },
    },
    take: 50,
  });

  console.log('--- DODATKI: ile maja glazing/fittings/parts > 0? ---');
  let extrasWithWindowData = 0;
  let extrasWithoutWindowData = 0;

  realExtras.forEach(function(m) {
    const hasWindowData = m.glazing > 0 || m.fittings > 0 || m.parts > 0;
    if (hasWindowData) extrasWithWindowData++;
    else extrasWithoutWindowData++;

    if (hasWindowData) {
      console.log(
        '  WITH window data: ' + m.order.orderNumber + ' pos=' + m.position +
        ' | windows=' + m.order.totalWindows +
        ' | glazing=' + m.glazing + ' fittings=' + m.fittings + ' parts=' + m.parts +
        ' | material=' + m.material + ' | totalNet=' + m.totalNet
      );
    }
  });

  console.log('');
  console.log('Dodatki Z danymi okna (glazing/fittings/parts>0): ' + extrasWithWindowData);
  console.log('Dodatki BEZ danych okna: ' + extrasWithoutWindowData);

  console.log('');
  console.log('');

  // 2. Sprawdź zlecenia z sufiksem ktore maja tylko "dodatki" a nie "okno"
  // (potencjalnie zle sklasyfikowane)
  const ordersWithSuffix = await prisma.order.findMany({
    where: {
      deletedAt: null,
      orderNumber: { contains: '-' },
    },
    select: {
      orderNumber: true,
      windowsMaterial: true,
      extrasValue: true,
      totalWindows: true,
      materials: {
        select: {
          position: true,
          category: true,
          glazing: true,
          fittings: true,
          parts: true,
          material: true,
          totalNet: true,
        }
      }
    }
  });

  console.log('--- ZLECENIA Z SUFIKSEM (-a, -b) BEZ windowsMaterial ---');
  let suspectCount = 0;
  ordersWithSuffix.forEach(function(o) {
    if (o.windowsMaterial === null || o.windowsMaterial === 0) {
      const extrasMaterials = o.materials.filter(function(m) { return m.category === 'dodatki'; });
      const misclassified = extrasMaterials.filter(function(m) {
        return (m.glazing > 0 || m.fittings > 0 || m.parts > 0) && m.material > 0;
      });

      if (misclassified.length > 0) {
        suspectCount++;
        console.log('  PODEJRZANE: ' + o.orderNumber + ' | totalWindows=' + o.totalWindows +
          ' | windowsMaterial=null | extras positions: ' +
          misclassified.map(function(m) { return 'pos=' + m.position + '(mat=' + (m.material/100).toFixed(2) + ')'; }).join(', ')
        );
      }
    }
  });

  console.log('');
  console.log('Znalezione podejrzane zlecenia: ' + suspectCount);
}

main().catch(console.error).finally(function() { return prisma.$disconnect(); });
