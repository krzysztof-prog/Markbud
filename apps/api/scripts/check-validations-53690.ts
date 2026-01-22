import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Sprawdź walidacje dla 53690
  const validations = await prisma.glassOrderValidation.findMany({
    where: { orderNumber: '53690' },
  });
  console.log('Walidacje dla 53690:', validations.length);
  for (const v of validations) {
    console.log('  -', v.validationType, v.severity, v.message);
  }

  // Usuń nieaktualne walidacje nadwyżki (bo teraz jest OK)
  const deleted = await prisma.glassOrderValidation.deleteMany({
    where: {
      orderNumber: '53690',
      validationType: { in: ['quantity_surplus', 'quantity_shortage'] },
    },
  });
  console.log('Usunięto:', deleted.count);
}

main().finally(() => prisma.$disconnect());
