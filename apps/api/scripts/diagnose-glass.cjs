const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const allOrders = await p.order.findMany({ select: { orderNumber: true } });
  const orderSet = new Set(allOrders.map(o => o.orderNumber));
  console.log('Total Orders w bazie:', allOrders.length);
  console.log('Przykladowe orderNumbers (pierwsze 20):', allOrders.slice(0, 20).map(o => o.orderNumber));

  const glassGroups = await p.glassOrderItem.groupBy({
    by: ['orderNumber'],
    _sum: { quantity: true },
    _count: true
  });
  const orphaned = glassGroups.filter(g => !orderSet.has(g.orderNumber));

  console.log('\n=== ANALIZA OSIEROCONYCH NUMEROW ===');
  console.log('Lacznie osieroconych:', orphaned.length);

  // Grupowanie po dlugosci
  const byLength = {};
  for (const o of orphaned) {
    const len = o.orderNumber.length;
    if (!byLength[len]) byLength[len] = { count: 0, examples: [], totalQty: 0 };
    byLength[len].count++;
    byLength[len].totalQty += o._sum.quantity;
    if (byLength[len].examples.length < 5) byLength[len].examples.push(o.orderNumber);
  }
  console.log('\nGrupowanie po dlugosci numeru:');
  for (const [len, data] of Object.entries(byLength).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  Dlugosc ${len}: ${data.count} numerow (${data.totalQty} szyb), np: ${data.examples.join(', ')}`);
  }

  // Formaty w Order
  const orderByLength = {};
  for (const o of allOrders) {
    const len = o.orderNumber.length;
    if (!orderByLength[len]) orderByLength[len] = { count: 0, examples: [] };
    orderByLength[len].count++;
    if (orderByLength[len].examples.length < 5) orderByLength[len].examples.push(o.orderNumber);
  }
  console.log('\nFormaty orderNumber w Order:');
  for (const [len, data] of Object.entries(orderByLength).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  Dlugosc ${len}: ${data.count} zlecen, np: ${data.examples.join(', ')}`);
  }

  // Probe: last 5 digits
  let matchedByLast5 = 0;
  let matchExamples = [];
  for (const o of orphaned.filter(x => x.orderNumber.length > 5)) {
    const last5 = o.orderNumber.slice(-5);
    if (orderSet.has(last5)) {
      matchedByLast5++;
      if (matchExamples.length < 15) matchExamples.push(`${o.orderNumber} -> ${last5}`);
    }
  }
  console.log('\nDluzsze numery ktore pasuja po ostatnich 5 cyfrach:', matchedByLast5);
  if (matchExamples.length > 0) console.log('Przyklady:', matchExamples);

  // Probe: last 3 digits of glass order number (some use shorter format)
  let matchedByLast3 = 0;
  let match3Examples = [];
  for (const o of orphaned.filter(x => x.orderNumber.length >= 6 && x.orderNumber.length <= 12)) {
    const last3 = o.orderNumber.slice(-3);
    // Check if there's an order with this 3-char suffix combined with something
    for (const ord of allOrders) {
      if (ord.orderNumber.endsWith(last3) && match3Examples.length < 5) {
        // not useful, skip
      }
    }
  }

  // Krotkie numery
  const short = orphaned.filter(x => x.orderNumber.length <= 4);
  console.log('\nKrotkie numery (1-4 znaki):', short.length,
    ', przyklady:', short.slice(0, 10).map(x => `${x.orderNumber}(${x._sum.quantity} szyb)`));

  // Sprawdz numery 9-cyfrowe
  const orphaned9 = orphaned.filter(o => o.orderNumber.length === 9);
  console.log('\n9-cyfrowe orphaned (top 20):', orphaned9.slice(0, 20).map(o => o.orderNumber));

  // 10-cyfrowe
  const orphaned10 = orphaned.filter(o => o.orderNumber.length === 10);
  console.log('10-cyfrowe orphaned (top 20):', orphaned10.slice(0, 20).map(o => o.orderNumber));

  // 11-cyfrowe
  const orphaned11 = orphaned.filter(o => o.orderNumber.length === 11);
  console.log('11-cyfrowe orphaned (top 20):', orphaned11.slice(0, 20).map(o => o.orderNumber));

  // Probe: match by removing leading zeros or prefix
  // Some orderNumbers in glass might have YYMMDD prefix
  let prefixMatches = 0;
  let prefixExamples = [];
  for (const o of orphaned) {
    const num = o.orderNumber;
    // Try extracting last 3 digits as potential order suffix (like 871, 431, 043 etc)
    if (num.length >= 9) {
      const possibleOrderNum = num.slice(-3);
      const possiblePrefix = num.slice(0, -3);
    }
  }

  // Check: are the 9-digit orphaned numbers like YYMMDDXXX?
  console.log('\n=== ANALIZA FORMATU 9-CYFROWYCH ===');
  for (const num of orphaned9.slice(0, 10).map(o => o.orderNumber)) {
    const yy = num.slice(0, 2);
    const mm = num.slice(2, 4);
    const dd = num.slice(4, 6);
    const rest = num.slice(6);
    console.log(`  ${num} -> YY:${yy} MM:${mm} DD:${dd} suffix:${rest}`);
  }

  // Check GlassDelivery items too
  const totalDeliveryItems = await p.glassDeliveryItem.count();
  const deliveryOrphaned = await p.glassDeliveryItem.groupBy({
    by: ['orderNumber'],
    _count: true
  });
  const deliveryOrphanedCount = deliveryOrphaned.filter(d => !orderSet.has(d.orderNumber)).length;
  console.log('\n=== GLASS DELIVERY ITEMS ===');
  console.log('Total GlassDeliveryItems:', totalDeliveryItems);
  console.log('Unique orderNumbers:', deliveryOrphaned.length);
  console.log('Orphaned (no matching Order):', deliveryOrphanedCount);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
