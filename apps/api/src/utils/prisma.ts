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

    // Czekaj 30 sekund przy blokadzie zamiast natychmiastowego bledu
    // (zwiekszone z 5s - dla duzych operacji batch jak Schuco import)
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=30000');

    // 64MB cache w pamieci (wartosc ujemna = KB)
    await prisma.$queryRawUnsafe('PRAGMA cache_size=-64000');

    // Sprawdz czy WAL zostal wlaczony
    const result = await prisma.$queryRaw<Array<{ journal_mode: string }>>`PRAGMA journal_mode`;
    const mode = result[0]?.journal_mode;

    if (mode?.toLowerCase() !== 'wal') {
      console.warn(`[SQLite] Nie udalo sie wlaczyc WAL mode. Aktualny tryb: ${mode}`);
    } else {
      console.log('[SQLite] WAL mode aktywny + optymalizacje zastosowane (busy_timeout=30s)');
    }
  } catch (error) {
    console.warn('[SQLite] Blad podczas inicjalizacji optymalizacji:', error);
    // Kontynuuj bez optymalizacji - aplikacja nadal bedzie dzialac
  }
}

/**
 * Helper do wykonywania operacji z retry przy timeout SQLite
 * Uzyj dla operacji ktore moga trwac dlugo (batch updates, duze importy)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; operationName?: string } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, operationName = 'operation' } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const isTimeout = lastError.message?.includes('timed out') ||
                       lastError.message?.includes('SQLITE_BUSY') ||
                       lastError.message?.includes('database is locked');

      if (!isTimeout || attempt === maxRetries) {
        throw lastError;
      }

      console.warn(`[SQLite] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt)); // Exponential backoff
    }
  }

  throw lastError;
}

export default prisma;