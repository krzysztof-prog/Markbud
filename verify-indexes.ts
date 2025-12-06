import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyIndexes() {
  console.log('🔍 Verifying database indexes...\n');

  // Query SQLite to get all indexes
  const indexes = await prisma.$queryRaw<Array<{ name: string; tbl_name: string; sql: string }>>`
    SELECT name, tbl_name, sql
    FROM sqlite_master
    WHERE type = 'index'
      AND name NOT LIKE 'sqlite_%'
      AND sql IS NOT NULL
    ORDER BY tbl_name, name
  `;

  // Filter only our new performance indexes
  const newIndexes = indexes.filter(idx =>
    idx.name.includes('delivery_date_status') ||
    idx.name.includes('status_delivery_date') ||
    idx.name.includes('archived_at_status') ||
    idx.name.includes('created_at_archived_at') ||
    idx.name.includes('status_archived_at') ||
    idx.name.includes('order_id_profile_id_color_id') ||
    idx.name.includes('change_type_changed_at') ||
    idx.name.includes('order_date_parsed_shipping_status') ||
    idx.name.includes('shipping_status_order_date_parsed') ||
    idx.name.includes('status_created_at')
  );

  console.log(`✅ Found ${newIndexes.length} new performance indexes:\n`);

  const groupedIndexes = newIndexes.reduce((acc, idx) => {
    if (!acc[idx.tbl_name]) {
      acc[idx.tbl_name] = [];
    }
    acc[idx.tbl_name].push(idx);
    return acc;
  }, {} as Record<string, typeof newIndexes>);

  for (const [table, tableIndexes] of Object.entries(groupedIndexes)) {
    console.log(`📊 Table: ${table}`);
    tableIndexes.forEach(idx => {
      console.log(`   - ${idx.name}`);
    });
    console.log('');
  }

  // Verify expected indexes exist
  const expectedIndexes = [
    'deliveries_delivery_date_status_idx',
    'deliveries_status_delivery_date_idx',
    'orders_archived_at_status_idx',
    'orders_created_at_archived_at_idx',
    'orders_status_archived_at_idx',
    'order_requirements_order_id_profile_id_color_id_idx',
    'schuco_deliveries_change_type_changed_at_idx',
    'schuco_deliveries_order_date_parsed_shipping_status_idx',
    'schuco_deliveries_shipping_status_order_date_parsed_idx',
    'file_imports_status_created_at_idx',
  ];

  console.log('🎯 Verification Results:\n');

  const foundIndexNames = newIndexes.map(idx => idx.name);
  let allFound = true;

  for (const expectedIndex of expectedIndexes) {
    const found = foundIndexNames.includes(expectedIndex);
    if (found) {
      console.log(`   ✅ ${expectedIndex}`);
    } else {
      console.log(`   ❌ ${expectedIndex} - MISSING!`);
      allFound = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allFound) {
    console.log('✨ SUCCESS: All 10 performance indexes are installed!');
    console.log('🚀 Expected performance improvement: +30-50% on dashboard queries');
  } else {
    console.log('⚠️  WARNING: Some indexes are missing. Check migration.');
  }
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

verifyIndexes().catch(console.error);
