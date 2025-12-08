import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const allDeliveries = await prisma.delivery.findMany({
  include: { deliveryOrders: true }
});

console.log('Wszystkie dostawy:', allDeliveries.length);
console.log('');

let deleted = 0;

for (const d of allDeliveries) {
  if (d.deliveryOrders.length === 0) {
    console.log('Usuwam pusta dostawe ID', d.id, ':', d.deliveryNumber);
    await prisma.delivery.delete({ where: { id: d.id } });
    deleted++;
  } else {
    console.log('Zachowuje ID', d.id, '(', d.deliveryOrders.length, 'zamowien ):', d.deliveryNumber);
  }
}

console.log('');
console.log('Usunieto', deleted, 'pustych dostaw');
console.log('Pozostalo', allDeliveries.length - deleted, 'dostaw z zamowieniami');

await prisma.$disconnect();
