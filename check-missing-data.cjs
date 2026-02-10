const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:./apps/api/prisma/dev.db' } } });

async function main() {
  // 1. Zlecenia bez ceny (valuePln = 0 lub null)
  const noPriceOrders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      OR: [
        { valuePln: null },
        { valuePln: 0 },
      ]
    },
    select: {
      orderNumber: true,
      client: true,
      valuePln: true,
      valueEur: true,
      status: true,
      deadline: true,
      system: true,
      requirements: {
        select: { profileId: true, profile: { select: { name: true } } }
      }
    },
    orderBy: { orderNumber: 'asc' }
  });

  console.log('=== ZLECENIA BEZ CENY (valuePln = 0 lub null) ===');
  console.log('Liczba: ' + noPriceOrders.length);
  console.log('');
  noPriceOrders.forEach(function(o) {
    const hasProfile = o.requirements && o.requirements.length > 0 && o.requirements.some(function(r) { return r.profileId; });
    const profileNames = o.requirements.map(function(r) { return r.profile ? r.profile.name : 'brak'; }).join(', ');
    const plnStr = (o.valuePln !== null && o.valuePln !== undefined) ? (o.valuePln/100).toFixed(2) : 'BRAK';
    const eurStr = (o.valueEur !== null && o.valueEur !== undefined) ? (o.valueEur/100).toFixed(2) : 'BRAK';
    const deadlineStr = o.deadline ? o.deadline.toISOString().split('T')[0] : '-';
    console.log(
      o.orderNumber + ' | ' + (o.client || '-') +
      ' | PLN: ' + plnStr +
      ' | EUR: ' + eurStr +
      ' | System: ' + (o.system || '-') +
      ' | Profil: ' + (hasProfile ? profileNames : 'BRAK') +
      ' | Status: ' + o.status +
      ' | Termin: ' + deadlineStr
    );
  });

  console.log('');
  console.log('');

  // 2. Zlecenia bez materiału/profilu (brak requirements z profileId)
  const noMaterialOrders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      requirements: {
        none: {}
      }
    },
    select: {
      orderNumber: true,
      client: true,
      valuePln: true,
      valueEur: true,
      status: true,
      deadline: true,
      system: true,
    },
    orderBy: { orderNumber: 'asc' }
  });

  console.log('=== ZLECENIA BEZ MATERIALU (brak requirements) ===');
  console.log('Liczba: ' + noMaterialOrders.length);
  console.log('');
  noMaterialOrders.forEach(function(o) {
    const plnStr = (o.valuePln !== null && o.valuePln !== undefined) ? (o.valuePln/100).toFixed(2) : 'BRAK';
    const eurStr = (o.valueEur !== null && o.valueEur !== undefined) ? (o.valueEur/100).toFixed(2) : 'BRAK';
    const deadlineStr = o.deadline ? o.deadline.toISOString().split('T')[0] : '-';
    console.log(
      o.orderNumber + ' | ' + (o.client || '-') +
      ' | PLN: ' + plnStr +
      ' | EUR: ' + eurStr +
      ' | System: ' + (o.system || '-') +
      ' | Status: ' + o.status +
      ' | Termin: ' + deadlineStr
    );
  });

  console.log('');
  console.log('');

  // 3. Podsumowanie - zlecenia które mają OBYDWA problemy
  const bothIssues = await prisma.order.findMany({
    where: {
      deletedAt: null,
      OR: [
        { valuePln: null },
        { valuePln: 0 },
      ],
      requirements: {
        none: {}
      }
    },
    select: {
      orderNumber: true,
      client: true,
      status: true,
      system: true,
    },
    orderBy: { orderNumber: 'asc' }
  });

  console.log('=== ZLECENIA BEZ CENY I BEZ MATERIALU ===');
  console.log('Liczba: ' + bothIssues.length);
  console.log('');
  bothIssues.forEach(function(o) {
    console.log(o.orderNumber + ' | ' + (o.client || '-') + ' | System: ' + (o.system || '-') + ' | Status: ' + o.status);
  });
}

main().catch(console.error).finally(function() { return prisma.$disconnect(); });
