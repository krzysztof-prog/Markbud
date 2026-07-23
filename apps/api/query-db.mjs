import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: 'file:./prisma/prod.db' } }
});

async function main() {
  const deliveries = await prisma.delivery.findMany({
    where: {
      deliveryDate: {
        gte: new Date('2026-03-06T00:00:00Z'),
        lt: new Date('2026-03-07T00:00:00Z'),
      },
      deletedAt: null,
    },
    select: {
      id: true,
      deliveryDate: true,
      deliveryNumber: true,
      deliveryOrders: {
        select: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              status: true,
              requirements: {
                where: {
                  profile: { number: '9315' },
                  color: { code: '000' }
                },
                select: {
                  beamsCount: true,
                  meters: true,
                  status: true,
                  profile: { select: { number: true } },
                  color: { select: { code: true, name: true } },
                }
              }
            }
          }
        }
      }
    }
  });

  // Filtruj - zostaw tylko zlecenia z matchującymi wymaganiami
  for (const delivery of deliveries) {
    const matching = delivery.deliveryOrders
      .filter(doo => doo.order.requirements.length > 0)
      .map(doo => ({
        orderNumber: doo.order.orderNumber,
        customerName: doo.order.customerName,
        status: doo.order.status,
        requirements: doo.order.requirements,
      }));

    if (matching.length > 0) {
      console.log(`Dostawa: ${delivery.deliveryNumber || delivery.id} (${delivery.deliveryDate.toISOString().slice(0,10)})`);
      console.log('---');
      for (const order of matching) {
        for (const req of order.requirements) {
          console.log(`Zlecenie: ${order.orderNumber} | Klient: ${order.customerName} | Profil: ${req.profile.number} | Kolor: ${req.color?.code} (${req.color?.name}) | Belki: ${req.beamsCount} | Metry: ${req.meters} | Status: ${req.status}`);
        }
      }
      console.log('---');
      console.log(`Razem zleceń: ${matching.length}`);
    } else {
      console.log('Brak zleceń z profilem 9315 kolor 000 w dostawie 06.03');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
