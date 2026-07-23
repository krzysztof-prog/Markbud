/**
 * Skrypt naprawczy dla zlecenia 54027:
 * - Usuwa przypisanie do dostawy (bez resetowania statusu zlecenia)
 * - Zlecenie pozostaje jako completed z datą produkcji w raporcie miesięcznym
 *
 * Użycie: npx tsx scripts/fix-order-54027.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ORDER_NUMBER = '54027';

  // Znajdź zlecenie
  const order = await prisma.order.findFirst({
    where: { orderNumber: ORDER_NUMBER },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      productionDate: true,
      client: true,
      deliveryOrders: {
        select: {
          id: true,
          deliveryId: true,
          delivery: {
            select: {
              id: true,
              deliveryDate: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    console.error(`Zlecenie ${ORDER_NUMBER} nie znalezione!`);
    process.exit(1);
  }

  console.log(`Zlecenie: ${order.orderNumber}`);
  console.log(`  Klient: ${order.client}`);
  console.log(`  Status: ${order.status}`);
  console.log(`  Data produkcji: ${order.productionDate}`);
  console.log(`  Przypisane dostawy: ${order.deliveryOrders.length}`);

  if (order.deliveryOrders.length === 0) {
    console.log('\nZlecenie nie jest przypisane do żadnej dostawy. Nic do zrobienia.');
    return;
  }

  // Usuń wszystkie przypisania do dostaw (bez zmiany statusu zlecenia!)
  for (const deliveryOrder of order.deliveryOrders) {
    console.log(`\n  Usuwam z dostawy ID: ${deliveryOrder.deliveryId} (data: ${deliveryOrder.delivery.deliveryDate})`);

    await prisma.deliveryOrder.delete({
      where: { id: deliveryOrder.id },
    });

    console.log(`  ✓ Usunięto`);
  }

  console.log(`\nZlecenie ${ORDER_NUMBER} usunięte z dostaw.`);
  console.log('Status zlecenia NIE został zmieniony - pozostaje jako:', order.status);
  console.log('Data produkcji NIE została zmieniona - pozostaje jako:', order.productionDate);
}

main()
  .catch((e) => {
    console.error('Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
