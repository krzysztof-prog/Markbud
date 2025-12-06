import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkForIssues() {
  console.log('🔍 CRITICAL REVIEW - Checking for potential issues...\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Check for duplicate indexes
  console.log('1️⃣ Checking for redundant/duplicate indexes...');

  const indexes = await prisma.$queryRaw<Array<{ name: string; tbl_name: string; sql: string }>>`
    SELECT name, tbl_name, sql
    FROM sqlite_master
    WHERE type = 'index'
      AND name NOT LIKE 'sqlite_%'
      AND sql IS NOT NULL
    ORDER BY tbl_name, name
  `;

  // Group by table
  const indexesByTable = indexes.reduce((acc, idx) => {
    if (!acc[idx.tbl_name]) acc[idx.tbl_name] = [];
    acc[idx.tbl_name].push(idx);
    return acc;
  }, {} as Record<string, typeof indexes>);

  // Check for potential redundancy
  for (const [table, tableIndexes] of Object.entries(indexesByTable)) {
    const indexPatterns = tableIndexes.map(idx => ({
      name: idx.name,
      columns: extractColumns(idx.sql || '')
    }));

    // Check if composite index makes single-column indexes redundant
    for (const composite of indexPatterns) {
      if (composite.columns.length > 1) {
        const firstColumn = composite.columns[0];
        const singleColIndex = indexPatterns.find(
          idx => idx.columns.length === 1 && idx.columns[0] === firstColumn
        );

        if (singleColIndex) {
          warnings.push(
            `⚠️  Table ${table}: Index '${singleColIndex.name}' (${firstColumn}) may be redundant with composite index '${composite.name}' (${composite.columns.join(', ')})`
          );
        }
      }
    }
  }

  // 2. Check OrderRequirement indexes specifically
  console.log('2️⃣ Checking OrderRequirement indexes...');

  const orderReqIndexes = indexesByTable['order_requirements'] || [];
  const hasComposite = orderReqIndexes.some(idx =>
    idx.name.includes('order_id_profile_id_color_id')
  );
  const hasSingleOrderId = orderReqIndexes.some(idx =>
    idx.name === 'order_requirements_order_id_idx'
  );
  const hasSingleProfileId = orderReqIndexes.some(idx =>
    idx.name === 'order_requirements_profile_id_idx'
  );
  const hasSingleColorId = orderReqIndexes.some(idx =>
    idx.name === 'order_requirements_color_id_idx'
  );

  if (hasComposite && hasSingleOrderId) {
    issues.push(
      `❌ REDUNDANCY: order_requirements has composite index (order_id, profile_id, color_id) AND single index (order_id). Single index is redundant!`
    );
  }

  // 3. Check if there's a unique constraint that duplicates our composite index
  console.log('3️⃣ Checking for unique constraint vs index overlap...');

  const uniqueConstraint = orderReqIndexes.find(idx =>
    idx.name.includes('order_id_profile_id_color_id_key')
  );
  const compositeIndex = orderReqIndexes.find(idx =>
    idx.name.includes('order_id_profile_id_color_id_idx')
  );

  if (uniqueConstraint && compositeIndex) {
    issues.push(
      `❌ DUPLICATE INDEX: order_requirements has both UNIQUE constraint (${uniqueConstraint.name}) and regular INDEX (${compositeIndex.name}) on same columns! This wastes space and slows down writes.`
    );
  }

  // 4. Check database size
  console.log('4️⃣ Checking database size...');

  const dbSize = await prisma.$queryRaw<Array<{ page_count: bigint }>>`
    PRAGMA page_count;
  `;
  const pageSize = await prisma.$queryRaw<Array<{ page_size: bigint }>>`
    PRAGMA page_size;
  `;

  const sizeInBytes = Number(dbSize[0]?.page_count || 0n) * Number(pageSize[0]?.page_size || 4096n);
  const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

  console.log(`   Database size: ${sizeInMB} MB`);

  // 5. Count total indexes
  console.log('5️⃣ Counting total indexes...');

  const totalIndexes = indexes.length;
  console.log(`   Total indexes: ${totalIndexes}`);

  if (totalIndexes > 100) {
    warnings.push(`⚠️  High index count (${totalIndexes}). Many indexes can slow down INSERT/UPDATE operations.`);
  }

  // 6. Check for indexes on nullable foreign keys
  console.log('6️⃣ Checking for potential issues with nullable columns...');

  const ordersTable = await prisma.$queryRaw<Array<{ name: string; type: string; notnull: number }>>`
    PRAGMA table_info(orders);
  `;

  const archivedAtCol = ordersTable.find(col => col.name === 'archived_at');
  if (archivedAtCol && archivedAtCol.notnull === 0) {
    // archived_at is nullable - good for our indexes
    console.log(`   ✅ archived_at is nullable - our indexes will work correctly`);
  }

  // 7. Check migration history
  console.log('7️⃣ Checking migration history...');

  const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: string }>>`
    SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
  `;

  console.log('   Recent migrations:');
  migrations.forEach(m => {
    console.log(`   - ${m.migration_name}`);
  });

  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('📋 REVIEW RESULTS');
  console.log('='.repeat(70));

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ No critical issues found!');
  } else {
    if (issues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:\n');
      issues.forEach(issue => console.log(issue));
    }

    if (warnings.length > 0) {
      console.log('\n🟡 WARNINGS:\n');
      warnings.forEach(warning => console.log(warning));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(70));

  if (issues.some(i => i.includes('DUPLICATE INDEX'))) {
    console.log('\n❌ MUST FIX: Remove duplicate composite index on order_requirements');
    console.log('   The @@unique constraint already creates an index!');
    console.log('   Action: Remove @@index([orderId, profileId, colorId]) from schema.prisma');
  }

  if (warnings.some(w => w.includes('redundant'))) {
    console.log('\n⚠️  CONSIDER: Single-column indexes might be redundant');
    console.log('   SQLite can use the first column of composite indexes');
    console.log('   Action: Review if single indexes on first columns are needed');
  }

  await prisma.$disconnect();
}

function extractColumns(sql: string): string[] {
  const match = sql.match(/\((.*?)\)/);
  if (!match) return [];
  return match[1].split(',').map(col => col.trim().replace(/"/g, ''));
}

checkForIssues().catch(console.error);
