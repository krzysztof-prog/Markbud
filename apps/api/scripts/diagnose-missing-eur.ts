/**
 * Diagnostyka brakujących wartości EUR dla zamówień AKROBUD
 *
 * Uruchom: pnpm --filter @markbud/api tsx scripts/diagnose-missing-eur.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== DIAGNOSTYKA: Brakujące wartości EUR dla AKROBUD ===\n');

  // 1. Policz zamówienia AKROBUD
  const totalAkrobud = await prisma.order.count({
    where: { client: { contains: 'AKROBUD' }, deletedAt: null },
  });
  const missingEur = await prisma.order.count({
    where: {
      client: { contains: 'AKROBUD' },
      deletedAt: null,
      OR: [{ valueEur: null }, { valueEur: 0 }],
    },
  });
  const hasEur = totalAkrobud - missingEur;

  console.log(`📊 Zamówienia AKROBUD:`);
  console.log(`   Łącznie: ${totalAkrobud}`);
  console.log(`   Z valueEur > 0: ${hasEur}`);
  console.log(`   Brak valueEur (null lub 0): ${missingEur}`);
  console.log();

  // 2. Lista zamówień bez EUR
  const ordersMissingEur = await prisma.order.findMany({
    where: {
      client: { contains: 'AKROBUD' },
      deletedAt: null,
      OR: [{ valueEur: null }, { valueEur: 0 }],
    },
    select: {
      id: true,
      orderNumber: true,
      client: true,
      valueEur: true,
      valuePln: true,
      status: true,
      priceInheritedFromOrder: true,
    },
    orderBy: { orderNumber: 'desc' },
    take: 50,
  });

  console.log(`📋 Zamówienia AKROBUD bez EUR (ostatnie 50):`);
  console.table(
    ordersMissingEur.map((o) => ({
      id: o.id,
      nr: o.orderNumber,
      eur: o.valueEur,
      pln: o.valuePln,
      status: o.status,
      inherited: o.priceInheritedFromOrder || '-',
    }))
  );

  // 3. Sprawdź PendingOrderPrice dla tych zamówień
  const orderNumbers = ordersMissingEur.map((o) => o.orderNumber);
  const pendingPrices = await prisma.pendingOrderPrice.findMany({
    where: {
      orderNumber: { in: orderNumbers },
    },
    select: {
      orderNumber: true,
      currency: true,
      valueNetto: true,
      status: true,
      filename: true,
      appliedToOrderId: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📋 PendingOrderPrice dla tych zamówień (${pendingPrices.length} rekordów):`);
  if (pendingPrices.length > 0) {
    console.table(
      pendingPrices.map((p) => ({
        nr: p.orderNumber,
        waluta: p.currency,
        netto: p.valueNetto,
        status: p.status,
        plik: p.filename,
        appliedTo: p.appliedToOrderId || '-',
      }))
    );
  }

  // 4. Sprawdź FileImport dla ceny PDF
  const cenyImports = await prisma.fileImport.findMany({
    where: {
      fileType: 'ceny_pdf',
      deletedAt: null,
    },
    select: {
      id: true,
      filename: true,
      status: true,
      errorMessage: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  console.log(`\n📋 Ostatnie importy cen PDF (${cenyImports.length}):`);
  console.table(
    cenyImports.map((fi) => {
      let meta: any = {};
      try {
        meta = fi.metadata ? JSON.parse(fi.metadata) : {};
      } catch {}
      return {
        id: fi.id,
        plik: fi.filename,
        status: fi.status,
        error: fi.errorMessage ? fi.errorMessage.substring(0, 50) : '-',
        orderNumber: meta.orderNumber || '-',
        value: meta.valueNetto || meta.value || '-',
        currency: meta.currency || '-',
        date: fi.createdAt.toISOString().split('T')[0],
      };
    })
  );

  // 5. Sprawdź konkretne zamówienie 53914
  console.log('\n=== Szczegóły zamówienia 53914 ===');
  const order53914 = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: '53914' } },
  });
  if (order53914) {
    console.log(`  ID: ${order53914.id}`);
    console.log(`  Nr: ${order53914.orderNumber}`);
    console.log(`  Klient: ${order53914.client}`);
    console.log(`  valueEur: ${order53914.valueEur}`);
    console.log(`  valuePln: ${order53914.valuePln}`);
    console.log(`  windowsNetValue: ${order53914.windowsNetValue}`);
    console.log(`  priceInherited: ${order53914.priceInheritedFromOrder}`);
    console.log(`  status: ${order53914.status}`);
  } else {
    console.log('  Nie znaleziono zamówienia 53914');
  }

  // 6. Sprawdź PendingOrderPrice dla 53914
  const pending53914 = await prisma.pendingOrderPrice.findMany({
    where: { orderNumber: { startsWith: '53914' } },
  });
  console.log(`\n  PendingOrderPrice dla 53914: ${pending53914.length} rekordów`);
  if (pending53914.length > 0) {
    console.table(pending53914.map((p) => ({
      nr: p.orderNumber,
      waluta: p.currency,
      netto: p.valueNetto,
      status: p.status,
      plik: p.filename,
      appliedTo: p.appliedToOrderId,
    })));
  }

  // 7. Wszystkie PendingOrderPrice ze statusem "pending" i walutą EUR
  const allPendingEur = await prisma.pendingOrderPrice.count({
    where: { status: 'pending', currency: 'EUR' },
  });
  const allAppliedEur = await prisma.pendingOrderPrice.count({
    where: { status: 'applied', currency: 'EUR' },
  });
  const allExpiredEur = await prisma.pendingOrderPrice.count({
    where: { status: 'expired', currency: 'EUR' },
  });

  console.log('\n=== Statystyki PendingOrderPrice EUR ===');
  console.log(`  pending: ${allPendingEur}`);
  console.log(`  applied: ${allAppliedEur}`);
  console.log(`  expired: ${allExpiredEur}`);

  // 8. Sprawdź ile zamówień AKROBUD ma priceInheritedFromOrder
  const inheritedCount = await prisma.order.count({
    where: {
      client: { contains: 'AKROBUD' },
      deletedAt: null,
      priceInheritedFromOrder: { not: null },
      OR: [{ valueEur: null }, { valueEur: 0 }],
    },
  });
  console.log(`\n📊 AKROBUD bez EUR ale z priceInherited: ${inheritedCount}`);
}

main()
  .catch((error) => {
    console.error('❌ Błąd:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
