import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('=== Testing Orders Data ===\n');

  // Test 1: Raw database query
  console.log('1. Raw database query:');
  const orders = await prisma.order.findMany({
    where: { orderNumber: { in: ['53714', '53716'] } },
    include: {
      schucoLinks: {
        include: {
          schucoDelivery: {
            select: {
              orderNumber: true,
              shippingStatus: true,
              deliveryWeek: true,
            }
          }
        }
      }
    }
  });

  orders.forEach(order => {
    console.log(`\nOrder ${order.orderNumber}:`);
    console.log(`  ID: ${order.id}`);
    console.log(`  schucoLinks count: ${order.schucoLinks.length}`);
    if (order.schucoLinks.length > 0) {
      order.schucoLinks.forEach((link, idx) => {
        console.log(`  Link ${idx + 1}:`);
        console.log(`    Schuco Order: ${link.schucoDelivery.orderNumber}`);
        console.log(`    Status: ${link.schucoDelivery.shippingStatus}`);
        console.log(`    Delivery Week: ${link.schucoDelivery.deliveryWeek}`);
      });
    }
  });

  // Test 2: Check what OrderRepository.findAll would return
  console.log('\n\n2. Simulating OrderRepository.findAll():');
  const repoData = await prisma.order.findMany({
    where: {
      orderNumber: { in: ['53714', '53716'] },
      archivedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      schucoLinks: {
        select: {
          id: true,
          linkedAt: true,
          linkedBy: true,
          schucoDelivery: {
            select: {
              id: true,
              orderNumber: true,
              shippingStatus: true,
              deliveryWeek: true,
              totalAmount: true,
              isWarehouseItem: true,
            },
          },
        },
      },
    },
  });

  console.log(JSON.stringify(repoData, null, 2));

  await prisma.$disconnect();
}

test().catch(console.error);
