/**
 * Test script for PendingOrderPrice cleanup functionality
 *
 * Usage:
 *   node test-cleanup.mjs
 *
 * This script:
 * 1. Creates test records (old pending, old applied, expired)
 * 2. Runs cleanup via API
 * 3. Verifies results
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3000';

console.log('🧪 Testing PendingOrderPrice Cleanup System\n');

async function createTestRecords() {
  console.log('📝 Creating test records...');

  // Old pending record (should expire)
  const pendingRecord = await prisma.pendingOrderPrice.create({
    data: {
      orderNumber: 'TEST-CLEANUP-001',
      currency: 'PLN',
      valueNetto: 100000,
      filename: 'test-cleanup-1.pdf',
      filepath: '/test/cleanup-1.pdf',
      status: 'pending',
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
    },
  });

  // Old applied record (should be deleted)
  const appliedRecord = await prisma.pendingOrderPrice.create({
    data: {
      orderNumber: 'TEST-CLEANUP-002',
      currency: 'PLN',
      valueNetto: 150000,
      filename: 'test-cleanup-2.pdf',
      filepath: '/test/cleanup-2.pdf',
      status: 'applied',
      appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      appliedToOrderId: 1,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  // Expired record (should be deleted)
  const expiredRecord = await prisma.pendingOrderPrice.create({
    data: {
      orderNumber: 'TEST-CLEANUP-003',
      currency: 'PLN',
      valueNetto: 200000,
      filename: 'test-cleanup-3.pdf',
      filepath: '/test/cleanup-3.pdf',
      status: 'expired',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });

  console.log(`✅ Created 3 test records:`);
  console.log(`   - Pending (35 days old): ${pendingRecord.id}`);
  console.log(`   - Applied (10 days old): ${appliedRecord.id}`);
  console.log(`   - Expired (5 days old): ${expiredRecord.id}`);
  console.log();

  return { pendingRecord, appliedRecord, expiredRecord };
}

async function getStatistics() {
  console.log('📊 Getting cleanup statistics...');

  try {
    const response = await fetch(`${API_BASE}/api/cleanup/pending-prices/statistics`);
    const data = await response.json();

    if (data.success) {
      console.log(`✅ Statistics retrieved:`);
      console.log(`   Total: ${data.data.total}`);
      console.log(`   Pending: ${data.data.byStatus.pending}`);
      console.log(`   Applied: ${data.data.byStatus.applied}`);
      console.log(`   Expired: ${data.data.byStatus.expired}`);
      console.log();
      return data.data;
    } else {
      console.log('❌ Failed to get statistics');
    }
  } catch (error) {
    console.log('❌ Error getting statistics:', error.message);
  }
}

async function runCleanup() {
  console.log('🧹 Running cleanup...');

  try {
    const response = await fetch(`${API_BASE}/api/cleanup/pending-prices/run`, {
      method: 'POST',
    });
    const data = await response.json();

    if (data.success) {
      console.log(`✅ Cleanup completed:`);
      console.log(`   Pending expired: ${data.data.pendingExpired}`);
      console.log(`   Applied deleted: ${data.data.appliedDeleted}`);
      console.log(`   Expired deleted: ${data.data.expiredDeleted}`);
      console.log(`   Total affected: ${data.data.totalAffected}`);
      console.log();
      return data.data;
    } else {
      console.log('❌ Cleanup failed:', data.message);
      if (data.errors) {
        console.log('   Errors:', data.errors);
      }
    }
  } catch (error) {
    console.log('❌ Error running cleanup:', error.message);
  }
}

async function getSchedulerStatus() {
  console.log('⏰ Getting scheduler status...');

  try {
    const response = await fetch(`${API_BASE}/api/cleanup/pending-prices/scheduler/status`);
    const data = await response.json();

    if (data.success) {
      console.log(`✅ Scheduler status:`);
      console.log(`   Running: ${data.data.isRunning}`);
      console.log(`   Scheduled time: ${data.data.scheduledTime || 'N/A'}`);
      console.log();
      return data.data;
    } else {
      console.log('❌ Failed to get scheduler status');
    }
  } catch (error) {
    console.log('❌ Error getting scheduler status:', error.message);
  }
}

async function verifyRecords(ids) {
  console.log('🔍 Verifying records after cleanup...');

  const pending = await prisma.pendingOrderPrice.findUnique({
    where: { id: ids.pendingRecord.id },
  });

  const applied = await prisma.pendingOrderPrice.findUnique({
    where: { id: ids.appliedRecord.id },
  });

  const expired = await prisma.pendingOrderPrice.findUnique({
    where: { id: ids.expiredRecord.id },
  });

  console.log('Results:');

  if (pending && pending.status === 'expired') {
    console.log(`   ✅ Pending record marked as expired`);
  } else if (!pending) {
    console.log(`   ⚠️  Pending record deleted (should be expired)`);
  } else {
    console.log(`   ❌ Pending record not changed (status: ${pending.status})`);
  }

  if (!applied) {
    console.log(`   ✅ Applied record deleted`);
  } else {
    console.log(`   ❌ Applied record not deleted (status: ${applied.status})`);
  }

  if (!expired) {
    console.log(`   ✅ Expired record deleted`);
  } else {
    console.log(`   ❌ Expired record not deleted (status: ${expired.status})`);
  }

  console.log();
}

async function cleanup(ids) {
  console.log('🧽 Cleaning up test records...');

  // Delete any remaining test records
  await prisma.pendingOrderPrice.deleteMany({
    where: {
      orderNumber: {
        startsWith: 'TEST-CLEANUP-',
      },
    },
  });

  console.log('✅ Test records cleaned up\n');
}

async function runTests() {
  try {
    console.log('Starting cleanup system test...\n');

    // Step 1: Check scheduler status
    await getSchedulerStatus();

    // Step 2: Get initial statistics
    console.log('=== BEFORE CLEANUP ===\n');
    await getStatistics();

    // Step 3: Create test records
    const testRecords = await createTestRecords();

    // Step 4: Get statistics after creating test records
    await getStatistics();

    // Step 5: Run cleanup
    await runCleanup();

    // Step 6: Get statistics after cleanup
    console.log('=== AFTER CLEANUP ===\n');
    await getStatistics();

    // Step 7: Verify specific test records
    await verifyRecords(testRecords);

    // Step 8: Clean up any remaining test records
    await cleanup(testRecords);

    console.log('✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runTests();
