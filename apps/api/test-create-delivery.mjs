import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('🧪 Testowanie tworzenia dostawy bez deliveryNumber...\n');

// Simulate what the service does
const deliveryDate = new Date('2025-12-20');

// Count existing deliveries on same day
const startOfDay = new Date(deliveryDate);
startOfDay.setHours(0, 0, 0, 0);
const endOfDay = new Date(deliveryDate);
endOfDay.setHours(23, 59, 59, 999);

const existing = await prisma.delivery.findMany({
  where: {
    deliveryDate: {
      gte: startOfDay,
      lte: endOfDay
    }
  }
});

console.log(`Istniejące dostawy na 20.12.2025: ${existing.length}`);

// Generate delivery number
const day = String(deliveryDate.getDate()).padStart(2, '0');
const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
const year = deliveryDate.getFullYear();
const datePrefix = `${day}.${month}.${year}`;

const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
const suffix = romanNumerals[existing.length] || String(existing.length + 1);
const deliveryNumber = `${datePrefix}_${suffix}`;

console.log(`Wygenerowana nazwa: ${deliveryNumber}`);

// Create delivery
const delivery = await prisma.delivery.create({
  data: {
    deliveryDate,
    deliveryNumber,
    notes: 'Test delivery created by script'
  }
});

console.log(`\n✅ Utworzono dostawę:`);
console.log(`   ID: ${delivery.id}`);
console.log(`   Nazwa: ${delivery.deliveryNumber}`);
console.log(`   Data: ${delivery.deliveryDate}`);

await prisma.$disconnect();
