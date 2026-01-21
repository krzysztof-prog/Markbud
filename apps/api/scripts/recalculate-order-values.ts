/**
 * Skrypt do przeliczenia wartości windowsNetValue, windowsMaterial, assemblyValue, extrasValue, otherValue
 * dla istniejących zleceń.
 *
 * Problem: Poprzednio wartości były mnożone przez quantity, co powodowało podwójne liczenie.
 * Fix: Teraz sumujemy totalNet i material bez mnożenia przez quantity.
 *
 * Uruchomienie: npx ts-node scripts/recalculate-order-values.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Kategorie materiałów (taka sama logika jak w UzyteBeleParser)
function categorizePosition(
  position: number,
  nonZeroWindowCount: number,
  material: number,
  netValue: number,
  assemblyValue: number,
  glazing: number,
  fittings: number,
  parts: number
): 'okno' | 'montaz' | 'dodatki' | 'inne' {
  // Jeśli pozycja <= liczba niezerowych okien, to jest to okno
  if (position <= nonZeroWindowCount) {
    return 'okno';
  }

  // Jeśli ma wartość montażu, to montaż
  if (assemblyValue > 0) {
    return 'montaz';
  }

  // Jeśli ma materiał lub wartości typowe dla okna, ale pozycja > liczba okien = dodatki
  if (material > 0 || glazing > 0 || fittings > 0 || parts > 0) {
    return 'dodatki';
  }

  // Reszta to "inne"
  return 'inne';
}

async function recalculateOrderValues() {
  console.log('Rozpoczynam przeliczanie wartości zleceń...\n');

  // Pobierz wszystkie zlecenia które mają materiały
  const orders = await prisma.order.findMany({
    where: {
      materials: {
        some: {}
      }
    },
    include: {
      materials: true,
      windows: {
        select: {
          id: true,
          widthMm: true,
          heightMm: true,
        }
      }
    }
  });

  console.log(`Znaleziono ${orders.length} zleceń z materiałami.\n`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const order of orders) {
    try {
      // Oblicz liczbę niezerowych okien (szerokość > 0 lub wysokość > 0)
      const nonZeroWindowCount = order.windows.filter(w => w.widthMm > 0 || w.heightMm > 0).length;

      // Przelicz sumy dla każdej kategorii
      let windowsNetValue = 0;
      let windowsMaterial = 0;
      let assemblyValue = 0;
      let extrasValue = 0;
      let otherValue = 0;

      for (const mat of order.materials) {
        // Określ kategorię materiału
        const category = categorizePosition(
          mat.position,
          nonZeroWindowCount,
          mat.material ?? 0,
          mat.netValue ?? 0,
          mat.assemblyValueAfterDiscount ?? 0,
          mat.glazing ?? 0,
          mat.fittings ?? 0,
          mat.parts ?? 0
        );

        // Sumuj wartości BEZ mnożenia przez quantity
        const totalNet = mat.totalNet ?? 0;
        const material = mat.material ?? 0;

        switch (category) {
          case 'okno':
            windowsNetValue += totalNet;
            windowsMaterial += material;
            break;
          case 'montaz':
            assemblyValue += totalNet;
            break;
          case 'dodatki':
            extrasValue += totalNet;
            break;
          case 'inne':
            otherValue += totalNet;
            break;
        }
      }

      // Porównaj z obecnymi wartościami
      const oldWindowsNetValue = order.windowsNetValue ?? 0;
      const oldWindowsMaterial = order.windowsMaterial ?? 0;

      const hasChanges =
        oldWindowsNetValue !== windowsNetValue ||
        oldWindowsMaterial !== windowsMaterial;

      if (hasChanges) {
        // Zaktualizuj zlecenie
        await prisma.order.update({
          where: { id: order.id },
          data: {
            windowsNetValue: windowsNetValue > 0 ? windowsNetValue : null,
            windowsMaterial: windowsMaterial > 0 ? windowsMaterial : null,
            assemblyValue: assemblyValue > 0 ? assemblyValue : null,
            extrasValue: extrasValue > 0 ? extrasValue : null,
            otherValue: otherValue > 0 ? otherValue : null,
          }
        });

        console.log(`✓ ${order.orderNumber}: windowsNetValue ${oldWindowsNetValue} → ${windowsNetValue} (diff: ${windowsNetValue - oldWindowsNetValue})`);
        console.log(`  windowsMaterial ${oldWindowsMaterial} → ${windowsMaterial} (diff: ${windowsMaterial - oldWindowsMaterial})`);
        updatedCount++;
      }
    } catch (error) {
      console.error(`✗ Błąd dla zlecenia ${order.orderNumber}:`, error);
      errorCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Zakończono przeliczanie.`);
  console.log(`Zaktualizowano: ${updatedCount} zleceń`);
  console.log(`Błędy: ${errorCount}`);
  console.log(`Bez zmian: ${orders.length - updatedCount - errorCount}`);
}

recalculateOrderValues()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
