import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const demandCount = await prisma.okucDemand.count();
  console.log('OkucDemand total:', demandCount);
  
  const deletedCount = await prisma.okucDemand.count({ where: { deletedAt: { not: null } } });
  console.log('OkucDemand deleted:', deletedCount);
  
  const activeCount = await prisma.okucDemand.count({ where: { deletedAt: null } });
  console.log('OkucDemand active:', activeCount);
  
  // Sprawdź czy model ma deletedAt
  const sample = await prisma.okucDemand.findFirst();
  console.log('Sample demand:', sample);
  
  await prisma.$disconnect();
}
main();
