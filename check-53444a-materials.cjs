const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/Krzysztof/Desktop/AKROBUD/apps/api/prisma/dev.db' } } });

async function main() {
  // Zlecenie 53444-a
  const order = await prisma.order.findFirst({
    where: { orderNumber: '53444-a' },
    select: {
      id: true,
      orderNumber: true,
      windowsMaterial: true,
      windowsNetValue: true,
      assemblyValue: true,
      extrasValue: true,
      otherValue: true,
      valuePln: true,
      valueEur: true,
      materials: true,
    }
  });

  if (!order) {
    console.log('Nie znaleziono 53444-a');
    return;
  }

  console.log('=== ZLECENIE 53444-a (id: ' + order.id + ') ===');
  console.log('valuePln:', order.valuePln);
  console.log('valueEur:', order.valueEur);
  console.log('windowsMaterial:', order.windowsMaterial, order.windowsMaterial ? '=> ' + (order.windowsMaterial/100).toFixed(2) + ' PLN' : '');
  console.log('windowsNetValue:', order.windowsNetValue, order.windowsNetValue ? '=> ' + (order.windowsNetValue/100).toFixed(2) + ' PLN' : '');
  console.log('assemblyValue:', order.assemblyValue, order.assemblyValue ? '=> ' + (order.assemblyValue/100).toFixed(2) + ' PLN' : '');
  console.log('extrasValue:', order.extrasValue, order.extrasValue ? '=> ' + (order.extrasValue/100).toFixed(2) + ' PLN' : '');
  console.log('otherValue:', order.otherValue, order.otherValue ? '=> ' + (order.otherValue/100).toFixed(2) + ' PLN' : '');
  console.log('');
  console.log('--- MATERIALS (OrderMaterial) ---');
  console.log('Liczba:', order.materials.length);
  order.materials.forEach(function(m, i) {
    console.log('  [' + i + '] category: ' + m.category + ' | name: ' + m.name + ' | totalNet: ' + m.totalNet + ' | material: ' + m.material + ' | glassQty: ' + m.glassQuantity);
  });

  // Zlecenie bazowe 53444
  console.log('');
  console.log('');
  const base = await prisma.order.findFirst({
    where: { orderNumber: '53444' },
    select: {
      id: true,
      orderNumber: true,
      windowsMaterial: true,
      windowsNetValue: true,
      assemblyValue: true,
      extrasValue: true,
      otherValue: true,
      valuePln: true,
      valueEur: true,
      materials: true,
    }
  });

  if (!base) {
    console.log('Nie znaleziono 53444');
    return;
  }

  console.log('=== ZLECENIE BAZOWE 53444 (id: ' + base.id + ') ===');
  console.log('valuePln:', base.valuePln);
  console.log('valueEur:', base.valueEur);
  console.log('windowsMaterial:', base.windowsMaterial, base.windowsMaterial ? '=> ' + (base.windowsMaterial/100).toFixed(2) + ' PLN' : '');
  console.log('windowsNetValue:', base.windowsNetValue, base.windowsNetValue ? '=> ' + (base.windowsNetValue/100).toFixed(2) + ' PLN' : '');
  console.log('assemblyValue:', base.assemblyValue, base.assemblyValue ? '=> ' + (base.assemblyValue/100).toFixed(2) + ' PLN' : '');
  console.log('extrasValue:', base.extrasValue, base.extrasValue ? '=> ' + (base.extrasValue/100).toFixed(2) + ' PLN' : '');
  console.log('otherValue:', base.otherValue, base.otherValue ? '=> ' + (base.otherValue/100).toFixed(2) + ' PLN' : '');
  console.log('');
  console.log('--- MATERIALS (OrderMaterial) ---');
  console.log('Liczba:', base.materials.length);
  base.materials.forEach(function(m, i) {
    console.log('  [' + i + '] category: ' + m.category + ' | name: ' + m.name + ' | totalNet: ' + m.totalNet + ' | material: ' + m.material + ' | glassQty: ' + m.glassQuantity);
  });
}

main().catch(console.error).finally(function() { return prisma.$disconnect(); });
