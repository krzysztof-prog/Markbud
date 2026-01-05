/**
 * Transaction Wrapper Utilities
 *
 * Provides a clean interface for database transactions using Prisma.
 * Ensures atomic operations across multiple database writes.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger.js';

/**
 * Execute a function within a Prisma transaction
 *
 * @example
 * ```typescript
 * const result = await withTransaction(prisma, async (tx) => {
 *   const delivery = await tx.delivery.create({ data: deliveryData });
 *   await tx.deliveryOrder.createMany({ data: orders });
 *   return delivery;
 * });
 * ```
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await prisma.$transaction(fn, options);
    const duration = Date.now() - startTime;

    logger.info('Transaction completed successfully', { duration });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Transaction failed', {
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Create a transaction function bound to a specific Prisma client
 *
 * Useful for dependency injection in services
 *
 * @example
 * ```typescript
 * const tx = createTransactionFn(prisma);
 *
 * // Later in service:
 * const result = await tx(async (client) => {
 *   // ... transaction operations
 * });
 * ```
 */
export function createTransactionFn(prisma: PrismaClient) {
  return <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: Parameters<typeof withTransaction>[2]
  ): Promise<T> => {
    return withTransaction(prisma, fn, options);
  };
}
