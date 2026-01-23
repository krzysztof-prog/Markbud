/**
 * Skrypt migracji danych - wypełnia deliveryDate dla istniejących rekordów Schuco
 * Oblicza datę dostawy (poniedziałek danego tygodnia) z pola deliveryWeek
 *
 * Uruchomienie: npx tsx apps/api/scripts/migrate-delivery-dates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parsuje tydzień dostawy do daty (poniedziałek danego tygodnia)
 * Obsługuje formaty:
 * - "2026/5" lub "2026/05" (rok/tydzień) - główny format w bazie
 * - "KW 03/2026" lub "KW3/2026" (tydzień/rok) - alternatywny format
 */
function parseDeliveryWeek(deliveryWeek: string | null): Date | null {
  if (!deliveryWeek) {
    return null;
  }

  let week: number;
  let year: number;

  // Format 1: "2026/5" lub "2026/05" (rok/tydzień) - główny format
  const yearWeekMatch = deliveryWeek.match(/^(\d{4})\s*\/\s*(\d{1,2})$/);
  if (yearWeekMatch) {
    year = parseInt(yearWeekMatch[1], 10);
    week = parseInt(yearWeekMatch[2], 10);
  } else {
    // Format 2: "KW 03/2026" lub "KW3/2026" lub "03/2026" (tydzień/rok)
    const kwMatch = deliveryWeek.match(/(?:KW\s*)?(\d{1,2})\s*\/\s*(\d{4})/i);
    if (!kwMatch) {
      return null;
    }
    week = parseInt(kwMatch[1], 10);
    year = parseInt(kwMatch[2], 10);
  }

  if (week < 1 || week > 53 || year < 2020 || year > 2100) {
    return null;
  }

  // Oblicz datę pierwszego dnia tygodnia (poniedziałek)
  // ISO week: tydzień 1 zawiera pierwszy czwartek roku
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // 0 (niedziela) → 7
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  // Dodaj liczbę tygodni
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);

  return targetDate;
}

async function migrateDeliveryDates() {
  console.log('=== Migracja dat dostawy Schuco ===\n');

  // 1. Aktualizuj SchucoDelivery
  console.log('1. Aktualizuję SchucoDelivery...');

  const deliveries = await prisma.schucoDelivery.findMany({
    where: {
      deliveryWeek: { not: null },
      deliveryDate: null,
    },
    select: {
      id: true,
      deliveryWeek: true,
    },
  });

  console.log(`   Znaleziono ${deliveries.length} rekordów do aktualizacji`);

  let deliveriesUpdated = 0;
  let deliveriesSkipped = 0;

  for (const delivery of deliveries) {
    const deliveryDate = parseDeliveryWeek(delivery.deliveryWeek);

    if (deliveryDate) {
      await prisma.schucoDelivery.update({
        where: { id: delivery.id },
        data: { deliveryDate },
      });
      deliveriesUpdated++;
    } else {
      deliveriesSkipped++;
    }
  }

  console.log(`   Zaktualizowano: ${deliveriesUpdated}`);
  console.log(`   Pominięto (nie można sparsować): ${deliveriesSkipped}\n`);

  // 2. Aktualizuj SchucoOrderItem
  console.log('2. Aktualizuję SchucoOrderItem...');

  const items = await prisma.schucoOrderItem.findMany({
    where: {
      deliveryWeek: { not: null },
      deliveryDate: null,
    },
    select: {
      id: true,
      deliveryWeek: true,
    },
  });

  console.log(`   Znaleziono ${items.length} rekordów do aktualizacji`);

  let itemsUpdated = 0;
  let itemsSkipped = 0;

  // Batch processing dla dużej ilości rekordów
  const BATCH_SIZE = 100;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((item) => {
        const deliveryDate = parseDeliveryWeek(item.deliveryWeek);

        if (deliveryDate) {
          itemsUpdated++;
          return prisma.schucoOrderItem.update({
            where: { id: item.id },
            data: { deliveryDate },
          });
        } else {
          itemsSkipped++;
          // Zwróć pustą operację dla spójności transakcji
          return prisma.schucoOrderItem.findUnique({ where: { id: item.id } });
        }
      })
    );

    if ((i + BATCH_SIZE) % 500 === 0) {
      console.log(`   Postęp: ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`);
    }
  }

  console.log(`   Zaktualizowano: ${itemsUpdated}`);
  console.log(`   Pominięto (nie można sparsować): ${itemsSkipped}\n`);

  // Podsumowanie
  console.log('=== PODSUMOWANIE ===');
  console.log(`SchucoDelivery: ${deliveriesUpdated} zaktualizowanych`);
  console.log(`SchucoOrderItem: ${itemsUpdated} zaktualizowanych`);
  console.log('\nMigracja zakończona!');
}

migrateDeliveryDates()
  .catch((error) => {
    console.error('Błąd migracji:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
