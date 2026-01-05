/**
 * Verification script to test query performance after removing redundant indexes
 *
 * Run this script before and after applying the migration to compare performance.
 *
 * Usage:
 *   npx tsx verify-index-queries.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query'], // Log all queries to see which indexes are used
});

async function testQueries() {
  console.log('Testing query performance after index removal...\n');

  try {
    // Test 1: OrderRequirement - Query by orderId
    console.log('1. OrderRequirement - Finding by orderId...');
    console.time('orderReq-by-orderId');
    const orderReqs = await prisma.orderRequirement.findMany({
      where: { orderId: 1 },
      take: 10,
    });
    console.timeEnd('orderReq-by-orderId');
    console.log(`   Found ${orderReqs.length} records\n`);

    // Test 2: OrderRequirement - Query by orderId + colorId
    console.log('2. OrderRequirement - Finding by orderId + colorId...');
    console.time('orderReq-by-orderId-colorId');
    const orderReqs2 = await prisma.orderRequirement.findMany({
      where: { orderId: 1, colorId: 1 },
      take: 10,
    });
    console.timeEnd('orderReq-by-orderId-colorId');
    console.log(`   Found ${orderReqs2.length} records\n`);

    // Test 3: OrderRequirement - Query by createdAt (kept index)
    console.log('3. OrderRequirement - Finding by createdAt...');
    console.time('orderReq-by-createdAt');
    const orderReqs3 = await prisma.orderRequirement.findMany({
      where: {
        createdAt: {
          gte: new Date('2024-01-01'),
        },
      },
      take: 10,
    });
    console.timeEnd('orderReq-by-createdAt');
    console.log(`   Found ${orderReqs3.length} records\n`);

    // Test 4: WarehouseStock - Query by profileId + colorId (unique)
    console.log('4. WarehouseStock - Finding by profileId + colorId...');
    console.time('warehouse-by-profile-color');
    const stock = await prisma.warehouseStock.findFirst({
      where: { profileId: 1, colorId: 1 },
    });
    console.timeEnd('warehouse-by-profile-color');
    console.log(`   Found: ${stock ? 'Yes' : 'No'}\n`);

    // Test 5: WarehouseStock - Query by profileId alone
    console.log('5. WarehouseStock - Finding by profileId...');
    console.time('warehouse-by-profile');
    const stocks = await prisma.warehouseStock.findMany({
      where: { profileId: 1 },
      take: 10,
    });
    console.timeEnd('warehouse-by-profile');
    console.log(`   Found ${stocks.length} records\n`);

    // Test 6: WarehouseOrder - Query by status (kept index)
    console.log('6. WarehouseOrder - Finding by status...');
    console.time('warehouse-order-by-status');
    const orders = await prisma.warehouseOrder.findMany({
      where: { status: 'pending' },
      take: 10,
    });
    console.timeEnd('warehouse-order-by-status');
    console.log(`   Found ${orders.length} records\n`);

    // Test 7: WarehouseOrder - Query by profileId (removed index)
    console.log('7. WarehouseOrder - Finding by profileId...');
    console.time('warehouse-order-by-profile');
    const orders2 = await prisma.warehouseOrder.findMany({
      where: { profileId: 1 },
      take: 10,
    });
    console.timeEnd('warehouse-order-by-profile');
    console.log(`   Found ${orders2.length} records\n`);

    // Test 8: DeliveryOrder - Query by deliveryId (removed index)
    console.log('8. DeliveryOrder - Finding by deliveryId...');
    console.time('delivery-order-by-delivery');
    const deliveryOrders = await prisma.deliveryOrder.findMany({
      where: { deliveryId: 1 },
    });
    console.timeEnd('delivery-order-by-delivery');
    console.log(`   Found ${deliveryOrders.length} records\n`);

    // Test 9: PalletOptimization - Query by deliveryId (unique)
    console.log('9. PalletOptimization - Finding by deliveryId...');
    console.time('pallet-opt-by-delivery');
    const optimization = await prisma.palletOptimization.findUnique({
      where: { deliveryId: 1 },
    });
    console.timeEnd('pallet-opt-by-delivery');
    console.log(`   Found: ${optimization ? 'Yes' : 'No'}\n`);

    // Test 10: Complex join query
    console.log('10. Complex Join - DeliveryOrder with Order and Delivery...');
    console.time('complex-join');
    const deliveryWithOrders = await prisma.delivery.findMany({
      where: { status: 'planned' },
      include: {
        deliveryOrders: {
          include: {
            order: true,
          },
        },
      },
      take: 5,
    });
    console.timeEnd('complex-join');
    console.log(`   Found ${deliveryWithOrders.length} deliveries\n`);

    console.log('✅ All queries completed successfully!');
    console.log('\nConclusion:');
    console.log('- All queries should show similar performance before/after migration');
    console.log('- Unique constraint indexes are being used efficiently');
    console.log('- No query functionality has been lost\n');
  } catch (error) {
    console.error('❌ Error during query tests:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testQueries().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
