/**
 * Import Lock Service - Distributed folder locking for concurrent imports
 *
 * Provides distributed locking mechanism to prevent multiple users from
 * importing the same folder simultaneously.
 *
 * Features:
 * - Atomic lock acquisition using unique constraint
 * - Automatic lock expiration (5 minutes)
 * - User tracking for debugging and notifications
 * - Process ID tracking for debugging
 * - Graceful handling of lock conflicts
 */

import type { PrismaClient, ImportLock } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { ConflictError } from '../utils/errors.js';

// P0-R3: Dynamic lock expiration - base 5 minutes + 30s per file
const BASE_LOCK_EXPIRATION_MS = 300000; // 5 minutes base
const PER_FILE_EXTENSION_MS = 30000; // 30 seconds per file
const MAX_LOCK_EXPIRATION_MS = 1800000; // 30 minutes max
const HEARTBEAT_INTERVAL_MS = 120000; // 2 minutes heartbeat

interface ImportLockWithUser extends ImportLock {
  user: {
    name: string;
  };
}

export class ImportLockService {
  constructor(private prisma: PrismaClient) {}

  /**
   * P0-R3: Calculate dynamic lock expiration based on file count
   * Base 5 min + 30s per file, max 30 min
   */
  private calculateExpiration(fileCount: number = 1): Date {
    const dynamicMs = BASE_LOCK_EXPIRATION_MS + fileCount * PER_FILE_EXTENSION_MS;
    const cappedMs = Math.min(dynamicMs, MAX_LOCK_EXPIRATION_MS);
    return new Date(Date.now() + cappedMs);
  }

  /**
   * Try to acquire a lock for a folder
   *
   * @param folderPath - Absolute path to the folder being imported
   * @param userId - ID of the user requesting the lock
   * @param fileCount - Number of files to import (for dynamic expiration)
   * @returns Lock object if successful, null if lock already exists
   * @throws ConflictError if lock is held by another user
   */
  async acquireLock(folderPath: string, userId: number, fileCount: number = 1): Promise<ImportLock | null> {
    const expiresAt = this.calculateExpiration(fileCount);
    const processId = String(process.pid);

    logger.info('Attempting to acquire import lock', {
      folderPath,
      userId,
      processId,
      expiresAt,
    });

    try {
      // Use transaction for atomic operation
      const lock = await this.prisma.$transaction(async (tx) => {
        // Check if an active lock exists
        const existingLock = await tx.importLock.findUnique({
          where: { folderPath },
          include: { user: { select: { name: true } } },
        });

        // If lock exists and not expired, check ownership
        if (existingLock) {
          const isExpired = new Date() > existingLock.expiresAt;

          if (!isExpired) {
            // Lock is active
            if (existingLock.userId === userId) {
              // Same user - extend the lock
              logger.info('Extending existing lock for same user', {
                lockId: existingLock.id,
                folderPath,
                userId,
              });

              return tx.importLock.update({
                where: { id: existingLock.id },
                data: { expiresAt },
              });
            } else {
              // Different user - throw conflict
              logger.warn('Lock already held by another user', {
                folderPath,
                requestingUserId: userId,
                lockOwnerId: existingLock.userId,
                lockOwnerName: existingLock.user.name,
              });

              throw new ConflictError(
                `Folder jest obecnie importowany przez użytkownika: ${existingLock.user.name}`
              );
            }
          } else {
            // Lock expired - delete it first
            logger.info('Deleting expired lock', {
              lockId: existingLock.id,
              folderPath,
              expiredAt: existingLock.expiresAt,
            });

            await tx.importLock.delete({
              where: { id: existingLock.id },
            });
          }
        }

        // Create new lock
        const newLock = await tx.importLock.create({
          data: {
            folderPath,
            userId,
            expiresAt,
            processId,
          },
        });

        logger.info('Lock acquired successfully', {
          lockId: newLock.id,
          folderPath,
          userId,
          processId,
        });

        return newLock;
      });

      return lock;
    } catch (error) {
      // If it's our ConflictError, rethrow it
      if (error instanceof ConflictError) {
        throw error;
      }

      // Handle unique constraint violation (race condition)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint failed - another process acquired the lock
          logger.warn('Lock acquisition failed - unique constraint violation', {
            folderPath,
            userId,
            errorCode: error.code,
          });

          // Fetch the existing lock to provide user info
          const existingLock = await this.prisma.importLock.findUnique({
            where: { folderPath },
            include: { user: { select: { name: true } } },
          });

          if (existingLock) {
            throw new ConflictError(
              `Folder jest obecnie importowany przez użytkownika: ${existingLock.user.name}`
            );
          }

          // Shouldn't happen, but handle gracefully
          throw new ConflictError('Folder jest obecnie importowany przez innego użytkownika');
        }
      }

      // Log unexpected error and rethrow
      logger.error('Unexpected error acquiring import lock', error, {
        folderPath,
        userId,
      });
      throw error;
    }
  }

  /**
   * Release a lock by its ID or folder path
   *
   * @param lockIdOrPath - ID of the lock to release or folder path
   */
  async releaseLock(lockIdOrPath: number | string): Promise<void> {
    if (typeof lockIdOrPath === 'number') {
      logger.info('Releasing import lock by ID', { lockId: lockIdOrPath });

      try {
        await this.prisma.importLock.delete({
          where: { id: lockIdOrPath },
        });

        logger.info('Lock released successfully', { lockId: lockIdOrPath });
      } catch (error) {
        // Handle case where lock doesn't exist (already expired/deleted)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            logger.warn('Lock not found - may have already been released or expired', {
              lockId: lockIdOrPath,
            });
            return;
          }
        }

        logger.error('Error releasing import lock', error, { lockId: lockIdOrPath });
        throw error;
      }
    } else {
      // Release by folder path
      logger.info('Releasing import lock by folder path', { folderPath: lockIdOrPath });

      try {
        await this.prisma.importLock.delete({
          where: { folderPath: lockIdOrPath },
        });

        logger.info('Lock released successfully', { folderPath: lockIdOrPath });
      } catch (error) {
        // Handle case where lock doesn't exist (already expired/deleted)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            logger.warn('Lock not found - may have already been released or expired', {
              folderPath: lockIdOrPath,
            });
            return;
          }
        }

        logger.error('Error releasing import lock', error, { folderPath: lockIdOrPath });
        throw error;
      }
    }
  }

  /**
   * Check if a folder is currently locked
   *
   * FIXED: Now uses transaction to prevent race condition during expired lock cleanup
   *
   * @param folderPath - Path to check
   * @returns Lock with user info if locked and not expired, null otherwise
   */
  async checkLock(folderPath: string): Promise<ImportLockWithUser | null> {
    logger.debug('Checking import lock', { folderPath });

    // Use transaction to atomically check and delete expired locks
    return this.prisma.$transaction(async (tx) => {
      const lock = await tx.importLock.findUnique({
        where: { folderPath },
        include: {
          user: {
            select: { name: true },
          },
        },
      });

      if (!lock) {
        logger.debug('No lock found for folder', { folderPath });
        return null;
      }

      // Check if expired
      const isExpired = new Date() > lock.expiresAt;

      if (isExpired) {
        logger.debug('Lock found but expired, deleting atomically', {
          lockId: lock.id,
          folderPath,
          expiresAt: lock.expiresAt,
        });

        try {
          // Delete within transaction - atomic with the check
          await tx.importLock.delete({
            where: { id: lock.id },
          });

          logger.debug('Expired lock deleted successfully', { lockId: lock.id });
        } catch (error) {
          // Handle P2025 (record not found) - another transaction deleted it
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            logger.debug('Lock already deleted by another process', { lockId: lock.id });
          } else {
            // Unexpected error - log but still return null
            logger.warn('Unexpected error deleting expired lock', {
              lockId: lock.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        return null;
      }

      logger.debug('Active lock found', {
        lockId: lock.id,
        folderPath,
        userId: lock.userId,
        userName: lock.user.name,
        expiresAt: lock.expiresAt,
      });

      return lock;
    });
  }

  /**
   * Clean up all expired locks
   * Intended to be called by a cron job or periodic cleanup task
   *
   * @returns Number of locks deleted
   */
  async cleanupExpiredLocks(): Promise<number> {
    logger.info('Starting cleanup of expired import locks');

    const now = new Date();

    try {
      const result = await this.prisma.importLock.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      logger.info('Expired locks cleanup completed', {
        deletedCount: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Error during expired locks cleanup', error);
      throw error;
    }
  }

  /**
   * Get all active locks (for debugging/monitoring)
   *
   * @returns Array of all non-expired locks with user information
   */
  async getActiveLocks(): Promise<ImportLockWithUser[]> {
    const now = new Date();

    const locks = await this.prisma.importLock.findMany({
      where: {
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: {
        lockedAt: 'desc',
      },
    });

    logger.debug('Retrieved active locks', { count: locks.length });

    return locks;
  }

  /**
   * Force release a lock (admin operation)
   * Use with caution - should only be used when a lock is stuck
   *
   * @param folderPath - Path of the lock to force release
   */
  async forceReleaseLock(folderPath: string): Promise<void> {
    logger.warn('Force releasing lock', { folderPath });

    try {
      const result = await this.prisma.importLock.deleteMany({
        where: { folderPath },
      });

      logger.info('Lock force released', {
        folderPath,
        deletedCount: result.count,
      });
    } catch (error) {
      logger.error('Error force releasing lock', error, { folderPath });
      throw error;
    }
  }

  /**
   * P0-R3: Heartbeat - extend lock expiration during long imports
   * Should be called every 2 minutes during import
   *
   * @param lockId - ID of the lock to extend
   * @param remainingFiles - Number of remaining files (for dynamic extension)
   * @returns true if lock was extended, false if lock not found/expired
   */
  async heartbeat(lockId: number, remainingFiles: number = 1): Promise<boolean> {
    try {
      const lock = await this.prisma.importLock.findUnique({
        where: { id: lockId },
      });

      if (!lock) {
        logger.warn('Heartbeat failed - lock not found', { lockId });
        return false;
      }

      // Check if lock is expired
      if (new Date() > lock.expiresAt) {
        logger.warn('Heartbeat failed - lock already expired', {
          lockId,
          expiredAt: lock.expiresAt,
        });
        return false;
      }

      // Extend lock expiration
      const newExpiresAt = this.calculateExpiration(remainingFiles);

      await this.prisma.importLock.update({
        where: { id: lockId },
        data: { expiresAt: newExpiresAt },
      });

      logger.debug('Lock heartbeat successful', {
        lockId,
        remainingFiles,
        newExpiresAt,
      });

      return true;
    } catch (error) {
      logger.error('Error during lock heartbeat', error, { lockId });
      return false;
    }
  }

  /**
   * P0-R3: Create a heartbeat manager for long-running imports
   * Returns functions to start/stop the heartbeat
   */
  createHeartbeatManager(
    lockId: number,
    getRemainingFiles: () => number
  ): { start: () => void; stop: () => void } {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return; // Already started

      intervalId = setInterval(async () => {
        const remaining = getRemainingFiles();
        const success = await this.heartbeat(lockId, remaining);

        if (!success) {
          logger.error('Heartbeat failed, stopping heartbeat manager', { lockId });
          stop();
        }
      }, HEARTBEAT_INTERVAL_MS);

      logger.info('Heartbeat manager started', { lockId, intervalMs: HEARTBEAT_INTERVAL_MS });
    };

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info('Heartbeat manager stopped', { lockId });
      }
    };

    return { start, stop };
  }
}
