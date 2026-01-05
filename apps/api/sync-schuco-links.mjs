import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Extract order numbers from Schuco delivery orderName field
 * Example: "136732722" might contain order references
 */
function extractOrderNumbers(orderName) {
  if (!orderName) return [];

  // Pattern: 5-digit order numbers (e.g., 53314, 53401)
  const matches = orderName.match(/\b5\d{4}\b/g);
  return matches || [];
}

/**
 * Parse EUR amount from Schuco format
 */
function parseEurAmount(amountStr) {
  if (!amountStr) return null;
  let cleaned = amountStr.replace(/€/g, '').trim().replace(/\s/g, '').replace(/,/g, '.');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

async function main() {
  console.log('🔄 Synchronizacja powiązań Schuco...\n');

  // Get all Schuco deliveries
  const schucoDeliveries = await prisma.schucoDelivery.findMany({
    select: {
      id: true,
      orderNumber: true,
      orderName: true,
      totalAmount: true,
      extractedOrderNums: true,
      isWarehouseItem: true
    }
  });

  console.log(`📦 Znaleziono ${schucoDeliveries.length} dostaw Schuco\n`);

  // Get all orders
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true }
  });

  const orderMap = new Map();
  orders.forEach(o => orderMap.set(o.orderNumber, o.id));

  console.log(`📋 Znaleziono ${orders.length} zleceń\n`);
  console.log('Przykładowe numery zleceń:', Array.from(orderMap.keys()).slice(0, 10).join(', '));

  let linksCreated = 0;
  let valuesUpdated = 0;

  for (const schuco of schucoDeliveries) {
    // Skip warehouse items
    if (schuco.isWarehouseItem) continue;

    // Try to extract order numbers from orderName
    let orderNums = [];

    // First check if extractedOrderNums is already set
    if (schuco.extractedOrderNums) {
      try {
        orderNums = JSON.parse(schuco.extractedOrderNums);
      } catch (e) {
        // ignore
      }
    }

    // If not, try to extract from orderName
    if (orderNums.length === 0) {
      orderNums = extractOrderNumbers(schuco.orderName);
    }

    for (const orderNum of orderNums) {
      const orderId = orderMap.get(orderNum);
      if (!orderId) continue;

      // Create link
      try {
        await prisma.orderSchucoLink.upsert({
          where: {
            orderId_schucoDeliveryId: {
              orderId: orderId,
              schucoDeliveryId: schuco.id
            }
          },
          create: {
            orderId: orderId,
            schucoDeliveryId: schuco.id,
            linkedBy: 'script'
          },
          update: {}
        });
        linksCreated++;

        // Update order value if available
        const eurValue = parseEurAmount(schuco.totalAmount);
        if (eurValue !== null) {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { valueEur: true }
          });

          if (order && order.valueEur === null) {
            await prisma.order.update({
              where: { id: orderId },
              data: { valueEur: eurValue }
            });
            console.log(`✅ ${orderNum}: €${eurValue}`);
            valuesUpdated++;
          }
        }
      } catch (e) {
        console.error(`❌ Błąd dla ${orderNum}:`, e.message);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Podsumowanie:');
  console.log(`   Powiązania utworzone: ${linksCreated}`);
  console.log(`   Wartości zaktualizowane: ${valuesUpdated}`);
  console.log('='.repeat(50));

  await prisma.$disconnect();
}

main().catch(console.error);
