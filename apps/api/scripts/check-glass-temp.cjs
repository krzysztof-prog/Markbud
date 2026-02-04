const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { orderNumber: '53896' },
    select: {
      glasses: { 
        select: { 
          lp: true, 
          position: true, 
          quantity: true, 
          widthMm: true,
          heightMm: true,
          packageType: true 
        },
        orderBy: { lp: 'asc' }
      }
    }
  });
  
  console.log('Szczegoly OrderGlass dla 53896:\n');
  for (const g of order.glasses) {
    const typ = g.packageType.substring(0, 30);
    console.log('lp ' + g.lp + ' | poz ' + g.position + ' | qty ' + g.quantity + ' | ' + g.widthMm + 'x' + g.heightMm + ' | ' + typ);
  }
}
main().then(() => prisma.$disconnect());
