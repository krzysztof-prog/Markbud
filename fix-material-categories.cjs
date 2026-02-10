/**
 * Skrypt naprawiający błędną kategoryzację materiałów w pod-zleceniach (-a, -b).
 *
 * Problem: Parser UzyteBeleParser używał `position > windowCount` do klasyfikacji,
 * co powodowało że materiały w pod-zleceniach (z pozycjami odziedziczonymi z zlecenia bazowego)
 * były błędnie klasyfikowane jako 'dodatki' zamiast 'okno'.
 *
 * Dotyczy: 53488-a, 53477-a, 53444-a
 */
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/Krzysztof/Desktop/AKROBUD/apps/api/prisma/dev.db' } } });

async function main() {
  // Lista pod-zleceń do naprawienia
  const suspectOrders = ['53488-a', '53477-a', '53444-a'];

  for (const orderNumber of suspectOrders) {
    const order = await prisma.order.findFirst({
      where: { orderNumber: orderNumber },
      include: {
        materials: {
          orderBy: { position: 'asc' },
        },
        windows: true,
      },
    });

    if (!order) {
      console.log('SKIP: ' + orderNumber + ' nie znalezione');
      continue;
    }

    // Policz niezerowe okna
    var nonZeroWindowCount = 0;
    order.windows.forEach(function(w) {
      if (w.widthMm > 0 || w.heightMm > 0) {
        nonZeroWindowCount++;
      }
    });

    // Wyznacz zbiór pozycji okien na bazie rankingu (tak jak nowy parser)
    var uniquePositions = [];
    var seenPositions = {};
    order.materials.forEach(function(m) {
      if (!seenPositions[m.position]) {
        seenPositions[m.position] = true;
        uniquePositions.push(m.position);
      }
    });
    uniquePositions.sort(function(a, b) { return a - b; });
    var windowPositionsList = uniquePositions.slice(0, nonZeroWindowCount);
    var windowPositions = {};
    windowPositionsList.forEach(function(p) { windowPositions[p] = true; });

    console.log('=== ' + orderNumber + ' ===');
    console.log('  Okna (niezerowe): ' + nonZeroWindowCount);
    console.log('  Unikalne pozycje materialow: ' + uniquePositions.join(', '));
    console.log('  Pozycje sklasyfikowane jako okno: ' + windowPositionsList.join(', '));

    // Przelicz sumy wg nowej kategoryzacji
    var windowsNetValue = 0;
    var windowsMaterial = 0;
    var assemblyValue = 0;
    var extrasValue = 0;
    var otherValue = 0;
    var materialsToUpdate = [];

    order.materials.forEach(function(mat) {
      // Przelicz kategorię
      var newCategory;

      // Sprawdź czy pozycja należy do okien
      var isWindowPosition = !!windowPositions[mat.position];

      if (!isWindowPosition) {
        newCategory = 'dodatki';
      } else {
        // Sprawdź czy to montaż
        var hasOnlyAssembly = mat.assemblyValueAfterDiscount > 0 &&
          mat.glazing === 0 &&
          mat.fittings === 0 &&
          mat.parts === 0 &&
          mat.material === 0;

        if (hasOnlyAssembly) {
          newCategory = 'montaz';
        } else if (mat.material === 0 && mat.netValue > 0) {
          newCategory = 'inne';
        } else {
          newCategory = 'okno';
        }
      }

      // Sprawdź czy kategoria się zmienia
      if (mat.category !== newCategory) {
        console.log('  ZMIANA pos=' + mat.position + ': ' + mat.category + ' -> ' + newCategory +
          ' (material=' + (mat.material / 100).toFixed(2) + ' PLN, totalNet=' + (mat.totalNet / 100).toFixed(2) + ' PLN)');
        materialsToUpdate.push({ id: mat.id, newCategory: newCategory });
      }

      // Oblicz sumy
      switch (newCategory) {
        case 'okno':
          windowsNetValue += mat.totalNet;
          windowsMaterial += mat.material;
          break;
        case 'montaz':
          assemblyValue += mat.totalNet;
          break;
        case 'dodatki':
          extrasValue += mat.totalNet;
          break;
        case 'inne':
          otherValue += mat.totalNet;
          break;
      }
    });

    if (materialsToUpdate.length === 0) {
      console.log('  Brak zmian potrzebnych');
      continue;
    }

    console.log('  ---');
    console.log('  STARE wartosci: windowsMaterial=' + (order.windowsMaterial ? (order.windowsMaterial / 100).toFixed(2) : 'NULL') +
      ' | extrasValue=' + (order.extrasValue ? (order.extrasValue / 100).toFixed(2) : 'NULL'));
    console.log('  NOWE  wartosci: windowsMaterial=' + (windowsMaterial > 0 ? (windowsMaterial / 100).toFixed(2) : 'NULL') +
      ' | extrasValue=' + (extrasValue > 0 ? (extrasValue / 100).toFixed(2) : 'NULL'));

    // Zastosuj zmiany w transakcji
    await prisma.$transaction(async function(tx) {
      // Zaktualizuj kategorie materiałów
      for (var i = 0; i < materialsToUpdate.length; i++) {
        var upd = materialsToUpdate[i];
        await tx.orderMaterial.update({
          where: { id: upd.id },
          data: { category: upd.newCategory },
        });
      }

      // Zaktualizuj sumy na zleceniu
      await tx.order.update({
        where: { id: order.id },
        data: {
          windowsNetValue: windowsNetValue > 0 ? windowsNetValue : null,
          windowsMaterial: windowsMaterial > 0 ? windowsMaterial : null,
          assemblyValue: assemblyValue > 0 ? assemblyValue : null,
          extrasValue: extrasValue > 0 ? extrasValue : null,
          otherValue: otherValue > 0 ? otherValue : null,
        },
      });
    });

    console.log('  NAPRAWIONE!');
    console.log('');
  }

  console.log('Gotowe.');
}

main().catch(console.error).finally(function() { return prisma.$disconnect(); });
