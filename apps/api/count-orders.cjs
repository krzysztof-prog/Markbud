const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const total = await p.order.count();
  const active = await p.order.count({ where: { archivedAt: null } });
  const archived = await p.order.count({ where: { archivedAt: { not: null } } });
  
  console.log('=== STATYSTYKI ZLECEŃ ===');
  console.log('Total orders:', total);
  console.log('Active (not archived):', active);
  console.log('Archived:', archived);
  
  // Sprawdź daty deadline
  const withDeadline = await p.order.count({ where: { deadline: { not: null } } });
  const recentDeadline = await p.order.count({ 
    where: { 
      deadline: { gte: new Date('2023-07-15') } 
    } 
  });
  
  console.log('\n=== DATY ===');
  console.log('With deadline:', withDeadline);
  console.log('Deadline >= 2023-07-15:', recentDeadline);
  
  // Pokaż przykładowe zlecenia
  const sample = await p.order.findMany({ take: 10, select: { orderNumber: true, deadline: true, archivedAt: true } });
  console.log('\n=== PRZYKŁADOWE ZLECENIA ===');
  sample.forEach(o => console.log(o.orderNumber, '| deadline:', o.deadline, '| archived:', o.archivedAt ? 'TAK' : 'NIE'));
}

main().catch(console.error).finally(() => p.$disconnect());
