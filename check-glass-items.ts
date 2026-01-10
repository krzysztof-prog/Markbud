import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Sprawdź jak powstały zamówienia - czy mają notes, supplier itp.
  const orders = await prisma.glassOrder.findMany({
    take: 5,
    select: {
      id: true,
      glassOrderNumber: true,
      supplier: true,
      orderedBy: true,
      notes: true,
      createdAt: true,
      _count: { select: { items: true } }
    }
  });

  console.log('Sample GlassOrders:');
  orders.forEach(o => {
    console.log(`- ${o.glassOrderNumber}: supplier=${o.supplier}, orderedBy=${o.orderedBy}, items=${o._count.items}, created=${o.createdAt}`);
  });

  // Sprawdź czy są jakieś pozycje
  const totalItems = await prisma.glassOrderItem.count();
  console.log(`\nTotal GlassOrderItem count: ${totalItems}`);

  await prisma.$disconnect();
}

check();
