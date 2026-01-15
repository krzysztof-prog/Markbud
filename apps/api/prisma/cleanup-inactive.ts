/**
 * Jednorazowy skrypt do usunięcia nieaktywnych danych z bazy.
 * Uruchom: npx tsx prisma/cleanup-inactive.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Czyszczenie nieaktywnych danych...\n');

  // Pobierz ID nieaktywnych rekordów
  const inactivePositions = await prisma.position.findMany({
    where: { isActive: false },
    select: { id: true, name: true },
  });

  const inactiveTasks = await prisma.nonProductiveTaskType.findMany({
    where: { isActive: false },
    select: { id: true, name: true },
  });

  const inactiveWorkers = await prisma.worker.findMany({
    where: { isActive: false },
    select: { id: true, firstName: true, lastName: true },
  });

  console.log('Do usunięcia:');
  console.log(`  - Stanowiska: ${inactivePositions.map(p => p.name).join(', ') || 'brak'}`);
  console.log(`  - Zadania: ${inactiveTasks.map(t => t.name).join(', ') || 'brak'}`);
  console.log(`  - Pracownicy: ${inactiveWorkers.map(w => `${w.firstName} ${w.lastName}`).join(', ') || 'brak'}`);
  console.log('');

  // 1. Usuń wpisy TimeEntry powiązane z nieaktywnymi stanowiskami
  if (inactivePositions.length > 0) {
    const positionIds = inactivePositions.map(p => p.id);
    const deletedEntries = await prisma.timeEntry.deleteMany({
      where: { positionId: { in: positionIds } },
    });
    if (deletedEntries.count > 0) {
      console.log(`🗑️  Usunięto ${deletedEntries.count} wpisów godzinowych powiązanych z nieaktywnymi stanowiskami`);
    }
  }

  // 2. Usuń wpisy TimeEntry powiązane z nieaktywnymi pracownikami
  if (inactiveWorkers.length > 0) {
    const workerIds = inactiveWorkers.map(w => w.id);
    const deletedEntries = await prisma.timeEntry.deleteMany({
      where: { workerId: { in: workerIds } },
    });
    if (deletedEntries.count > 0) {
      console.log(`🗑️  Usunięto ${deletedEntries.count} wpisów godzinowych powiązanych z nieaktywnymi pracownikami`);
    }
  }

  // 3. Usuń nieaktywne stanowiska
  const deletedPositions = await prisma.position.deleteMany({
    where: { isActive: false },
  });
  console.log(`✅ Usunięto ${deletedPositions.count} nieaktywnych stanowisk`);

  // 4. Usuń nieaktywne typy zadań nieprodukcyjnych
  const deletedTasks = await prisma.nonProductiveTaskType.deleteMany({
    where: { isActive: false },
  });
  console.log(`✅ Usunięto ${deletedTasks.count} nieaktywnych typów zadań`);

  // 5. Usuń nieaktywnych pracowników
  const deletedWorkers = await prisma.worker.deleteMany({
    where: { isActive: false },
  });
  console.log(`✅ Usunięto ${deletedWorkers.count} nieaktywnych pracowników`);

  // Pokaż co zostało
  console.log('\n📊 Stan po czyszczeniu:');

  const positions = await prisma.position.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log(`\nStanowiska (${positions.length}):`);
  positions.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));

  const tasks = await prisma.nonProductiveTaskType.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log(`\nZadania nieprodukcyjne (${tasks.length}):`);
  tasks.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));

  const workers = await prisma.worker.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log(`\nPracownicy (${workers.length}):`);
  workers.forEach((w, i) => console.log(`  ${i + 1}. ${w.firstName} ${w.lastName} - ${w.defaultPosition}`));

  console.log('\n🎉 Gotowe!');
}

main()
  .catch((e) => {
    console.error('❌ Błąd:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
