const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/Krzysztof/Desktop/AKROBUD/apps/api/prisma/dev.db' } } });

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderNumber: '53444-a' },
    include: {
      requirements: {
        include: {
          profile: true,
          color: true,
        }
      },
      windows: true,
    }
  });

  if (!order) {
    console.log('Zlecenie 53444-a NIE ZNALEZIONE!');
    return;
  }

  console.log('=== ZLECENIE 53444-a ===');
  console.log('Client:', order.client);
  console.log('System:', order.system);
  console.log('Status:', order.status);
  console.log('Deadline:', order.deadline);
  console.log('');
  console.log('--- WARTOSCI ---');
  console.log('valuePln (grosze):', order.valuePln, '=> PLN:', order.valuePln ? (order.valuePln / 100).toFixed(2) : 'BRAK');
  console.log('valueEur (grosze):', order.valueEur, '=> EUR:', order.valueEur ? (order.valueEur / 100).toFixed(2) : 'BRAK');
  console.log('windowsNetValue:', order.windowsNetValue, '=> PLN:', order.windowsNetValue ? (order.windowsNetValue / 100).toFixed(2) : 'BRAK');
  console.log('windowsMaterial:', order.windowsMaterial, '=> PLN:', order.windowsMaterial ? (order.windowsMaterial / 100).toFixed(2) : 'BRAK');
  console.log('assemblyValue:', order.assemblyValue);
  console.log('extrasValue:', order.extrasValue);
  console.log('otherValue:', order.otherValue);
  console.log('priceInheritedFromOrder:', order.priceInheritedFromOrder);
  console.log('');
  console.log('--- OKNA ---');
  console.log('totalWindows:', order.totalWindows);
  console.log('totalUnits:', order.totalUnits);
  console.log('totalSashes:', order.totalSashes);
  console.log('');
  console.log('--- REQUIREMENTS (profil/kolor) ---');
  console.log('Liczba requirements:', order.requirements.length);
  order.requirements.forEach(function(r, i) {
    console.log('  [' + i + '] profileId:', r.profileId, '| Profile:', r.profile ? r.profile.name : 'BRAK');
    console.log('       colorId:', r.colorId, '| Color:', r.color ? r.color.name : 'BRAK');
    console.log('       quantity:', r.quantity, '| unit:', r.unit);
  });
  console.log('');
  console.log('--- WINDOWS ---');
  console.log('Liczba windows:', order.windows.length);
  order.windows.forEach(function(w, i) {
    console.log('  [' + i + '] profileType:', w.profileType, '| width:', w.width, '| height:', w.height);
  });

  // Sprawdzmy tez zlecenie bazowe 53444 (bez "-a")
  console.log('');
  console.log('');
  const baseOrder = await prisma.order.findFirst({
    where: { orderNumber: '53444' },
    select: {
      orderNumber: true,
      client: true,
      valuePln: true,
      valueEur: true,
      windowsNetValue: true,
      windowsMaterial: true,
      system: true,
      status: true,
    }
  });

  if (baseOrder) {
    console.log('=== ZLECENIE BAZOWE 53444 ===');
    console.log('Client:', baseOrder.client);
    console.log('System:', baseOrder.system);
    console.log('valuePln:', baseOrder.valuePln, '=> PLN:', baseOrder.valuePln ? (baseOrder.valuePln / 100).toFixed(2) : 'BRAK');
    console.log('windowsNetValue:', baseOrder.windowsNetValue);
    console.log('windowsMaterial:', baseOrder.windowsMaterial);
  } else {
    console.log('Zlecenie bazowe 53444 NIE ZNALEZIONE');
  }
}

main().catch(console.error).finally(function() { return prisma.$disconnect(); });
