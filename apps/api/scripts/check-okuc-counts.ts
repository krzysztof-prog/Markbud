import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const demandCount = await prisma.okucDemand.count();
  console.log('OkucDemand count:', demandCount);
  
  const articleCount = await prisma.okucArticle.count();
  console.log('OkucArticle count:', articleCount);
  
  const stockCount = await prisma.okucStock.count();
  console.log('OkucStock count:', stockCount);
  
  await prisma.$disconnect();
}
main();
