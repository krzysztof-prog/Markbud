/**
 * Skrypt naprawczy: Przelicza orderedGlassCount, deliveredGlassCount i glassOrderStatus
 * dla wszystkich zleceń (Orders) na podstawie GlassOrderItems i GlassDeliveryItems.
 *
 * Powod: Po usunięciu i ponownym wgraniu zleceń, pola te nie zostały przeliczone.
 *
 * Tryb: DRY RUN (domyslnie) - nie zapisuje zmian
 * Uruchom z --apply aby zapisać zmiany
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(APPLY ? '=== TRYB ZAPISU (--apply) ===' : '=== DRY RUN (bez --apply nie zapisuje) ===');
  console.log('');

  // 1. Pobierz wszystkie zlecenia
  const allOrders = await p.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      glassOrderStatus: true,
      glassDeliveryDate: true,
    },
  });
  console.log(`Znaleziono ${allOrders.length} zlecen w bazie.`);

  // 2. Policz orderedGlassCount z GlassOrderItems
  const orderedGroups = await p.glassOrderItem.groupBy({
    by: ['orderNumber'],
    _sum: { quantity: true },
  });
  const orderedMap = new Map(orderedGroups.map(g => [g.orderNumber, g._sum.quantity || 0]));

  // 3. Policz deliveredGlassCount z GlassDeliveryItems (matched + conflict)
  const deliveryItems = await p.glassDeliveryItem.findMany({
    where: {
      matchStatus: { in: ['matched', 'conflict'] },
    },
    select: { orderNumber: true, quantity: true },
  });

  const deliveredMap = new Map();
  for (const item of deliveryItems) {
    const current = deliveredMap.get(item.orderNumber) || 0;
    deliveredMap.set(item.orderNumber, current + item.quantity);
  }

  // 4. Porownaj i zbierz zmiany
  const changes = [];
  let orderedFixed = 0;
  let deliveredFixed = 0;
  let statusFixed = 0;
  let unchanged = 0;

  for (const order of allOrders) {
    const expectedOrdered = orderedMap.get(order.orderNumber) || 0;
    const expectedDelivered = deliveredMap.get(order.orderNumber) || 0;

    // Oblicz prawidlowy status
    let expectedStatus = 'not_ordered';
    if (expectedOrdered === 0) {
      expectedStatus = 'not_ordered';
    } else if (expectedDelivered === 0) {
      expectedStatus = 'ordered';
    } else if (expectedDelivered < expectedOrdered) {
      expectedStatus = 'partially_delivered';
    } else if (expectedDelivered === expectedOrdered) {
      expectedStatus = 'delivered';
    } else {
      expectedStatus = 'over_delivered';
    }

    const currentOrdered = order.orderedGlassCount || 0;
    const currentDelivered = order.deliveredGlassCount || 0;
    const currentStatus = order.glassOrderStatus || 'not_ordered';

    const needsUpdate =
      currentOrdered !== expectedOrdered ||
      currentDelivered !== expectedDelivered ||
      currentStatus !== expectedStatus;

    if (needsUpdate) {
      changes.push({
        orderNumber: order.orderNumber,
        ordered: { from: currentOrdered, to: expectedOrdered },
        delivered: { from: currentDelivered, to: expectedDelivered },
        status: { from: currentStatus, to: expectedStatus },
      });

      if (currentOrdered !== expectedOrdered) orderedFixed++;
      if (currentDelivered !== expectedDelivered) deliveredFixed++;
      if (currentStatus !== expectedStatus) statusFixed++;
    } else {
      unchanged++;
    }
  }

  // 5. Wyswietl podsumowanie
  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Zlecenia bez zmian: ${unchanged}`);
  console.log(`Zlecenia wymagajace naprawy: ${changes.length}`);
  console.log(`  - orderedGlassCount do naprawy: ${orderedFixed}`);
  console.log(`  - deliveredGlassCount do naprawy: ${deliveredFixed}`);
  console.log(`  - glassOrderStatus do naprawy: ${statusFixed}`);

  // Pokaz przyklady zmian
  if (changes.length > 0) {
    console.log(`\nPrzyklady zmian (pierwsze 20):`);
    console.table(
      changes.slice(0, 20).map(c => ({
        orderNumber: c.orderNumber,
        'ordered (before)': c.ordered.from,
        'ordered (after)': c.ordered.to,
        'delivered (before)': c.delivered.from,
        'delivered (after)': c.delivered.to,
        'status (before)': c.status.from,
        'status (after)': c.status.to,
      }))
    );
  }

  // Podsumowanie statusow po naprawie
  const statusSummary = {};
  for (const c of changes) {
    const s = c.status.to;
    statusSummary[s] = (statusSummary[s] || 0) + 1;
  }
  console.log('\nRozklad statusow po naprawie (tylko zmienione):');
  console.table(statusSummary);

  // 6. Zapisz zmiany jesli --apply
  if (APPLY && changes.length > 0) {
    console.log(`\nZapisywanie ${changes.length} zmian...`);

    let saved = 0;
    for (const change of changes) {
      await p.order.update({
        where: { orderNumber: change.orderNumber },
        data: {
          orderedGlassCount: change.ordered.to,
          deliveredGlassCount: change.delivered.to,
          glassOrderStatus: change.status.to,
        },
      });
      saved++;
      if (saved % 50 === 0) console.log(`  Zapisano ${saved}/${changes.length}...`);
    }

    console.log(`\nZAPISANO ${saved} zmian.`);
  } else if (!APPLY && changes.length > 0) {
    console.log(`\n*** DRY RUN - nic nie zapisano. Uruchom z --apply aby zapisac. ***`);
  }

  await p.$disconnect();
}

main().catch(e => {
  console.error('BLAD:', e);
  process.exit(1);
});
