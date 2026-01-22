import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Zamówione szyby dla zlecenia 53690
  const orderItems = await prisma.glassOrderItem.findMany({
    where: { orderNumber: '53690' },
    select: { id: true, orderNumber: true, orderSuffix: true, widthMm: true, heightMm: true, quantity: true, position: true }
  });
  console.log('=== ZAMÓWIONE SZYBY (GlassOrderItem) ===');
  console.log('Liczba pozycji:', orderItems.length);
  let orderedTotal = 0;
  for (const item of orderItems) {
    orderedTotal += item.quantity;
    console.log(`  poz.${item.position}: ${item.widthMm}x${item.heightMm} (${item.orderSuffix || 'brak'}) - ${item.quantity} szt.`);
  }
  console.log('SUMA zamówionych:', orderedTotal);

  // Dostarczone szyby dla zlecenia 53690
  const deliveryItems = await prisma.glassDeliveryItem.findMany({
    where: { orderNumber: '53690' },
    include: { glassDelivery: { select: { id: true, deliveryDate: true, rackNumber: true, customerOrderNumber: true } } }
  });
  console.log('\n=== DOSTARCZONE SZYBY (GlassDeliveryItem) ===');
  console.log('Liczba pozycji:', deliveryItems.length);
  let deliveredTotal = 0;

  // Grupuj po dostawie
  const byDelivery = new Map<number, typeof deliveryItems>();
  for (const item of deliveryItems) {
    const delId = item.glassDelivery?.id || 0;
    if (!byDelivery.has(delId)) byDelivery.set(delId, []);
    byDelivery.get(delId)!.push(item);
    deliveredTotal += item.quantity;
  }

  for (const [deliveryId, items] of byDelivery) {
    const first = items[0];
    console.log(`\n  --- Dostawa #${deliveryId} (${first.glassDelivery?.deliveryDate}) ---`);
    console.log(`      Rack: ${first.glassDelivery?.rackNumber}`);
    console.log(`      CustomerOrder: ${first.glassDelivery?.customerOrderNumber}`);
    for (const item of items) {
      console.log(`      ${item.widthMm}x${item.heightMm} (${item.orderSuffix || 'brak'}) - ${item.quantity} szt. | status: ${item.matchStatus}`);
    }
  }
  console.log('\nSUMA dostarczonych:', deliveredTotal);

  // Pokaż różnicę per wymiar
  console.log('\n=== PORÓWNANIE PER WYMIAR ===');
  const orderedByDim = new Map<string, number>();
  const deliveredByDim = new Map<string, number>();

  for (const item of orderItems) {
    const key = `${item.widthMm}x${item.heightMm}`;
    orderedByDim.set(key, (orderedByDim.get(key) || 0) + item.quantity);
  }
  for (const item of deliveryItems) {
    const key = `${item.widthMm}x${item.heightMm}`;
    deliveredByDim.set(key, (deliveredByDim.get(key) || 0) + item.quantity);
  }

  const allDims = new Set([...orderedByDim.keys(), ...deliveredByDim.keys()]);
  for (const dim of allDims) {
    const ord = orderedByDim.get(dim) || 0;
    const del = deliveredByDim.get(dim) || 0;
    const diff = del - ord;
    if (diff !== 0) {
      console.log(`  ${dim}: zamówiono ${ord}, dostarczono ${del} => ${diff > 0 ? '+' : ''}${diff}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
