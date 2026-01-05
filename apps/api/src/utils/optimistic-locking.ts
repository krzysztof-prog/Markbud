/**
 * Optimistic Locking Utilities
 *
 * Provides retry logic for operations that use version-based optimistic locking.
 * Prevents concurrent update conflicts in warehouse stock operations.
 */

import { logger } from './logger.js';

export class OptimisticLockError extends Error {
  constructor(message: string, public readonly currentVersion: number) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 50,
  backoffMultiplier: 2,
};

/**
 * Retry wrapper for optimistic locking operations
 *
 * @example
 * ```typescript
 * const result = await withOptimisticLockRetry(async () => {
 *   return await updateWarehouseStock(profileId, colorId, newStock, currentVersion);
 * });
 * ```
 */
export async function withOptimisticLockRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Only retry on optimistic lock errors
      if (!(error instanceof OptimisticLockError)) {
        throw error;
      }

      lastError = error;

      // Don't delay after last attempt
      if (attempt < opts.maxRetries) {
        const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);

        logger.warn(`Optimistic lock conflict, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries: opts.maxRetries,
          currentVersion: error.currentVersion,
        });

        await sleep(delay);
      }
    }
  }

  logger.error('Optimistic lock retry failed after max attempts', {
    maxRetries: opts.maxRetries,
    lastError: lastError?.message,
  });

  throw new Error(
    `Optimistic lock conflict: Failed after ${opts.maxRetries} retries. ` +
    'Another process is modifying this record. Please try again.'
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
