#!/usr/bin/env node

/**
 * Script to synchronize Schuco order values with existing orders
 * Updates valueEur field in orders table based on Schuco delivery data
 */

const API_URL = 'http://localhost:3001';

async function syncSchucoValues() {
  console.log('🔄 Starting Schuco values synchronization...\n');

  try {
    // Call the sync-links endpoint
    const response = await fetch(`${API_URL}/api/schuco/sync-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.message || response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ Synchronization completed!\n');
    console.log('📊 Results:');
    console.log(`   Total deliveries: ${result.total}`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Links created: ${result.linksCreated}`);
    console.log(`   Warehouse items: ${result.warehouseItems}`);

    // Get some sample orders to verify
    console.log('\n🔍 Checking sample orders...');
    const ordersResponse = await fetch(`${API_URL}/api/orders?take=5`);

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      const ordersWithValues = ordersData.data.filter(o => o.valueEur);

      console.log(`   Orders with EUR values: ${ordersWithValues.length}/${ordersData.data.length}`);

      if (ordersWithValues.length > 0) {
        console.log('\n💶 Sample orders with values:');
        ordersWithValues.slice(0, 3).forEach(order => {
          console.log(`   ${order.orderNumber}: €${order.valueEur}`);
        });
      }
    }

    console.log('\n✨ Done! Refresh the orders page to see updated values.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. API server is running (pnpm dev:api)');
    console.error('   2. Schuco data has been fetched (POST /api/schuco/refresh)');
    process.exit(1);
  }
}

// Run the script
syncSchucoValues();
