import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Symuluj to co robi OrderRepository.findAll()
  const orders = await prisma.order.findMany({
    take: 5,
    select: {
      id: true,
      orderNumber: true,
      valuePln: true,
      valueEur: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('📊 Dane z Prisma (jak w API):');
  orders.forEach(o => {
    console.log(`  ${o.orderNumber}: valuePln=${o.valuePln} (${typeof o.valuePln}), valueEur=${o.valueEur} (${typeof o.valueEur})`);
  });

  // Sprawdź zlecenia z wartościami
  const withValues = await prisma.order.findMany({
    where: {
      OR: [
        { valuePln: { not: null } },
        { valueEur: { not: null } }
      ]
    },
    select: { orderNumber: true, valuePln: true, valueEur: true },
    take: 10
  });

  console.log('\n💶 Zlecenia z wartościami:');
  withValues.forEach(o => console.log(`  ${o.orderNumber}: PLN=${o.valuePln || '-'}, EUR=${o.valueEur || '-'}`));

  await prisma.$disconnect();
}
main().catch(console.error);
