import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Pobierz przykładowe dane Schuco
  const schucoDeliveries = await prisma.schucoDelivery.findMany({
    take: 20,
    select: {
      orderNumber: true,
      orderName: true,
      projectNumber: true,
      totalAmount: true,
      extractedOrderNums: true
    }
  });

  console.log('📦 Przykładowe dane Schuco:\n');
  schucoDeliveries.forEach(s => {
    console.log('orderNumber:', s.orderNumber);
    console.log('orderName:', s.orderName);
    console.log('projectNumber:', s.projectNumber || '-');
    console.log('totalAmount:', s.totalAmount || '-');
    console.log('extractedOrderNums:', s.extractedOrderNums || '-');
    console.log('---');
  });

  // Pobierz przykładowe zlecenia
  const orders = await prisma.order.findMany({
    take: 10,
    select: { orderNumber: true, project: true, client: true }
  });

  console.log('\n📋 Przykładowe zlecenia AKROBUD:\n');
  orders.forEach(o => {
    console.log('orderNumber:', o.orderNumber, '| project:', o.project || '-', '| client:', o.client || '-');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
