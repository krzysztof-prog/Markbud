/**
 * Jednorazowy skrypt: Dodaje mapowania autorów dokumentów i aktualizuje istniejące zlecenia
 *
 * Uruchomienie: cd apps/api && npx tsx scripts/fix-author-mappings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAPPINGS = [
  { authorName: 'Wlodek', userId: 6 },
  { authorName: 'Krzysztof', userId: 2 },
  { authorName: 'Arek', userId: 7 },
];

async function main() {
  console.log('=== Fix Author Mappings ===\n');

  // 1. Dodaj mapowania do tabeli document_author_mappings
  for (const mapping of MAPPINGS) {
    const existing = await prisma.documentAuthorMapping.findFirst({
      where: { authorName: mapping.authorName },
    });

    if (existing) {
      console.log(`  Mapping already exists: ${mapping.authorName} → userId ${existing.userId}`);
    } else {
      await prisma.documentAuthorMapping.create({
        data: mapping,
      });
      console.log(`  Created mapping: ${mapping.authorName} → userId ${mapping.userId}`);
    }
  }

  // 2. Aktualizuj istniejące zlecenia
  console.log('\nUpdating existing orders...');

  for (const mapping of MAPPINGS) {
    const result = await prisma.order.updateMany({
      where: {
        documentAuthor: mapping.authorName,
        documentAuthorUserId: null,
      },
      data: {
        documentAuthorUserId: mapping.userId,
      },
    });

    console.log(`  Updated ${result.count} orders: ${mapping.authorName} → userId ${mapping.userId}`);
  }

  // 3. Sprawdź wynik
  console.log('\nVerification:');
  const stats = await prisma.order.groupBy({
    by: ['documentAuthor'],
    _count: { id: true },
    where: {
      documentAuthorUserId: { not: null },
      archivedAt: null,
    },
  });

  stats.forEach((s) => {
    console.log(`  ${s.documentAuthor}: ${s._count.id} orders with userId set`);
  });

  const nullCount = await prisma.order.count({
    where: {
      documentAuthorUserId: null,
      documentAuthor: { not: null },
      archivedAt: null,
    },
  });
  console.log(`  Still unmapped: ${nullCount} orders`);

  console.log('\nDone!');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
