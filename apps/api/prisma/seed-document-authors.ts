/**
 * Seed script - Mapowania autorów dokumentów
 *
 * Tworzy domyślne mapowania nazw autorów z CSV na użytkowników systemu:
 * - "Wlodek" lub "Włodek" → wlodek@markbud.pl
 * - "Arek" → a.iwanski@markbud.pl
 * - "Krzysztof" → krzysztof@markbud.pl
 *
 * Uruchom: pnpm --filter @markbud/api tsx prisma/seed-document-authors.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthorMapping {
  authorName: string;
  userEmail: string;
}

const authorMappings: AuthorMapping[] = [
  {
    authorName: 'Wlodek',
    userEmail: 'wlodek@markbud.pl',
  },
  {
    authorName: 'Włodek',
    userEmail: 'wlodek@markbud.pl',
  },
  {
    authorName: 'Arek',
    userEmail: 'a.iwanski@markbud.pl',
  },
  {
    authorName: 'Krzysztof',
    userEmail: 'krzysztof@markbud.pl',
  },
];

async function main() {
  console.log('🔧 Tworzenie mapowań autorów dokumentów...\n');

  for (const mapping of authorMappings) {
    // Sprawdź czy użytkownik istnieje
    const user = await prisma.user.findUnique({
      where: { email: mapping.userEmail },
    });

    if (!user) {
      console.log(`⚠️  Użytkownik ${mapping.userEmail} nie istnieje - pomijam mapowanie "${mapping.authorName}"`);
      continue;
    }

    // Sprawdź czy mapowanie już istnieje
    const existingMapping = await prisma.documentAuthorMapping.findUnique({
      where: { authorName: mapping.authorName },
    });

    if (existingMapping) {
      console.log(`⏭️  Mapowanie "${mapping.authorName}" już istnieje`);
      continue;
    }

    // Stwórz mapowanie
    const created = await prisma.documentAuthorMapping.create({
      data: {
        authorName: mapping.authorName,
        userId: user.id,
      },
    });

    console.log(`✅ "${created.authorName}" → ${mapping.userEmail} (User ID: ${user.id})`);
  }

  console.log('\n✅ Zakończono tworzenie mapowań autorów!');
  console.log('\n📝 Podsumowanie:');

  const allMappings = await prisma.documentAuthorMapping.findMany({
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.table(
    allMappings.map((m) => ({
      'Autor z CSV': m.authorName,
      'Email użytkownika': m.user.email,
      'Imię użytkownika': m.user.name,
    }))
  );
}

main()
  .catch((error) => {
    console.error('❌ Błąd podczas tworzenia mapowań:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
