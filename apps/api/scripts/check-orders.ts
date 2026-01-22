import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Zlecenia które NIE mają AKROBUD w nazwie klienta (prywatne)
  const privateOrders = await prisma.order.findMany({
    where: {
      client: {
        not: {
          contains: 'AKROBUD'
        }
      },
      archivedAt: null
    },
    select: {
      orderNumber: true,
      client: true,
      status: true
    },
    orderBy: { orderNumber: 'desc' },
    take: 20
  });
  
  console.log('Ostatnie 20 prywatnych (nie-AKROBUD) zleceń w bazie:');
  privateOrders.forEach(o => console.log(o.orderNumber, '|', (o.client || '').substring(0,35)));
  console.log('\nLiczba:', privateOrders.length);
  
  // Policz wszystkie prywatne
  const totalPrivate = await prisma.order.count({
    where: {
      client: {
        not: {
          contains: 'AKROBUD'
        }
      },
      archivedAt: null
    }
  });
  console.log('Wszystkie prywatne niezarchiwizowane:', totalPrivate);
  
  await prisma.$disconnect();
}
check();
