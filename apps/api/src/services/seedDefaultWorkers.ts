/**
 * Seed Default Data - Pracownicy, Stanowiska, Zadania nieprodukcyjne
 *
 * Ta funkcja jest wywoływana automatycznie przy starcie serwera.
 * Tworzy domyślne dane jeśli nie istnieją.
 * NIE usuwa ani nie modyfikuje istniejących danych.
 */

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// ============================================
// STANOWISKA PRODUKCYJNE
// ============================================
const DEFAULT_POSITIONS = [
  { name: 'Cięcie', shortName: 'CIĘ' },
  { name: 'Zbrojenie', shortName: 'ZBR' },
  { name: 'Słupki', shortName: 'SŁU' },
  { name: 'Spawanie', shortName: 'SPA' },
  { name: 'Okuwanie skrzydeł', shortName: 'OKS' },
  { name: 'Szklenie', shortName: 'SZK' },
  { name: 'Okuwanie ram', shortName: 'OKR' },
  { name: 'Pakowanie', shortName: 'PAK' },
  { name: 'Słupki - frez', shortName: 'SŁF' },
  { name: 'Piła', shortName: 'PIŁ' },
  { name: 'Zgrzewanie', shortName: 'ZGR' },
  { name: 'Kierowca', shortName: 'KIE' },
  { name: 'Nieprzypisane', shortName: '-' },
] as const;

// ============================================
// ZADANIA NIEPRODUKCYJNE
// ============================================
const DEFAULT_NON_PRODUCTIVE_TASKS = [
  'Urlop',
  'Serwis',
  'L4',
  'Pakowanie',
  'Sprzątanie',
  'Przygotowywanie profili',
  'Szkolenie',
  'Paletówki',
  'Inne',
  'Kierowca',
] as const;

// ============================================
// PRACOWNICY PRODUKCYJNI Z PRZYPISANYMI STANOWISKAMI
// ============================================
const DEFAULT_WORKERS = [
  { firstName: 'EDWARD', lastName: 'CHOJNACKI', position: 'Szklenie' },
  { firstName: 'ADAM', lastName: 'DĄBKOWSKI', position: 'Słupki' },
  { firstName: 'TOMASZ', lastName: 'DZIECIĄTKO', position: 'Okuwanie skrzydeł' },
  { firstName: 'KAMIL', lastName: 'CZARZASTY', position: 'Nieprzypisane' },
  { firstName: 'MICHAŁ', lastName: 'PRZYBYSZ', position: 'Okuwanie ram' },
  { firstName: 'JURI', lastName: 'KOBYLANSKIJ', position: 'Słupki - frez' },
  { firstName: 'RYSZARD', lastName: 'BIELIŃSKI', position: 'Okuwanie ram' },
  { firstName: 'IHOR', lastName: 'PASALIUK', position: 'Nieprzypisane' },
  { firstName: 'VODOMIR', lastName: 'SAMCZUK', position: 'Piła' },
  { firstName: 'OLEH', lastName: 'PROHOLA', position: 'Zbrojenie' },
  { firstName: 'TOUT', lastName: 'DIMA', position: 'Nieprzypisane' },
  { firstName: 'PIOTR', lastName: 'NIEDOBYLSKI', position: 'Szklenie' },
  { firstName: 'WALERA', lastName: 'SZTANDENKO', position: 'Nieprzypisane' },
  { firstName: 'LESZEK', lastName: 'MARCIOHA', position: 'Kierowca' },
  { firstName: 'KRZYSZTOF', lastName: 'LATUSZEK', position: 'Szklenie' },
  { firstName: 'ZBIGNIEW', lastName: 'ZYCH', position: 'Zgrzewanie' },
  { firstName: 'OLEKSANDR', lastName: 'DANILUK', position: 'Nieprzypisane' },
  { firstName: 'TOMASZ', lastName: 'HERMAN', position: 'Nieprzypisane' },
] as const;

/**
 * Seeduje domyślne stanowiska produkcyjne.
 * Tworzy tylko jeśli nie istnieją.
 */
async function seedPositions(prisma: PrismaClient): Promise<void> {
  let created = 0;

  for (let i = 0; i < DEFAULT_POSITIONS.length; i++) {
    const position = DEFAULT_POSITIONS[i];

    const existing = await prisma.position.findUnique({
      where: { name: position.name },
    });

    if (!existing) {
      await prisma.position.create({
        data: {
          name: position.name,
          shortName: position.shortName,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      created++;
    }
  }

  if (created > 0) {
    logger.info(`Utworzono ${created} stanowisk`);
  }
}

/**
 * Seeduje domyślne typy zadań nieprodukcyjnych.
 * Tworzy tylko jeśli nie istnieją.
 */
async function seedNonProductiveTasks(prisma: PrismaClient): Promise<void> {
  let created = 0;

  for (let i = 0; i < DEFAULT_NON_PRODUCTIVE_TASKS.length; i++) {
    const taskName = DEFAULT_NON_PRODUCTIVE_TASKS[i];

    const existing = await prisma.nonProductiveTaskType.findUnique({
      where: { name: taskName },
    });

    if (!existing) {
      await prisma.nonProductiveTaskType.create({
        data: {
          name: taskName,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      created++;
    }
  }

  if (created > 0) {
    logger.info(`Utworzono ${created} typów zadań nieprodukcyjnych`);
  }
}

/**
 * Seeduje domyślnych pracowników produkcyjnych.
 * Tworzy tylko jeśli nie istnieją.
 */
async function seedWorkers(prisma: PrismaClient): Promise<void> {
  let created = 0;

  for (let i = 0; i < DEFAULT_WORKERS.length; i++) {
    const worker = DEFAULT_WORKERS[i];

    const existing = await prisma.worker.findFirst({
      where: {
        firstName: worker.firstName,
        lastName: worker.lastName,
      },
    });

    if (!existing) {
      await prisma.worker.create({
        data: {
          firstName: worker.firstName,
          lastName: worker.lastName,
          defaultPosition: worker.position,
          isActive: true,
          sortOrder: i + 1,
        },
      });
      created++;
    }
  }

  if (created > 0) {
    logger.info(`Utworzono ${created} domyślnych pracowników`);
  }
}

/**
 * Główna funkcja seedująca - wywoływana przy starcie serwera.
 * Tworzy domyślne stanowiska, zadania nieprodukcyjne i pracowników.
 * NIE usuwa ani nie modyfikuje istniejących danych - bezpieczne dla produkcji.
 */
export async function seedDefaultWorkers(prisma: PrismaClient): Promise<void> {
  try {
    logger.info('Sprawdzanie domyślnych danych modułu godzinówek...');

    // 1. Stanowiska produkcyjne (musi być przed pracownikami)
    await seedPositions(prisma);

    // 2. Typy zadań nieprodukcyjnych
    await seedNonProductiveTasks(prisma);

    // 3. Pracownicy produkcyjni
    await seedWorkers(prisma);

  } catch (error) {
    logger.error('Błąd podczas seedowania danych godzinówek:', error);
    // Nie rzucamy błędu - serwer powinien wystartować nawet jeśli seed się nie powiódł
  }
}
