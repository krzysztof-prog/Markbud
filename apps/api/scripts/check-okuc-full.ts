import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== OKUC Tables Status ===');
  console.log('OkucArticle:', await prisma.okucArticle.count());
  console.log('OkucStock:', await prisma.okucStock.count());
  console.log('OkucDemand:', await prisma.okucDemand.count());
  console.log('OkucOrder:', await prisma.okucOrder.count());
  console.log('OkucOrderItem:', await prisma.okucOrderItem.count());
  console.log('OkucProportion:', await prisma.okucProportion.count());
  
  const sampleArticle = await prisma.okucArticle.findFirst({ take: 1 });
  console.log('\nSample OkucArticle:', JSON.stringify(sampleArticle, null, 2));
  
  const sampleStock = await prisma.okucStock.findFirst({ include: { article: true }, take: 1 });
  console.log('\nSample OkucStock:', JSON.stringify(sampleStock, null, 2));
  
  await prisma.$disconnect();
}
main();
