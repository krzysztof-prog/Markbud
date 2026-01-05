import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schucoCount = await prisma.schucoDelivery.count();
  const ordersCount = await prisma.order.count();
  const linksCount = await prisma.orderSchucoLink.count();

  console.log('📊 Stan bazy:');
  console.log('   Dostawy Schuco: ' + schucoCount);
  console.log('   Zlecenia: ' + ordersCount);
  console.log('   Powiazania: ' + linksCount);

  const sampleSchuco = await prisma.schucoDelivery.findMany({
    take: 5,
    select: { orderNumber: true, orderName: true, totalAmount: true, extractedOrderNums: true }
  });
  console.log('\n📦 Przykładowe Schuco:');
  sampleSchuco.forEach(s => console.log('   ' + s.orderNumber + ' | ' + (s.orderName || '-') + ' | ' + (s.totalAmount || '-')));

  const sampleOrders = await prisma.order.findMany({
    take: 5,
    select: { orderNumber: true, valueEur: true }
  });
  console.log('\n📋 Przykładowe zlecenia:');
  sampleOrders.forEach(o => console.log('   ' + o.orderNumber + ' | EUR: ' + (o.valueEur || 'null')));

  await prisma.$disconnect();
}
main().catch(console.error);
