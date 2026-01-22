/**
 * Skrypt czyszczący wszystkie zaimportowane dane z bazy DEV
 *
 * UWAGA: Ten skrypt NIEODWRACALNIE usuwa dane!
 * Używaj tylko na bazie DEV (dev.db)
 *
 * Uruchomienie: pnpm tsx apps/api/scripts/clear-imported-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearImportedData() {
  console.log('========================================');
  console.log('CZYSZCZENIE ZAIMPORTOWANYCH DANYCH');
  console.log('========================================\n');

  // Sprawdź czy to na pewno DEV
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('prod') || dbUrl.includes('production')) {
    console.error('❌ BŁĄD: Wykryto bazę produkcyjną! Przerywam.');
    process.exit(1);
  }

  try {
    // Usuwamy w kolejności od zależnych do niezależnych (ze względu na FK)

    console.log('1. Usuwanie powiązań Schuco...');
    const schucoLinks = await prisma.orderSchucoLink.deleteMany();
    console.log(`   ✓ OrderSchucoLink: ${schucoLinks.count} rekordów`);

    console.log('2. Usuwanie weryfikacji Akrobud...');
    const verificationItems = await prisma.akrobudVerificationItem.deleteMany();
    console.log(`   ✓ AkrobudVerificationItem: ${verificationItems.count} rekordów`);
    const verificationLists = await prisma.akrobudVerificationList.deleteMany();
    console.log(`   ✓ AkrobudVerificationList: ${verificationLists.count} rekordów`);

    console.log('3. Usuwanie konfliktów importu...');
    const conflicts = await prisma.pendingImportConflict.deleteMany();
    console.log(`   ✓ PendingImportConflict: ${conflicts.count} rekordów`);

    console.log('4. Usuwanie raportów produkcyjnych...');
    const prodReportItems = await prisma.productionReportItem.deleteMany();
    console.log(`   ✓ ProductionReportItem: ${prodReportItems.count} rekordów`);
    const prodReports = await prisma.productionReport.deleteMany();
    console.log(`   ✓ ProductionReport: ${prodReports.count} rekordów`);

    console.log('5. Usuwanie raportów miesięcznych...');
    const monthlyItems = await prisma.monthlyReportItem.deleteMany();
    console.log(`   ✓ MonthlyReportItem: ${monthlyItems.count} rekordów`);
    const monthlyReports = await prisma.monthlyReport.deleteMany();
    console.log(`   ✓ MonthlyReport: ${monthlyReports.count} rekordów`);

    console.log('6. Usuwanie optymalizacji palet...');
    const optimizedPallets = await prisma.optimizedPallet.deleteMany();
    console.log(`   ✓ OptimizedPallet: ${optimizedPallets.count} rekordów`);
    const palletOptimizations = await prisma.palletOptimization.deleteMany();
    console.log(`   ✓ PalletOptimization: ${palletOptimizations.count} rekordów`);

    console.log('7. Usuwanie danych szyb...');
    const looseGlasses = await prisma.looseGlass.deleteMany();
    console.log(`   ✓ LooseGlass: ${looseGlasses.count} rekordów`);
    const aluminumGlasses = await prisma.aluminumGlass.deleteMany();
    console.log(`   ✓ AluminumGlass: ${aluminumGlasses.count} rekordów`);
    const reclamationGlasses = await prisma.reclamationGlass.deleteMany();
    console.log(`   ✓ ReclamationGlass: ${reclamationGlasses.count} rekordów`);
    const glassValidations = await prisma.glassOrderValidation.deleteMany();
    console.log(`   ✓ GlassOrderValidation: ${glassValidations.count} rekordów`);
    const glassDeliveryItems = await prisma.glassDeliveryItem.deleteMany();
    console.log(`   ✓ GlassDeliveryItem: ${glassDeliveryItems.count} rekordów`);
    const glassOrderItems = await prisma.glassOrderItem.deleteMany();
    console.log(`   ✓ GlassOrderItem: ${glassOrderItems.count} rekordów`);
    const glassDeliveries = await prisma.glassDelivery.deleteMany();
    console.log(`   ✓ GlassDelivery: ${glassDeliveries.count} rekordów`);
    const glassOrders = await prisma.glassOrder.deleteMany();
    console.log(`   ✓ GlassOrder: ${glassOrders.count} rekordów`);

    console.log('8. Usuwanie cen oczekujących...');
    const pendingPrices = await prisma.pendingOrderPrice.deleteMany();
    console.log(`   ✓ PendingOrderPrice: ${pendingPrices.count} rekordów`);

    console.log('9. Usuwanie historii okuć...');
    const okucHistory = await prisma.okucHistory.deleteMany();
    console.log(`   ✓ OkucHistory: ${okucHistory.count} rekordów`);

    console.log('10. Usuwanie zamówień okuć...');
    const okucOrderItems = await prisma.okucOrderItem.deleteMany();
    console.log(`   ✓ OkucOrderItem: ${okucOrderItems.count} rekordów`);
    const okucOrders = await prisma.okucOrder.deleteMany();
    console.log(`   ✓ OkucOrder: ${okucOrders.count} rekordów`);

    console.log('11. Usuwanie zapotrzebowań okuć...');
    const okucDemands = await prisma.okucDemand.deleteMany();
    console.log(`   ✓ OkucDemand: ${okucDemands.count} rekordów`);

    console.log('12. Usuwanie pozycji dostaw...');
    const deliveryItems = await prisma.deliveryItem.deleteMany();
    console.log(`   ✓ DeliveryItem: ${deliveryItems.count} rekordów`);
    const deliveryOrders = await prisma.deliveryOrder.deleteMany();
    console.log(`   ✓ DeliveryOrder: ${deliveryOrders.count} rekordów`);

    console.log('13. Usuwanie dostaw...');
    const deliveries = await prisma.delivery.deleteMany();
    console.log(`   ✓ Delivery: ${deliveries.count} rekordów`);

    console.log('14. Usuwanie danych zleceń...');
    const notes = await prisma.note.deleteMany();
    console.log(`   ✓ Note: ${notes.count} rekordów`);
    const orderGlasses = await prisma.orderGlass.deleteMany();
    console.log(`   ✓ OrderGlass: ${orderGlasses.count} rekordów`);
    const orderWindows = await prisma.orderWindow.deleteMany();
    console.log(`   ✓ OrderWindow: ${orderWindows.count} rekordów`);
    const orderRequirements = await prisma.orderRequirement.deleteMany();
    console.log(`   ✓ OrderRequirement: ${orderRequirements.count} rekordów`);
    const orders = await prisma.order.deleteMany();
    console.log(`   ✓ Order: ${orders.count} rekordów`);

    console.log('15. Usuwanie Schuco...');
    const schucoDeliveries = await prisma.schucoDelivery.deleteMany();
    console.log(`   ✓ SchucoDelivery: ${schucoDeliveries.count} rekordów`);
    const schucoLogs = await prisma.schucoFetchLog.deleteMany();
    console.log(`   ✓ SchucoFetchLog: ${schucoLogs.count} rekordów`);

    console.log('16. Usuwanie importów plików...');
    const fileImports = await prisma.fileImport.deleteMany();
    console.log(`   ✓ FileImport: ${fileImports.count} rekordów`);

    console.log('17. Usuwanie historii magazynu...');
    const warehouseHistory = await prisma.warehouseHistory.deleteMany();
    console.log(`   ✓ WarehouseHistory: ${warehouseHistory.count} rekordów`);
    const warehouseOrders = await prisma.warehouseOrder.deleteMany();
    console.log(`   ✓ WarehouseOrder: ${warehouseOrders.count} rekordów`);

    console.log('18. Usuwanie godzinówek...');
    const specialWorks = await prisma.specialWork.deleteMany();
    console.log(`   ✓ SpecialWork: ${specialWorks.count} rekordów`);
    const nonProductiveTasks = await prisma.nonProductiveTask.deleteMany();
    console.log(`   ✓ NonProductiveTask: ${nonProductiveTasks.count} rekordów`);
    const timeEntries = await prisma.timeEntry.deleteMany();
    console.log(`   ✓ TimeEntry: ${timeEntries.count} rekordów`);

    console.log('19. Usuwanie paletówek...');
    const palletEntries = await prisma.palletStockEntry.deleteMany();
    console.log(`   ✓ PalletStockEntry: ${palletEntries.count} rekordów`);
    const palletDays = await prisma.palletStockDay.deleteMany();
    console.log(`   ✓ PalletStockDay: ${palletDays.count} rekordów`);

    console.log('\n========================================');
    console.log('✅ ZAKOŃCZONO POMYŚLNIE');
    console.log('========================================');
    console.log('\nWszystkie zaimportowane dane zostały usunięte z bazy DEV.');
    console.log('\nZachowane zostały:');
    console.log('  - Użytkownicy (users)');
    console.log('  - Profile (profiles)');
    console.log('  - Kolory (colors)');
    console.log('  - Konfiguracje (settings, currency_config, pallet_alert_configs)');
    console.log('  - Słowniki (workers, positions, special_work_types, etc.)');
    console.log('  - Artykuły okuć (okuc_articles, okuc_stocks)');
    console.log('  - Lokalizacje okuć (okuc_locations)');

  } catch (error) {
    console.error('\n❌ BŁĄD podczas czyszczenia:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearImportedData();