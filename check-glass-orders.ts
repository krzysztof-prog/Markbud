import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGlassOrders() {
  // Sprawdź zamówienia szkła
  const glassOrders = await prisma.glassOrder.findMany({
    take: 10,
    select: {
      id: true,
      glassOrderNumber: true,
      expectedDeliveryDate: true,
      actualDeliveryDate: true,
      status: true,
      items: {
        select: {
          orderNumber: true,
          quantity: true,
        },
      },
    },
  });

  console.log('Glass Orders:');
  console.log(JSON.stringify(glassOrders, null, 2));

  // Sprawdź konkretne zlecenie 53439
  const order53439 = await prisma.order.findFirst({
    where: { orderNumber: '53439' },
    select: {
      orderNumber: true,
      glassDeliveryDate: true,
      orderedGlassCount: true,
      deliveredGlassCount: true,
      glassOrderItems: {
        select: {
          glassOrder: {
            select: {
              glassOrderNumber: true,
              expectedDeliveryDate: true,
              actualDeliveryDate: true,
              status: true,
            },
          },
          quantity: true,
        },
      },
    },
  });

  console.log('\n\nOrder 53439:');
  console.log(JSON.stringify(order53439, null, 2));

  await prisma.$disconnect();
}

checkGlassOrders();
