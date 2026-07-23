const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Zakończ dostawę 53 (06.03.2026_I) z datą produkcji 02.03.2026
  const deliveryId = 53;
  const productionDate = '2026-03-02';

  // Pobierz zlecenia dostawy
  const delivery = await p.delivery.findUnique({
    where: { id: deliveryId },
    include: { deliveryOrders: { select: { orderId: true, order: { select: { orderNumber: true } } } } }
  });

  if (!delivery) { console.error('Nie znaleziono dostawy', deliveryId); return; }

  console.log(`Kończę dostawę ${delivery.deliveryNumber} (ID ${deliveryId})...`);
  console.log(`  Zleceń: ${delivery.deliveryOrders.length}`);

  // Zmień status zleceń na completed z datą produkcji
  const orderIds = delivery.deliveryOrders.map(dor => dor.orderId);
  await p.order.updateMany({
    where: { id: { in: orderIds } },
    data: {
      status: 'completed',
      productionDate: new Date(productionDate),
      completedAt: new Date(),
    }
  });
  console.log(`  Zlecenia zaktualizowane na completed (productionDate: ${productionDate})`);

  // Zmień status dostawy na completed
  await p.delivery.update({
    where: { id: deliveryId },
    data: { status: 'completed' }
  });
  console.log(`  Dostawa ${delivery.deliveryNumber} zakończona.`);

  // 2. Soft delete dostaw z 04.03.2026 (ID 72, 73)
  const deleteIds = [72, 73];
  for (const id of deleteIds) {
    const del = await p.delivery.findUnique({ where: { id }, select: { id: true, deliveryNumber: true, status: true } });
    if (!del) { console.log(`  Dostawa ${id} nie znaleziona - pomijam`); continue; }

    await p.delivery.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    console.log(`  Usunięto (soft delete): ${del.deliveryNumber} (ID ${id})`);
  }

  console.log('\nGotowe!');
  await p.$disconnect();
}
main();
