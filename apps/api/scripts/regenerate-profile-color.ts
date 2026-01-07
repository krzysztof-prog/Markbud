/**
 * Skrypt naprawczy: Regeneracja ProfileColor i WarehouseStock
 *
 * Problem: Tabela ProfileColor jest pusta - brak powiązań między profilami a kolorami
 * Rozwiązanie: Tworzy wszystkie brakujące kombinacje profil-kolor
 *
 * Uruchomienie:
 *   npx tsx scripts/regenerate-profile-color.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Regeneracja ProfileColor i WarehouseStock...\n');

  // Pobierz wszystkie profile i kolory
  const profiles = await prisma.profile.findMany({
    select: { id: true, number: true },
    orderBy: { number: 'asc' },
  });

  const colors = await prisma.color.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  console.log(`📊 Stan początkowy:`);
  console.log(`   Profile: ${profiles.length}`);
  console.log(`   Kolory: ${colors.length}`);
  console.log(`   Oczekiwane kombinacje: ${profiles.length * colors.length}\n`);

  // Sprawdź aktualny stan
  const existingProfileColors = await prisma.profileColor.count();
  const existingWarehouseStock = await prisma.warehouseStock.count();

  console.log(`📋 Istniejące rekordy:`);
  console.log(`   ProfileColor: ${existingProfileColors}`);
  console.log(`   WarehouseStock: ${existingWarehouseStock}\n`);

  let profileColorCreated = 0;
  let profileColorSkipped = 0;
  let warehouseStockCreated = 0;
  let warehouseStockSkipped = 0;

  console.log('🚀 Rozpoczynam regenerację...\n');

  for (const profile of profiles) {
    let pcCreated = 0;
    let pcSkipped = 0;
    let wsCreated = 0;
    let wsSkipped = 0;

    for (const color of colors) {
      // Sprawdź czy ProfileColor już istnieje
      const existingPC = await prisma.profileColor.findUnique({
        where: {
          profileId_colorId: {
            profileId: profile.id,
            colorId: color.id,
          },
        },
      });

      if (!existingPC) {
        await prisma.profileColor.create({
          data: {
            profileId: profile.id,
            colorId: color.id,
            isVisible: true,
          },
        });
        pcCreated++;
      } else {
        pcSkipped++;
      }

      // Sprawdź czy WarehouseStock już istnieje
      const existingWS = await prisma.warehouseStock.findUnique({
        where: {
          profileId_colorId: {
            profileId: profile.id,
            colorId: color.id,
          },
        },
      });

      if (!existingWS) {
        await prisma.warehouseStock.create({
          data: {
            profileId: profile.id,
            colorId: color.id,
            currentStockBeams: 0,
            updatedById: 1, // System user
          },
        });
        wsCreated++;
      } else {
        wsSkipped++;
      }
    }

    profileColorCreated += pcCreated;
    profileColorSkipped += pcSkipped;
    warehouseStockCreated += wsCreated;
    warehouseStockSkipped += wsSkipped;

    console.log(
      `   ✅ Profil ${profile.number}: ProfileColor +${pcCreated}, WarehouseStock +${wsCreated}`
    );
  }

  console.log('\n✨ Regeneracja zakończona!\n');
  console.log('📊 Podsumowanie:');
  console.log(`   ProfileColor utworzono: ${profileColorCreated}`);
  console.log(`   ProfileColor pominięto (już istniały): ${profileColorSkipped}`);
  console.log(`   WarehouseStock utworzono: ${warehouseStockCreated}`);
  console.log(`   WarehouseStock pominięto (już istniały): ${warehouseStockSkipped}\n`);

  // Weryfikacja końcowa
  const finalProfileColors = await prisma.profileColor.count();
  const finalWarehouseStock = await prisma.warehouseStock.count();

  console.log('🔍 Weryfikacja końcowa:');
  console.log(`   ProfileColor: ${finalProfileColors} / ${profiles.length * colors.length} (oczekiwane)`);
  console.log(`   WarehouseStock: ${finalWarehouseStock} / ${profiles.length * colors.length} (oczekiwane)`);

  if (finalProfileColors === profiles.length * colors.length) {
    console.log('\n✅ ProfileColor: PEŁNA - wszystkie kombinacje utworzone!');
  } else {
    console.log(
      `\n⚠️  ProfileColor: NIEPEŁNA - brakuje ${
        profiles.length * colors.length - finalProfileColors
      } kombinacji`
    );
  }

  if (finalWarehouseStock === profiles.length * colors.length) {
    console.log('✅ WarehouseStock: PEŁNA - wszystkie kombinacje utworzone!');
  } else {
    console.log(
      `⚠️  WarehouseStock: NIEPEŁNA - brakuje ${
        profiles.length * colors.length - finalWarehouseStock
      } kombinacji`
    );
  }

  console.log('\n🎉 Gotowe! Tabela zleceń powinna teraz działać poprawnie.');
}

main()
  .catch((e) => {
    console.error('❌ Błąd podczas regeneracji:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
