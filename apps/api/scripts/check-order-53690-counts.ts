import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderNumber: '53690' },
    select: {
      orderNumber: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      glassOrderStatus: true,
    },
  });
  console.log('Order 53690:', order);

  const allDeliveryItems = await prisma.glassDeliveryItem.count({
    where: { orderNumber: '53690' },
  });
  const matchedItems = await prisma.glassDeliveryItem.count({
    where: { orderNumber: '53690', matchStatus: 'matched' },
  });
  console.log('Total GlassDeliveryItems:', allDeliveryItems);
  console.log('Matched items:', matchedItems);
}

main().finally(() => prisma.$disconnect());
