/**
 * Debug script to check aluminum glass after cleanup
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== WERYFIKACJA PO CLEANUP ===\n');

  // 1. Sprawdź zamówienie 1042B AL.25 V250728 ZS
  const records = await prisma.aluminumGlass.findMany({
    where: {
      customerOrderNumber: { contains: '1042B AL.25 V250728 ZS' }
    },
    select: {
      customerOrderNumber: true,
      widthMm: true,
      heightMm: true,
      quantity: true,
      glassComposition: true
    }
  });

  console.log('Zamówienie 1042B AL.25 V250728 ZS:');
  console.log('Liczba rekordów:', records.length);
  console.log('');

  records.forEach((r, i) => {
    const comp = r.glassComposition || '';
    console.log(`${i+1}. ${r.widthMm}x${r.heightMm} | qty: ${r.quantity} | comp: ${comp.substring(0, 50)}${comp.length > 50 ? '...' : ''}`);
  });

  const total = records.reduce((sum, r) => sum + r.quantity, 0);
  console.log('');
  console.log('SUMA quantity:', total, 'szt.');

  await prisma.$disconnect();
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });