import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./apps/api/prisma/prod.db'
    }
  }
});

async function main() {
  // Pobierz ostatnie sprawdzenie
  const latestCheck = await prisma.labelCheck.findFirst({
    where: {
      deletedAt: null
    },
    include: {
      results: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!latestCheck) {
    console.log('Brak sprawdzeń w bazie');
    return;
  }

  console.log('\n=== OSTATNIE SPRAWDZENIE ETYKIET ===');
  console.log(`ID: ${latestCheck.id}`);
  console.log(`Delivery ID: ${latestCheck.deliveryId}`);
  console.log(`Data: ${latestCheck.deliveryDate}`);
  console.log(`Status: ${latestCheck.status}`);
  console.log(`Sprawdzonych: ${latestCheck.checkedCount}`);
  console.log(`OK: ${latestCheck.okCount}`);
  console.log(`MISMATCH: ${latestCheck.mismatchCount}`);
  console.log(`ERRORS: ${latestCheck.errorCount}`);
  console.log(`Utworzono: ${latestCheck.createdAt}`);

  if (latestCheck.results.length > 0) {
    console.log('\n=== PRZYKŁADOWE WYNIKI (5 pierwszych) ===');
    latestCheck.results.forEach((result: any) => {
      console.log(`\nOrder: ${result.orderNumber}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Oczekiwana data: ${result.expectedDate}`);
      console.log(`  Wykryta data: ${result.detectedDate}`);
      console.log(`  Wykryty tekst: ${result.detectedText}`);
      console.log(`  Ścieżka obrazu: ${result.imagePath}`);
      if (result.errorMessage) {
        console.log(`  Błąd: ${result.errorMessage}`);
      }
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
