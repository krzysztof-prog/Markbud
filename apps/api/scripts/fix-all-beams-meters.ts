/**
 * Skrypt naprawczy dla wszystkich OrderRequirement w bazie
 *
 * Problem: wartości beamsCount i meters były źle obliczane
 * - beamsCount nie był pomniejszany o 1 gdy restMm > 0
 * - meters był błędnie liczony jako beamsCount * 6.5 zamiast (6000 - roundedRest) / 1000
 *
 * Poprawny algorytm (z BeamCalculator.ts):
 * - jeśli restMm === 0: beams = originalBeams, meters = 0
 * - jeśli restMm > 0:
 *   - roundedRest = Math.ceil(restMm / 500) * 500
 *   - beams = originalBeams - 1
 *   - meters = (6000 - roundedRest) / 1000
 *
 * Uruchomienie:
 * cd apps/api && npx tsx scripts/fix-all-beams-meters.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BEAM_LENGTH_MM = 6000;
const REST_ROUNDING_MM = 500;

interface FixResult {
  id: number;
  orderId: number;
  orderNumber: string;
  profileNumber: string;
  oldBeamsCount: number;
  newBeamsCount: number;
  oldMeters: number;
  newMeters: number;
  restMm: number;
}

function calculateCorrectValues(currentBeamsCount: number, restMm: number): { beams: number; meters: number } {
  // Obecny beamsCount to ORYGINALNA wartość (nie była pomniejszona)
  const originalBeams = currentBeamsCount;

  if (restMm === 0) {
    return { beams: originalBeams, meters: 0 };
  }

  // Zaokrąglij resztę w górę do wielokrotności 500mm
  const roundedRest = Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;

  // Odjąć 1 belę
  const beams = originalBeams - 1;

  // reszta2 = 6000 - roundedRest
  const reszta2Mm = BEAM_LENGTH_MM - roundedRest;

  // Na metry
  const meters = reszta2Mm / 1000;

  return { beams: Math.max(0, beams), meters: Math.max(0, meters) };
}

async function main() {
  console.log('='.repeat(60));
  console.log('SKRYPT NAPRAWCZY - OrderRequirement beamsCount i meters');
  console.log('='.repeat(60));
  console.log();

  // Pobierz wszystkie OrderRequirement z restMm > 0 lub meters > 0 (potencjalnie błędne)
  const requirements = await prisma.orderRequirement.findMany({
    include: {
      order: { select: { orderNumber: true } },
      profile: { select: { number: true } },
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Znaleziono ${requirements.length} rekordów OrderRequirement do sprawdzenia`);
  console.log();

  const toFix: FixResult[] = [];
  let alreadyCorrect = 0;

  for (const req of requirements) {
    const { beams: correctBeams, meters: correctMeters } = calculateCorrectValues(req.beamsCount, req.restMm);

    // Sprawdź czy wartości są różne (z tolerancją dla float)
    const beamsDiff = req.beamsCount !== correctBeams;
    const metersDiff = Math.abs(req.meters - correctMeters) > 0.001;

    if (beamsDiff || metersDiff) {
      toFix.push({
        id: req.id,
        orderId: req.orderId,
        orderNumber: req.order.orderNumber,
        profileNumber: req.profile.number,
        oldBeamsCount: req.beamsCount,
        newBeamsCount: correctBeams,
        oldMeters: req.meters,
        newMeters: correctMeters,
        restMm: req.restMm,
      });
    } else {
      alreadyCorrect++;
    }
  }

  console.log(`Rekordy poprawne: ${alreadyCorrect}`);
  console.log(`Rekordy do naprawy: ${toFix.length}`);
  console.log();

  if (toFix.length === 0) {
    console.log('✅ Wszystkie rekordy są już poprawne!');
    return;
  }

  // Pokaż przykłady zmian
  console.log('Przykłady zmian (pierwsze 10):');
  console.log('-'.repeat(100));
  console.log('Order    | Profile | restMm | beams: stare→nowe | meters: stare→nowe');
  console.log('-'.repeat(100));

  for (const fix of toFix.slice(0, 10)) {
    console.log(
      `${fix.orderNumber.padEnd(8)} | ${fix.profileNumber.padEnd(7)} | ${String(fix.restMm).padEnd(6)} | ` +
      `${String(fix.oldBeamsCount).padEnd(5)}→${String(fix.newBeamsCount).padEnd(5)} | ` +
      `${fix.oldMeters.toFixed(1).padEnd(6)}→${fix.newMeters.toFixed(1)}`
    );
  }

  if (toFix.length > 10) {
    console.log(`... i ${toFix.length - 10} więcej rekordów`);
  }
  console.log();

  // Wykonaj naprawę w transakcji
  console.log('Rozpoczynam naprawę w transakcji...');

  await prisma.$transaction(async (tx) => {
    let updated = 0;

    for (const fix of toFix) {
      await tx.orderRequirement.update({
        where: { id: fix.id },
        data: {
          beamsCount: fix.newBeamsCount,
          meters: fix.newMeters,
        },
      });
      updated++;

      if (updated % 100 === 0) {
        console.log(`  Zaktualizowano ${updated}/${toFix.length} rekordów...`);
      }
    }

    console.log(`  Zaktualizowano ${updated}/${toFix.length} rekordów.`);
  });

  console.log();
  console.log('✅ Naprawa zakończona pomyślnie!');
  console.log();

  // Weryfikacja
  console.log('Weryfikacja - sprawdzam przykładowe rekordy po naprawie:');
  console.log('-'.repeat(80));

  const sampleIds = toFix.slice(0, 5).map(f => f.id);
  const verified = await prisma.orderRequirement.findMany({
    where: { id: { in: sampleIds } },
    include: {
      order: { select: { orderNumber: true } },
      profile: { select: { number: true } },
    },
  });

  for (const req of verified) {
    const expected = calculateCorrectValues(
      toFix.find(f => f.id === req.id)!.oldBeamsCount,
      req.restMm
    );
    const match = req.beamsCount === expected.beams && Math.abs(req.meters - expected.meters) < 0.001;
    console.log(
      `${req.order.orderNumber} | ${req.profile.number} | ` +
      `beams=${req.beamsCount}, meters=${req.meters.toFixed(1)} | ` +
      `${match ? '✅ OK' : '❌ BŁĄD'}`
    );
  }

  console.log();
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Błąd podczas naprawy:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
