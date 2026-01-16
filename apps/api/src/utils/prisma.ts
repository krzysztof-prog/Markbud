/**
 * Prisma Client Singleton
 * Separate file to avoid circular dependency issues
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Inicjalizacja optymalizacji SQLite (WAL mode + performance settings)
 * Wywolaj przy starcie aplikacji
 */
export async function initializeSQLiteOptimizations(): Promise<void> {
  try {
    // WAL mode - lepszy wspolbiezny dostep, szybsze zapisy
    // Uzywamy $queryRawUnsafe bo PRAGMA zwraca wynik
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL');

    // NORMAL sync - bezpieczne z WAL, szybsze niz FULL
    await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL');

    // Czekaj 5 sekund przy blokadzie zamiast natychmiastowego bledu
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000');

    // 64MB cache w pamieci (wartosc ujemna = KB)
    await prisma.$queryRawUnsafe('PRAGMA cache_size=-64000');

    // Sprawdz czy WAL zostal wlaczony
    const result = await prisma.$queryRaw<Array<{ journal_mode: string }>>`PRAGMA journal_mode`;
    const mode = result[0]?.journal_mode;

    if (mode?.toLowerCase() !== 'wal') {
      console.warn(`[SQLite] Nie udalo sie wlaczyc WAL mode. Aktualny tryb: ${mode}`);
    } else {
      console.log('[SQLite] WAL mode aktywny + optymalizacje zastosowane');
    }
  } catch (error) {
    console.warn('[SQLite] Blad podczas inicjalizacji optymalizacji:', error);
    // Kontynuuj bez optymalizacji - aplikacja nadal bedzie dzialac
  }
}

export default prisma;