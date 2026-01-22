const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const total = await p.order.count();
  const active = await p.order.count({ where: { archivedAt: null } });
  const archived = await p.order.count({ where: { archivedAt: { not: null } } });
  
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
  
  console.log('With deadline:', withDeadline);
  console.log('Deadline >= 2023-07-15:', recentDeadline);
  
  // Pokaż przykładowe zlecenia
  const sample = await p.order.findMany({ take: 5, select: { orderNumber: true, deadline: true, archivedAt: true } });
  console.log('Sample orders:', sample);
}

main().catch(console.error).finally(() => p.$disconnect());
