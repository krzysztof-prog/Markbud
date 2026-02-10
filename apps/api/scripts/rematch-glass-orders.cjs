/**
 * Jednorazowy skrypt: dopasowanie szyb do zleceń
 *
 * Problem: szyby zaimportowane PRZED zleceniami nie zostały dopasowane.
 * Ten skrypt znajduje osierocone walidacje 'missing_production_order'
 * i dopasowuje je do zleceń które już istnieją w bazie.
 *
 * Użycie: node apps/api/scripts/rematch-glass-orders.cjs
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, '..', 'prisma', 'dev.db')}`,
    },
  },
});

async function rematchGlassOrders() {
  console.log('=== Re-matching szyb do zleceń ===\n');

  // 1. Znajdź wszystkie nierozwiązane walidacje 'missing_production_order'
  const unresolvedValidations = await prisma.glassOrderValidation.findMany({
    where: {
      validationType: 'missing_production_order',
      resolved: false,
    },
    include: {
      glassOrder: {
        select: {
          id: true,
          glassOrderNumber: true,
          expectedDeliveryDate: true,
          deletedAt: true,
        },
      },
    },
  });

  console.log(`Znaleziono ${unresolvedValidations.length} nierozwiązanych walidacji 'missing_production_order'\n`);

  if (unresolvedValidations.length === 0) {
    console.log('Brak walidacji do naprawienia. Wszystko jest dopasowane.');
    return;
  }

  // 2. Zbierz unikalne numery zleceń
  const orderNumbers = [...new Set(unresolvedValidations.map(v => v.orderNumber))];
  console.log(`Unikalne numery zleceń do sprawdzenia: ${orderNumbers.length}`);
  console.log(`Numery: ${orderNumbers.join(', ')}\n`);

  // 3. Sprawdź które zlecenia już istnieją w bazie
  const existingOrders = await prisma.order.findMany({
    where: { orderNumber: { in: orderNumbers } },
    select: {
      orderNumber: true,
      orderedGlassCount: true,
      glassOrderStatus: true,
      glassDeliveryDate: true,
    },
  });

  const existingSet = new Map(existingOrders.map(o => [o.orderNumber, o]));
  console.log(`Znaleziono ${existingOrders.length}/${orderNumbers.length} zleceń w bazie\n`);

  // Pokaż które nie istnieją
  const missingOrders = orderNumbers.filter(on => !existingSet.has(on));
  if (missingOrders.length > 0) {
    console.log(`⚠️  Nadal brakujące zlecenia (${missingOrders.length}): ${missingOrders.join(', ')}`);
    console.log('   Te walidacje pozostaną nierozwiązane.\n');
  }

  // 4. Grupuj walidacje po numerze zlecenia
  let matchedCount = 0;
  let skippedDeletedCount = 0;
  let alreadyMatchedCount = 0;
  const errors = [];

  for (const validation of unresolvedValidations) {
    const order = existingSet.get(validation.orderNumber);

    if (!order) {
      // Zlecenie nadal nie istnieje - pomijamy
      continue;
    }

    // Pomiń soft-deleted glass orders
    if (validation.glassOrder?.deletedAt) {
      skippedDeletedCount++;
      continue;
    }

    const quantity = validation.orderedQuantity || 0;
    if (quantity === 0) {
      console.log(`⚠️  Walidacja #${validation.id} (${validation.orderNumber}): orderedQuantity = 0, pomijam`);
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Aktualizuj zlecenie - dodaj ilość szyb
        const updateData = {
          orderedGlassCount: { increment: quantity },
          glassOrderStatus: 'ordered',
        };

        // Ustaw datę dostawy szyb jeśli glass order ma expectedDeliveryDate
        if (validation.glassOrder?.expectedDeliveryDate) {
          updateData.glassDeliveryDate = validation.glassOrder.expectedDeliveryDate;
        }

        await tx.order.update({
          where: { orderNumber: validation.orderNumber },
          data: updateData,
        });

        // Oznacz walidację jako rozwiązaną
        await tx.glassOrderValidation.update({
          where: { id: validation.id },
          data: {
            resolved: true,
            resolvedAt: new Date(),
            resolvedBy: 'rematch-script',
          },
        });
      });

      matchedCount++;
      console.log(`✅ ${validation.orderNumber}: +${quantity} szyb (glass order: ${validation.glassOrder?.glassOrderNumber || '?'})`);
    } catch (error) {
      errors.push({ orderNumber: validation.orderNumber, error: error.message });
      console.log(`❌ ${validation.orderNumber}: ${error.message}`);
    }
  }

  // 5. Podsumowanie
  console.log('\n=== PODSUMOWANIE ===');
  console.log(`✅ Dopasowane: ${matchedCount}`);
  console.log(`⏭️  Pominięte (usunięte glass orders): ${skippedDeletedCount}`);
  console.log(`⚠️  Nadal brakujące zlecenia: ${missingOrders.length}`);
  if (errors.length > 0) {
    console.log(`❌ Błędy: ${errors.length}`);
    for (const err of errors) {
      console.log(`   - ${err.orderNumber}: ${err.error}`);
    }
  }

  // 6. Pokaż zaktualizowane zlecenia
  if (matchedCount > 0) {
    const matchedOrderNumbers = [...new Set(
      unresolvedValidations
        .filter(v => existingSet.has(v.orderNumber) && !v.glassOrder?.deletedAt)
        .map(v => v.orderNumber)
    )];

    const updatedOrders = await prisma.order.findMany({
      where: { orderNumber: { in: matchedOrderNumbers } },
      select: {
        orderNumber: true,
        orderedGlassCount: true,
        glassOrderStatus: true,
        glassDeliveryDate: true,
      },
    });

    console.log('\n=== ZAKTUALIZOWANE ZLECENIA ===');
    for (const order of updatedOrders) {
      console.log(`  ${order.orderNumber}: orderedGlassCount=${order.orderedGlassCount}, status=${order.glassOrderStatus}, deliveryDate=${order.glassDeliveryDate?.toISOString()?.split('T')[0] || '-'}`);
    }
  }
}

rematchGlassOrders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
