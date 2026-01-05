import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inline extractOrderNumbers function (from schucoOrderMatcher.ts)
function extractOrderNumbers(schucoOrderNumber) {
  if (!schucoOrderNumber) {
    return [];
  }

  // Znajdź wszystkie 5-cyfrowe liczby w tekście
  const fiveDigitPattern = /(?<!\d)\d{5}(?!\d)/g;
  const matches = schucoOrderNumber.match(fiveDigitPattern);

  if (!matches) {
    return [];
  }

  // Usuń duplikaty i zwróć unikalne numery
  return [...new Set(matches)];
}

async function main() {
  console.log('[Sync] Starting manual Schuco links synchronization...');

  const deliveries = await prisma.schucoDelivery.findMany({
    select: { id: true, orderNumber: true, extractedOrderNums: true },
  });

  let processed = 0;
  let linksCreated = 0;
  let warehouseItems = 0;
  let errors = [];

  for (const delivery of deliveries) {
    const extractedNums = extractOrderNumbers(delivery.orderNumber);
    const isWarehouse = extractedNums.length === 0;

    // Update delivery flags
    await prisma.schucoDelivery.update({
      where: { id: delivery.id },
      data: {
        isWarehouseItem: isWarehouse,
        extractedOrderNums: extractedNums.length > 0 ? JSON.stringify(extractedNums) : null,
      },
    });

    if (isWarehouse) {
      warehouseItems++;
      continue;
    }

    // Create links for matching orders
    for (const orderNum of extractedNums) {
      try {
        const order = await prisma.order.findUnique({
          where: { orderNumber: orderNum },
        });

        if (!order) {
          console.log(`  [Skip] Order ${orderNum} not found in database`);
          continue;
        }

        // Check if link already exists
        const existingLink = await prisma.orderSchucoLink.findFirst({
          where: {
            orderId: order.id,
            schucoDeliveryId: delivery.id,
          },
        });

        if (existingLink) {
          console.log(`  [Skip] Link already exists for Order ${orderNum} <-> Delivery ${delivery.id}`);
          continue;
        }

        // Create the link
        await prisma.orderSchucoLink.create({
          data: {
            orderId: order.id,
            schucoDeliveryId: delivery.id,
            linkedBy: 'auto',
          },
        });

        linksCreated++;
        console.log(`  [Created] Link for Order ${orderNum} (id=${order.id}) <-> Delivery ${delivery.id}`);
      } catch (error) {
        errors.push({ orderNum, deliveryId: delivery.id, error: error.message });
        console.error(`  [Error] Failed to create link for Order ${orderNum}:`, error.message);
      }
    }

    processed++;
  }

  console.log('\n[Sync] Results:');
  console.log(`  Total deliveries processed: ${deliveries.length}`);
  console.log(`  Non-warehouse deliveries: ${processed}`);
  console.log(`  Warehouse items: ${warehouseItems}`);
  console.log(`  Links created: ${linksCreated}`);
  console.log(`  Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n[Errors] Details:');
    errors.forEach(e => console.log(`  - Order ${e.orderNum}, Delivery ${e.deliveryId}: ${e.error}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
