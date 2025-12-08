#!/usr/bin/env node
/**
 * Skrypt do aktualizacji nazw istniejących dostaw do formatu DD.MM.YYYY_X
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Formatuje datę do DD.MM.YYYY
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Generuj numer dostawy w formacie DD.MM.YYYY_X
 */
function generateDeliveryNumber(deliveryDate, deliveriesOnSameDay) {
  const datePrefix = formatDate(deliveryDate);
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const count = deliveriesOnSameDay.length;
  const suffix = romanNumerals[count] || String(count + 1);
  return `${datePrefix}_${suffix}`;
}

async function updateDeliveryNames() {
  try {
    console.log('🚀 Rozpoczynam aktualizację nazw dostaw...\n');

    // Pobierz wszystkie dostawy posortowane według daty
    const deliveries = await prisma.delivery.findMany({
      orderBy: { deliveryDate: 'asc' },
    });

    console.log(`📦 Znaleziono ${deliveries.length} dostaw do aktualizacji\n`);

    // Grupuj dostawy według daty
    const deliveriesByDate = new Map();

    for (const delivery of deliveries) {
      const dateKey = formatDate(delivery.deliveryDate);

      if (!deliveriesByDate.has(dateKey)) {
        deliveriesByDate.set(dateKey, []);
      }

      deliveriesByDate.get(dateKey).push(delivery);
    }

    let updated = 0;
    let skipped = 0;

    // Aktualizuj każdą dostawę
    for (const [dateKey, deliveriesOnDay] of deliveriesByDate.entries()) {
      console.log(`📅 Przetwarzam dostawy z dnia ${dateKey}:`);

      for (let i = 0; i < deliveriesOnDay.length; i++) {
        const delivery = deliveriesOnDay[i];
        const newNumber = generateDeliveryNumber(delivery.deliveryDate, deliveriesOnDay.slice(0, i));

        // Aktualizuj tylko jeśli nazwa się różni
        if (delivery.deliveryNumber !== newNumber) {
          await prisma.delivery.update({
            where: { id: delivery.id },
            data: { deliveryNumber: newNumber },
          });

          console.log(`  ✅ Dostawa #${delivery.id}: "${delivery.deliveryNumber || 'brak'}" → "${newNumber}"`);
          updated++;
        } else {
          console.log(`  ⏭️  Dostawa #${delivery.id}: "${newNumber}" (bez zmian)`);
          skipped++;
        }
      }

      console.log('');
    }

    console.log('\n✨ Zakończono aktualizację!');
    console.log(`📊 Statystyki:`);
    console.log(`   - Zaktualizowano: ${updated}`);
    console.log(`   - Pominięto: ${skipped}`);
    console.log(`   - Łącznie: ${deliveries.length}`);

  } catch (error) {
    console.error('❌ Błąd podczas aktualizacji:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateDeliveryNames();
