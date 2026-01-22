/**
 * Jednorazowy skrypt migracyjny - Przetworz RW dla istniejących zleceń "completed"
 *
 * Cel:
 * - Znaleźć wszystkie zlecenia ze statusem 'completed'
 * - Przetworzyć RW dla profili (OrderRequirement) które mają status != 'completed'
 * - Przetworzyć RW dla stali (OrderSteelRequirement) które mają status != 'completed'
 *
 * Użycie:
 * npx tsx apps/api/scripts/process-rw-for-completed-orders.ts
 *
 * UWAGA: Ten skrypt ZMNIEJSZY stany magazynowe! Uruchom TYLKO RAZ!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  ordersFound: number;
  profileRequirementsProcessed: number;
  profileRequirementsSkipped: number;
  profileErrors: Array<{ orderId: number; profileId: number; error: string }>;
  steelRequirementsProcessed: number;
  steelRequirementsSkipped: number;
  steelErrors: Array<{ orderId: number; steelId: number; error: string }>;
}

async function processRwForCompletedOrders(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    ordersFound: 0,
    profileRequirementsProcessed: 0,
    profileRequirementsSkipped: 0,
    profileErrors: [],
    steelRequirementsProcessed: 0,
    steelRequirementsSkipped: 0,
    steelErrors: [],
  };

  console.log('🔍 Szukam zleceń ze statusem "completed"...');

  // Pobierz wszystkie zlecenia completed z nieprzetworzonymi requirements
  const completedOrders = await prisma.order.findMany({
    where: {
      status: 'completed',
      OR: [
        {
          requirements: {
            some: {
              status: { not: 'completed' },
            },
          },
        },
        {
          steelRequirements: {
            some: {
              status: { not: 'completed' },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      requirements: {
        where: {
          status: { not: 'completed' },
        },
        include: {
          profile: {
            select: {
              id: true,
              articleNumber: true,
              name: true,
            },
          },
          color: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      steelRequirements: {
        where: {
          status: { not: 'completed' },
        },
        include: {
          steel: {
            select: {
              id: true,
              articleNumber: true,
              name: true,
            },
          },
        },
      },
    },
  });

  stats.ordersFound = completedOrders.length;
  console.log(`📋 Znaleziono ${stats.ordersFound} zleceń do przetworzenia`);

  if (stats.ordersFound === 0) {
    console.log('✅ Brak zleceń do przetworzenia - wszystko jest już aktualne!');
    return stats;
  }

  // Przetwórz każde zlecenie
  for (const order of completedOrders) {
    console.log(`\n📦 Przetwarzam zlecenie ${order.orderNumber} (ID: ${order.id})`);

    // === PROFILE RW ===
    if (order.requirements.length > 0) {
      console.log(`  🔹 Profile: ${order.requirements.length} pozycji do przetworzenia`);

      for (const req of order.requirements) {
        try {
          // Znajdź stan magazynowy
          const stock = await prisma.warehouseStock.findFirst({
            where: {
              profileId: req.profileId,
              colorId: req.colorId ?? 0,
              deletedAt: null,
            },
          });

          if (!stock) {
            stats.profileErrors.push({
              orderId: order.id,
              profileId: req.profileId,
              error: `Brak stanu magazynowego dla profilu ${req.profile.articleNumber} (${req.color?.name || 'brak koloru'})`,
            });
            stats.profileRequirementsSkipped++;

            // Mimo braku stanu, oznacz jako completed
            await prisma.orderRequirement.update({
              where: { id: req.id },
              data: { status: 'completed' },
            });

            console.log(
              `    ⚠️ Pominięto profil ${req.profile.articleNumber} - brak stanu magazynowego (oznaczono jako completed)`
            );
            continue;
          }

          const previousQty = stock.currentStockBeams;
          const changeQty = -req.beamsCount;
          const newQty = Math.max(0, previousQty + changeQty);

          // Aktualizuj stan magazynowy i requirement w transakcji
          await prisma.$transaction([
            prisma.warehouseStock.update({
              where: { id: stock.id },
              data: {
                currentStockBeams: newQty,
                version: { increment: 1 },
              },
            }),
            prisma.orderRequirement.update({
              where: { id: req.id },
              data: { status: 'completed' },
            }),
          ]);

          stats.profileRequirementsProcessed++;
          console.log(
            `    ✅ Profil ${req.profile.articleNumber}: ${previousQty} → ${newQty} belek (zmiana: ${changeQty})`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
          stats.profileErrors.push({
            orderId: order.id,
            profileId: req.profileId,
            error: errorMessage,
          });
          stats.profileRequirementsSkipped++;
          console.log(`    ❌ Błąd profilu ${req.profile.articleNumber}: ${errorMessage}`);
        }
      }
    }

    // === STEEL RW ===
    if (order.steelRequirements.length > 0) {
      console.log(`  🔸 Stal: ${order.steelRequirements.length} pozycji do przetworzenia`);

      for (const req of order.steelRequirements) {
        try {
          // Znajdź stan magazynowy stali
          const stock = await prisma.steelStock.findFirst({
            where: {
              steelId: req.steelId,
              deletedAt: null,
            },
          });

          if (!stock) {
            stats.steelErrors.push({
              orderId: order.id,
              steelId: req.steelId,
              error: `Brak stanu magazynowego dla stali ${req.steel.articleNumber}`,
            });
            stats.steelRequirementsSkipped++;

            // Mimo braku stanu, oznacz jako completed
            await prisma.orderSteelRequirement.update({
              where: { id: req.id },
              data: { status: 'completed' },
            });

            console.log(
              `    ⚠️ Pominięto stal ${req.steel.articleNumber} - brak stanu magazynowego (oznaczono jako completed)`
            );
            continue;
          }

          const previousQty = stock.currentStockBeams;
          const changeQty = -req.beamsCount;
          const newQty = Math.max(0, previousQty + changeQty);

          // Aktualizuj stan magazynowy, historię i requirement w transakcji
          await prisma.$transaction([
            prisma.steelStock.update({
              where: { id: stock.id },
              data: {
                currentStockBeams: newQty,
                version: { increment: 1 },
              },
            }),
            prisma.steelHistory.create({
              data: {
                steelId: req.steelId,
                eventType: 'rw',
                previousQty,
                changeQty,
                newQty,
                reason: `RW (migracja) - Zlecenie ${order.orderNumber}`,
                reference: `ORDER:${order.id}`,
              },
            }),
            prisma.orderSteelRequirement.update({
              where: { id: req.id },
              data: { status: 'completed' },
            }),
          ]);

          stats.steelRequirementsProcessed++;
          console.log(
            `    ✅ Stal ${req.steel.articleNumber}: ${previousQty} → ${newQty} belek (zmiana: ${changeQty})`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
          stats.steelErrors.push({
            orderId: order.id,
            steelId: req.steelId,
            error: errorMessage,
          });
          stats.steelRequirementsSkipped++;
          console.log(`    ❌ Błąd stali ${req.steel.articleNumber}: ${errorMessage}`);
        }
      }
    }
  }

  return stats;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  MIGRACJA RW - Przetwarzanie zleceń zakończonych');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('⚠️  UWAGA: Ten skrypt zmniejszy stany magazynowe!');
  console.log('⚠️  Uruchom TYLKO RAZ!');
  console.log('');

  try {
    const stats = await processRwForCompletedOrders();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  PODSUMOWANIE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📋 Zleceń przetworzonych: ${stats.ordersFound}`);
    console.log('');
    console.log('🔹 PROFILE:');
    console.log(`   ✅ Przetworzonych: ${stats.profileRequirementsProcessed}`);
    console.log(`   ⚠️ Pominiętych: ${stats.profileRequirementsSkipped}`);
    console.log(`   ❌ Błędów: ${stats.profileErrors.length}`);
    console.log('');
    console.log('🔸 STAL:');
    console.log(`   ✅ Przetworzonych: ${stats.steelRequirementsProcessed}`);
    console.log(`   ⚠️ Pominiętych: ${stats.steelRequirementsSkipped}`);
    console.log(`   ❌ Błędów: ${stats.steelErrors.length}`);

    if (stats.profileErrors.length > 0 || stats.steelErrors.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('  BŁĘDY');
      console.log('═══════════════════════════════════════════════════════════════');

      if (stats.profileErrors.length > 0) {
        console.log('\n🔹 Błędy profili:');
        stats.profileErrors.forEach((e) => {
          console.log(`   - Zlecenie ${e.orderId}, Profil ${e.profileId}: ${e.error}`);
        });
      }

      if (stats.steelErrors.length > 0) {
        console.log('\n🔸 Błędy stali:');
        stats.steelErrors.forEach((e) => {
          console.log(`   - Zlecenie ${e.orderId}, Stal ${e.steelId}: ${e.error}`);
        });
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Migracja zakończona!');
    console.log('═══════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('\n❌ BŁĄD MIGRACJI:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
