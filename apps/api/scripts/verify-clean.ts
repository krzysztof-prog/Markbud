import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('========================================');
  console.log('WERYFIKACJA STANU BAZY PO CZYSZCZENIU');
  console.log('========================================\n');

  console.log('Dane usunięte (powinno być 0):');
  console.log('- Orders:', await prisma.order.count());
  console.log('- OrderRequirements:', await prisma.orderRequirement.count());
  console.log('- OrderWindows:', await prisma.orderWindow.count());
  console.log('- OrderGlasses:', await prisma.orderGlass.count());
  console.log('- FileImports:', await prisma.fileImport.count());
  console.log('- OkucDemands:', await prisma.okucDemand.count());
  console.log('- GlassOrders:', await prisma.glassOrder.count());
  console.log('- Deliveries:', await prisma.delivery.count());

  console.log('\nDane zachowane (konfiguracja):');
  console.log('- Users:', await prisma.user.count());
  console.log('- Profiles:', await prisma.profile.count());
  console.log('- Colors:', await prisma.color.count());
  console.log('- OkucArticles:', await prisma.okucArticle.count());
  console.log('- Workers:', await prisma.worker.count());
  console.log('- Positions:', await prisma.position.count());

  await prisma.$disconnect();
}

verify();
