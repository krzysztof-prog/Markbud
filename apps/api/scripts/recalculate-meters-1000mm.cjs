/**
 * Skrypt do przeliczenia meters w OrderRequirement po zmianie zaokrąglenia na W DÓŁ do 1000mm
 *
 * Uruchomienie: node apps/api/scripts/recalculate-meters-1000mm.cjs
 *
 * Zmiana logiki:
 * - Było: zaokrąglenie W GÓRĘ (ceil)
 * - Jest: zaokrąglenie W DÓŁ (floor) do wielokrotności 1000mm
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Stałe
const BEAM_LENGTH_MM = 6000;
const ROUNDING_MM = 1000;

/**
 * Oblicza nową wartość meters dla danego restMm (zaokrąglenie W DÓŁ)
 */
function calculateNewMeters(restMm) {
  if (restMm === 0) {
    return 0;
  }

  // Zaokrąglij resztę W DÓŁ do wielokrotności 1000mm
  const roundedRest = Math.floor(restMm / ROUNDING_MM) * ROUNDING_MM;

  // reszta2 = 6000 - roundedRest
  const reszta2Mm = BEAM_LENGTH_MM - roundedRest;

  return reszta2Mm / 1000;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Przeliczanie meters w OrderRequirement (zaokrąglenie W DÓŁ do 1000mm)');
  console.log('='.repeat(60));

  // Pobierz wszystkie OrderRequirement gdzie restMm > 0
  const requirements = await prisma.orderRequirement.findMany({
    where: {
      restMm: { gt: 0 }
    },
    select: {
      id: true,
      restMm: true,
      meters: true,
      order: {
        select: { orderNumber: true }
      },
      profile: {
        select: { number: true }
      }
    }
  });

  console.log(`\nZnaleziono ${requirements.length} rekordów do przeliczenia\n`);

  if (requirements.length === 0) {
    console.log('Brak rekordów do przeliczenia.');
    return;
  }

  // Statystyki
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  // Przykłady zmian (pierwsze 5)
  const examples = [];

  // Przelicz każdy rekord
  for (const req of requirements) {
    const oldMeters = req.meters;
    const newMeters = calculateNewMeters(req.restMm);

    // Sprawdź czy wartość się zmienia
    if (Math.abs(oldMeters - newMeters) < 0.0001) {
      unchanged++;
      continue;
    }

    // Zapisz przykład
    if (examples.length < 5) {
      examples.push({
        orderNumber: req.order.orderNumber,
        profile: req.profile.number,
        restMm: req.restMm,
        oldMeters,
        newMeters
      });
    }

    try {
      await prisma.orderRequirement.update({
        where: { id: req.id },
        data: { meters: newMeters }
      });
      updated++;
    } catch (error) {
      console.error(`Błąd przy aktualizacji ID=${req.id}: ${error.message}`);
      errors++;
    }
  }

  // Podsumowanie
  console.log('='.repeat(60));
  console.log('PODSUMOWANIE');
  console.log('='.repeat(60));
  console.log(`Przeliczono:   ${updated}`);
  console.log(`Bez zmian:     ${unchanged}`);
  console.log(`Błędy:         ${errors}`);
  console.log(`Razem:         ${requirements.length}`);

  if (examples.length > 0) {
    console.log('\nPrzykłady zmian:');
    console.log('-'.repeat(60));
    for (const ex of examples) {
      console.log(`  ${ex.orderNumber} | ${ex.profile} | restMm=${ex.restMm}`);
      console.log(`    meters: ${ex.oldMeters}m -> ${ex.newMeters}m`);
    }
  }

  console.log('\n✅ Gotowe!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
