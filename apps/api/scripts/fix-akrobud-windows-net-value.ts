/**
 * Skrypt migracji: Ustawienie windowsNetValue = valueEur dla zleceń AKROBUD
 *
 * Problem: windowsNetValue było obliczane z CSV (suma netto okien z materiałówki),
 * ale dla AKROBUD powinno być równe valueEur (z pliku PDF z ceną).
 *
 * Co robi:
 * 1. Dla zleceń AKROBUD z valueEur != null → windowsNetValue = valueEur
 * 2. Dla zleceń AKROBUD z valueEur == null → windowsNetValue = null
 *
 * Uruchomienie: npx tsx scripts/fix-akrobud-windows-net-value.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAkrobudWindowsNetValue() {
  console.log('=== Migracja: windowsNetValue = valueEur dla AKROBUD ===\n');

  // Znajdź wszystkie zlecenia AKROBUD (nieusunięte)
  const akrobudOrders = await prisma.order.findMany({
    where: {
      client: { contains: 'AKROBUD' },
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      client: true,
      valueEur: true,
      windowsNetValue: true,
    },
  });

  console.log(`Znaleziono ${akrobudOrders.length} zleceń AKROBUD\n`);

  let updatedWithEur = 0;
  let clearedToNull = 0;
  let alreadyCorrect = 0;

  for (const order of akrobudOrders) {
    const expectedValue = order.valueEur ?? null;
    const currentValue = order.windowsNetValue ?? null;

    // Sprawdź czy wartość już jest poprawna
    if (currentValue === expectedValue) {
      alreadyCorrect++;
      continue;
    }

    if (expectedValue !== null) {
      // Ma valueEur - ustaw windowsNetValue = valueEur
      await prisma.order.update({
        where: { id: order.id },
        data: { windowsNetValue: expectedValue },
      });
      console.log(
        `  ✅ ${order.orderNumber}: windowsNetValue ${currentValue} → ${expectedValue} (= valueEur)`
      );
      updatedWithEur++;
    } else {
      // Brak valueEur - wyzeruj windowsNetValue
      await prisma.order.update({
        where: { id: order.id },
        data: { windowsNetValue: null },
      });
      console.log(
        `  🔄 ${order.orderNumber}: windowsNetValue ${currentValue} → null (brak valueEur)`
      );
      clearedToNull++;
    }
  }

  console.log('\n=== Podsumowanie ===');
  console.log(`Zleceń AKROBUD: ${akrobudOrders.length}`);
  console.log(`Zaktualizowanych (valueEur → windowsNetValue): ${updatedWithEur}`);
  console.log(`Wyczyszczonych (→ null): ${clearedToNull}`);
  console.log(`Już poprawnych: ${alreadyCorrect}`);
  console.log('\nGotowe!');
}

fixAkrobudWindowsNetValue()
  .catch((e) => {
    console.error('Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
