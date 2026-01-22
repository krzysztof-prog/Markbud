import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allOkucImports = await prisma.fileImport.findMany({
    where: { fileType: { contains: 'okuc' } },
  });
  console.log('All okuc-related imports:', allOkucImports.length);
  allOkucImports.forEach(i => console.log('  -', i.fileType, '|', i.filename, '|', i.status));
  
  // Sprawdź czy jest 53823
  const specific = await prisma.fileImport.findFirst({
    where: { filename: { contains: '53823' } }
  });
  console.log('\n53823 import:', specific);
  
  // Sprawdź archiwum
  console.log('\nChecking archive folder...');
  
  await prisma.$disconnect();
}
main();
