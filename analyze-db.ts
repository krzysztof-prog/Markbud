import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeDatabase() {
  console.log('=== DATABASE ANALYSIS ===\n');

  // 1. Count rows in each table
  console.log('TABLE ROW COUNTS:');
  const tables = [
    { name: 'Users', query: () => prisma.user.count() },
    { name: 'Profiles', query: () => prisma.profile.count() },
    { name: 'Colors', query: () => prisma.color.count() },
    { name: 'ProfileColors', query: () => prisma.profileColor.count() },
    { name: 'Orders', query: () => prisma.order.count() },
    { name: 'OrderRequirements', query: () => prisma.orderRequirement.count() },
    { name: 'OrderWindows', query: () => prisma.orderWindow.count() },
    { name: 'WarehouseStock', query: () => prisma.warehouseStock.count() },
    { name: 'WarehouseOrders', query: () => prisma.warehouseOrder.count() },
    { name: 'WarehouseHistory', query: () => prisma.warehouseHistory.count() },
    { name: 'Deliveries', query: () => prisma.delivery.count() },
    { name: 'DeliveryOrders', query: () => prisma.deliveryOrder.count() },
    { name: 'DeliveryItems', query: () => prisma.deliveryItem.count() },
    { name: 'PalletTypes', query: () => prisma.palletType.count() },
    { name: 'PackingRules', query: () => prisma.packingRule.count() },
    { name: 'PalletOptimizations', query: () => prisma.palletOptimization.count() },
    { name: 'OptimizedPallets', query: () => prisma.optimizedPallet.count() },
    { name: 'FileImports', query: () => prisma.fileImport.count() },
    { name: 'Settings', query: () => prisma.setting.count() },
    { name: 'Notes', query: () => prisma.note.count() },
    { name: 'WorkingDays', query: () => prisma.workingDay.count() },
    { name: 'OkucArticles', query: () => prisma.okucArticle.count() },
    { name: 'OkucStock', query: () => prisma.okucStock.count() },
    { name: 'OkucOrders', query: () => prisma.okucOrder.count() },
    { name: 'OkucRequirements', query: () => prisma.okucRequirement.count() },
    { name: 'OkucHistory', query: () => prisma.okucHistory.count() },
    { name: 'OkucImports', query: () => prisma.okucImport.count() },
    { name: 'OkucProductImages', query: () => prisma.okucProductImage.count() },
    { name: 'OkucSettings', query: () => prisma.okucSettings.count() },
    { name: 'SchucoDeliveries', query: () => prisma.schucoDelivery.count() },
    { name: 'SchucoFetchLogs', query: () => prisma.schucoFetchLog.count() },
    { name: 'MonthlyReports', query: () => prisma.monthlyReport.count() },
    { name: 'MonthlyReportItems', query: () => prisma.monthlyReportItem.count() },
    { name: 'CurrencyConfig', query: () => prisma.currencyConfig.count() },
  ];

  for (const table of tables) {
    try {
      const count = await table.query();
      console.log(`  ${table.name.padEnd(25)} ${count.toString().padStart(8)} rows`);
    } catch (error) {
      console.log(`  ${table.name.padEnd(25)} ERROR`);
    }
  }

  console.log('\n=== POTENTIAL ISSUES ===\n');

  // Check for missing indexes on frequently queried fields
  console.log('MISSING INDEXES ANALYSIS:');

  // Check Orders without index on deadline
  const ordersWithDeadline = await prisma.order.count({
    where: { deadline: { not: null } }
  });
  console.log(`  Orders with deadline: ${ordersWithDeadline} (no index on deadline)`);

  // Check large JSON fields
  console.log('\nLARGE JSON FIELDS:');
  const palletOpts = await prisma.palletOptimization.findMany({
    select: { id: true, optimizationData: true }
  });
  palletOpts.forEach(opt => {
    const size = Buffer.from(opt.optimizationData).length;
    if (size > 10000) {
      console.log(`  PalletOptimization #${opt.id}: ${(size / 1024).toFixed(1)} KB`);
    }
  });

  // Check for unused tables (0 rows)
  console.log('\nUNUSED TABLES (0 rows):');
  for (const table of tables) {
    try {
      const count = await table.query();
      if (count === 0) {
        console.log(`  - ${table.name}`);
      }
    } catch (error) {
      // ignore
    }
  }

  // Check for duplicate data
  console.log('\nDUPLICATE CHECK:');
  const duplicateProfiles = await prisma.$queryRaw<Array<{ number: string; count: number }>>`
    SELECT number, COUNT(*) as count
    FROM profiles
    GROUP BY number
    HAVING COUNT(*) > 1
  `;
  if (duplicateProfiles.length > 0) {
    console.log(`  Duplicate profile numbers: ${duplicateProfiles.length}`);
  }

  const duplicateColors = await prisma.$queryRaw<Array<{ code: string; count: number }>>`
    SELECT code, COUNT(*) as count
    FROM colors
    GROUP BY code
    HAVING COUNT(*) > 1
  `;
  if (duplicateColors.length > 0) {
    console.log(`  Duplicate color codes: ${duplicateColors.length}`);
  }

  // Check for orphaned records
  console.log('\nORPHANED RECORDS CHECK:');
  const orphanedProfileColors = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*) as count
    FROM profile_colors pc
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = pc.profile_id)
       OR NOT EXISTS (SELECT 1 FROM colors c WHERE c.id = pc.color_id)
  `;
  if (orphanedProfileColors[0]?.count > 0) {
    console.log(`  Orphaned ProfileColors: ${orphanedProfileColors[0].count}`);
  }

  console.log('\n=== ANALYSIS COMPLETE ===');

  await prisma.$disconnect();
}

analyzeDatabase().catch(console.error);