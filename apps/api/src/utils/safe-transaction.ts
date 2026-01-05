/**
 * Bezpieczne wrapery dla transakcji Prisma
 * Automatyczna obsługa błędów i rollback
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger.js';
import { InternalServerError } from './errors.js';

export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Wykonuje transakcję z automatyczną obsługą błędów
 *
 * @example
 * ```ts
 * const result = await safeTransaction(prisma, async (tx) => {
 *   const order = await tx.order.create({ data: orderData });
 *   await tx.orderRequirement.createMany({ data: requirements });
 *   return order;
 * });
 * ```
 */
export async function safeTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: PrismaTransaction) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  try {
    return await prisma.$transaction(fn, {
      maxWait: options?.maxWait || 5000, // 5 sekund
      timeout: options?.timeout || 10000, // 10 sekund
      isolationLevel: options?.isolationLevel,
    });
  } catch (error) {
    // Błędy Prisma są już obsługiwane przez middleware
    // Tutaj tylko logujemy i przekazujemy dalej
    logger.error('Błąd transakcji', {
      error: error instanceof Error ? error.message : 'Nieznany błąd',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}

/**
 * Wykonuje transakcję interaktywną z możliwością ręcznego commit/rollback
 *
 * @example
 * ```ts
 * await safeInteractiveTransaction(prisma, async (tx) => {
 *   const order = await tx.order.create({ data: orderData });
 *
 *   // Walidacja biznesowa
 *   if (!isValid(order)) {
 *     throw new ValidationError('Nieprawidłowe dane zlecenia');
 *   }
 *
 *   await tx.orderRequirement.createMany({ data: requirements });
 * });
 * ```
 */
export async function safeInteractiveTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: PrismaTransaction) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
  }
): Promise<T> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        try {
          return await fn(tx);
        } catch (error) {
          // Log błędu przed rollback
          logger.warn('Rollback transakcji z powodu błędu', {
            error: error instanceof Error ? error.message : 'Nieznany błąd',
          });
          throw error;
        }
      },
      {
        maxWait: options?.maxWait || 5000,
        timeout: options?.timeout || 10000,
      }
    );
  } catch (error) {
    logger.error('Błąd interaktywnej transakcji', {
      error: error instanceof Error ? error.message : 'Nieznany błąd',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}

/**
 * Retry wrapper dla transakcji - automatycznie powtarza w przypadku deadlock
 *
 * @example
 * ```ts
 * const result = await retryTransaction(prisma, async (tx) => {
 *   // Operacje bazodanowe które mogą wystąpić deadlock
 *   return await tx.order.update({ where: { id }, data });
 * }, { maxRetries: 3 });
 * ```
 */
export async function retryTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: PrismaTransaction) => Promise<T>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    maxWait?: number;
    timeout?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries || 3;
  const retryDelay = options?.retryDelay || 100; // ms

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await safeTransaction(prisma, fn, {
        maxWait: options?.maxWait,
        timeout: options?.timeout,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Nieznany błąd');

      // Sprawdź czy to błąd który warto retry'ować
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || // Transaction conflict
         error.code === 'P2028'); // Transaction timeout

      if (!shouldRetry || attempt === maxRetries) {
        logger.error('Transakcja nie powiodła się po retry', {
          attempts: attempt + 1,
          error: lastError.message,
        });
        throw error;
      }

      // Czekaj przed kolejną próbą (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      logger.warn('Retry transakcji', {
        attempt: attempt + 1,
        maxRetries,
        delayMs: delay,
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new InternalServerError('Transakcja nie powiodła się');
}

/**
 * Batch transaction - wykonuje wiele operacji w jednej transakcji
 *
 * @example
 * ```ts
 * await batchTransaction(prisma, [
 *   (tx) => tx.order.create({ data: order1 }),
 *   (tx) => tx.order.create({ data: order2 }),
 *   (tx) => tx.order.create({ data: order3 }),
 * ]);
 * ```
 */
export async function batchTransaction<T>(
  prisma: PrismaClient,
  operations: Array<(tx: PrismaTransaction) => Promise<T>>,
  options?: {
    maxWait?: number;
    timeout?: number;
  }
): Promise<T[]> {
  return safeTransaction(
    prisma,
    async (tx) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }

      return results;
    },
    options
  );
}
