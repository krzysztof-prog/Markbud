/**
 * Skrypt do naprawy logiki obliczania bel po zmianie:
 * - Gdy restMm < 1000mm (roundedRest = 0) -> NIE odejmujemy beli, meters = 0
 * - Gdy restMm >= 1000mm -> odejmujemy 1 belę, meters = (6000 - roundedRest) / 1000
 *
 * Uruchomienie: node apps/api/scripts/fix-beam-calculation-logic.cjs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BEAM_LENGTH_MM = 6000;
const ROUNDING_MM = 1000;

async function main() {
  console.log('='.repeat(60));
  console.log('Naprawa logiki obliczania bel (roundedRest = 0 -> bez odejmowania)');
  console.log('='.repeat(60));

  // Pobierz wszystkie OrderRequirement gdzie restMm > 0
  const requirements = await prisma.orderRequirement.findMany({
    where: {
      restMm: { gt: 0 }
    },
    select: {
      id: true,
      restMm: true,
      beamsCount: true,
      meters: true,
      order: {
        select: { orderNumber: true }
      },
      profile: {
        select: { number: true }
      }
    }
  });

  console.log(`\nZnaleziono ${requirements.length} rekordów do sprawdzenia\n`);

  // Statystyki
  let fixedBeamsAndMeters = 0; // restMm < 1000mm - trzeba cofnąć odjęcie beli i wyzerować metry
  let fixedMetersOnly = 0;     // restMm >= 1000mm - tylko poprawka metrów
  let unchanged = 0;
  let errors = 0;

  const examples = [];

  for (const req of requirements) {
    const roundedRest = Math.floor(req.restMm / ROUNDING_MM) * ROUNDING_MM;

    try {
      if (roundedRest === 0) {
        // restMm < 1000mm -> NIE powinno być odjęcia beli, meters = 0
        // Musimy cofnąć odjęcie: beamsCount + 1, meters = 0
        const newBeamsCount = req.beamsCount + 1;
        const newMeters = 0;

        if (req.meters !== newMeters) {
          await prisma.orderRequirement.update({
            where: { id: req.id },
            data: {
              beamsCount: newBeamsCount,
              meters: newMeters
            }
          });

          if (examples.length < 5) {
            examples.push({
              orderNumber: req.order.orderNumber,
              profile: req.profile.number,
              restMm: req.restMm,
              oldBeams: req.beamsCount,
              newBeams: newBeamsCount,
              oldMeters: req.meters,
              newMeters: newMeters,
              type: 'cofnięto odjęcie beli'
            });
          }

          fixedBeamsAndMeters++;
        } else {
          unchanged++;
        }
      } else {
        // restMm >= 1000mm -> odejmowanie beli jest poprawne, tylko sprawdzamy metry
        const newMeters = (BEAM_LENGTH_MM - roundedRest) / 1000;

        if (Math.abs(req.meters - newMeters) > 0.0001) {
          await prisma.orderRequirement.update({
            where: { id: req.id },
            data: { meters: newMeters }
          });

          if (examples.length < 5) {
            examples.push({
              orderNumber: req.order.orderNumber,
              profile: req.profile.number,
              restMm: req.restMm,
              oldBeams: req.beamsCount,
              newBeams: req.beamsCount,
              oldMeters: req.meters,
              newMeters: newMeters,
              type: 'tylko metry'
            });
          }

          fixedMetersOnly++;
        } else {
          unchanged++;
        }
      }
    } catch (error) {
      console.error(`Błąd przy ID=${req.id}: ${error.message}`);
      errors++;
    }
  }

  // Podsumowanie
  console.log('='.repeat(60));
  console.log('PODSUMOWANIE');
  console.log('='.repeat(60));
  console.log(`Cofnięto odjęcie beli (restMm < 1000mm): ${fixedBeamsAndMeters}`);
  console.log(`Poprawiono tylko metry (restMm >= 1000mm): ${fixedMetersOnly}`);
  console.log(`Bez zmian:                               ${unchanged}`);
  console.log(`Błędy:                                   ${errors}`);
  console.log(`Razem:                                   ${requirements.length}`);

  if (examples.length > 0) {
    console.log('\nPrzykłady zmian:');
    console.log('-'.repeat(60));
    for (const ex of examples) {
      console.log(`  ${ex.orderNumber} | ${ex.profile} | restMm=${ex.restMm} (${ex.type})`);
      console.log(`    beams: ${ex.oldBeams} -> ${ex.newBeams}`);
      console.log(`    meters: ${ex.oldMeters}m -> ${ex.newMeters}m`);
    }
  }

  console.log('\n✅ Gotowe!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
