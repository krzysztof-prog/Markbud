/**
 * Skrypt testowy do uruchomienia scrapera pozycji Schüco
 * Uruchom: npx tsx scripts/test-schuco-items.ts
 */
import { prisma } from '../src/utils/prisma.js';
import { SchucoItemService } from '../src/services/schuco/schucoItemService.js';

async function main() {
  console.log('Starting Schüco items fetch test...');

  const itemService = new SchucoItemService(prisma);

  try {
    // Pobierz tylko 1 zamówienie dla testu
    const result = await itemService.fetchMissingItems(1);

    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
