/**
 * Import Transaction Service
 *
 * Manages Prisma transactions for import operations.
 * Responsibilities:
 * - Transaction management with proper isolation
 * - Rollback logic for failed operations
 * - Atomic operations for multi-step imports
 * - Error handling for database operations
 */

import type { PrismaClient, Prisma, FileImport } from '@prisma/client';
import { ImportRepository } from '../../repositories/ImportRepository.js';
import { logger } from '../../utils/logger.js';
import { DatabaseError } from '../../utils/errors.js';

/**
 * Transaction options for import operations
 */
export interface ImportTransactionOptions {
  timeout?: number;
  maxWait?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Default transaction options
 */
const DEFAULT_TRANSACTION_OPTIONS: ImportTransactionOptions = {
  timeout: 60000, // 60 seconds for large imports
  maxWait: 10000, // 10 seconds max wait for transaction slot
};

/**
 * Result of a transactional import operation
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rollbackPerformed?: boolean;
}

/**
 * Transaction client type (Prisma client within transaction)
 */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Import Transaction Service
 *
 * Provides transaction management for complex import operations.
 * Ensures data consistency through atomic operations and proper rollback.
 */
export class ImportTransactionService {
  constructor(
    private prisma: PrismaClient,
    private repository: ImportRepository
  ) {}

  // ============================================================
  // TRANSACTION EXECUTION
  // ============================================================

  /**
   * Execute a function within a transaction
   * Automatically handles commit on success and rollback on failure
   */
  async executeTransaction<T>(
    operation: (tx: TransactionClient) => Promise<T>,
    options: ImportTransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const mergedOptions = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };

    try {
      const result = await this.prisma.$transaction(operation, {
        timeout: mergedOptions.timeout,
        maxWait: mergedOptions.maxWait,
        isolationLevel: mergedOptions.isolationLevel,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nieznany blad transakcji';
      logger.error('Transaction failed, rolled back', { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
        rollbackPerformed: true,
      };
    }
  }

  /**
   * Execute transaction using repository wrapper
   * Simpler API for operations that don't need direct tx access
   */
  async executeRepositoryTransaction<T>(
    operation: (tx: TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.repository.executeTransaction(operation);
  }

  // ============================================================
  // IMPORT STATUS MANAGEMENT
  // ============================================================

  /**
   * Update import status atomically
   */
  async updateImportStatus(
    importId: number,
    status: 'pending' | 'processing' | 'completed' | 'error' | 'rejected',
    additionalData?: {
      processedAt?: Date;
      metadata?: string;
      errorMessage?: string;
    }
  ): Promise<FileImport> {
    try {
      return await this.repository.update(importId, {
        status,
        ...additionalData,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany blad';
      logger.error('Failed to update import status', { importId, status, error: message });
      throw new DatabaseError(`Blad aktualizacji statusu importu: ${message}`);
    }
  }

  /**
   * Mark import as processing (start of operation)
   */
  async markAsProcessing(importId: number): Promise<FileImport> {
    return this.updateImportStatus(importId, 'processing');
  }

  /**
   * Mark import as completed with result metadata
   */
  async markAsCompleted(
    importId: number,
    result: Record<string, unknown>
  ): Promise<FileImport> {
    return this.updateImportStatus(importId, 'completed', {
      processedAt: new Date(),
      metadata: JSON.stringify(result),
    });
  }

  /**
   * Mark import as error with error message
   */
  async markAsError(importId: number, errorMessage: string): Promise<FileImport> {
    return this.updateImportStatus(importId, 'error', { errorMessage });
  }

  /**
   * Mark import as rejected
   */
  async markAsRejected(
    importId: number,
    metadata?: Record<string, unknown>
  ): Promise<FileImport> {
    return this.updateImportStatus(importId, 'rejected', {
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }

  // ============================================================
  // ORDER DELETION IN TRANSACTION
  // ============================================================

  /**
   * Delete order and all related data within a transaction
   * Handles: requirements, windows, delivery associations
   */
  async deleteOrderWithDependencies(
    tx: TransactionClient,
    orderId: number
  ): Promise<void> {
    // Delete requirements first
    await tx.orderRequirement.deleteMany({
      where: { orderId },
    });

    // Delete windows
    await tx.orderWindow.deleteMany({
      where: { orderId },
    });

    // Delete delivery associations
    await tx.deliveryOrder.deleteMany({
      where: { orderId },
    });

    // Delete the order itself
    await tx.order.delete({
      where: { id: orderId },
    });

    logger.info(`Order ${orderId} and all dependencies deleted`);
  }

  /**
   * Delete multiple orders with their dependencies
   * All deletions happen in a single transaction
   */
  async deleteMultipleOrdersWithDependencies(
    orderIds: number[]
  ): Promise<TransactionResult<{ deletedCount: number }>> {
    if (orderIds.length === 0) {
      return { success: true, data: { deletedCount: 0 } };
    }

    return this.executeTransaction(async (tx) => {
      for (const orderId of orderIds) {
        await this.deleteOrderWithDependencies(tx, orderId);
      }

      return { deletedCount: orderIds.length };
    });
  }

  // ============================================================
  // DELIVERY OPERATIONS
  // ============================================================

  /**
   * Create or find delivery within a transaction
   */
  async findOrCreateDelivery(
    tx: TransactionClient,
    deliveryDate: Date,
    deliveryNumber: 'I' | 'II' | 'III'
  ): Promise<{ id: number; created: boolean }> {
    // Check if delivery exists
    const existing = await tx.delivery.findFirst({
      where: {
        deliveryDate: {
          gte: new Date(
            deliveryDate.getFullYear(),
            deliveryDate.getMonth(),
            deliveryDate.getDate()
          ),
          lt: new Date(
            deliveryDate.getFullYear(),
            deliveryDate.getMonth(),
            deliveryDate.getDate() + 1
          ),
        },
        deliveryNumber,
      },
    });

    if (existing) {
      return { id: existing.id, created: false };
    }

    // Create new delivery
    const created = await tx.delivery.create({
      data: {
        deliveryDate,
        deliveryNumber,
        status: 'planned',
      },
    });

    logger.info(`Created new delivery: ${deliveryNumber} on ${deliveryDate.toLocaleDateString('pl-PL')}`);

    return { id: created.id, created: true };
  }

  /**
   * Add order to delivery within a transaction
   * Returns false if order is already in delivery
   */
  async addOrderToDeliveryInTransaction(
    tx: TransactionClient,
    deliveryId: number,
    orderId: number
  ): Promise<boolean> {
    // Check if already exists
    const existing = await tx.deliveryOrder.findUnique({
      where: {
        deliveryId_orderId: {
          deliveryId,
          orderId,
        },
      },
    });

    if (existing) {
      return false;
    }

    // Get max position
    const maxResult = await tx.deliveryOrder.aggregate({
      where: { deliveryId },
      _max: { position: true },
    });
    const nextPosition = (maxResult._max.position || 0) + 1;

    // Create association
    await tx.deliveryOrder.create({
      data: {
        deliveryId,
        orderId,
        position: nextPosition,
      },
    });

    return true;
  }

  // ============================================================
  // PENDING ORDER PRICE OPERATIONS
  // ============================================================

  /**
   * Create pending order price within a transaction
   */
  async createPendingOrderPrice(
    tx: TransactionClient,
    data: {
      orderNumber: string;
      reference?: string | null;
      currency: string;
      valueNetto: number;
      valueBrutto?: number | null;
      filename: string;
      filepath: string;
      importId: number;
    }
  ): Promise<{ id: number }> {
    const result = await tx.pendingOrderPrice.create({
      data: {
        orderNumber: data.orderNumber,
        reference: data.reference || null,
        currency: data.currency,
        valueNetto: data.valueNetto,
        valueBrutto: data.valueBrutto || null,
        filename: data.filename,
        filepath: data.filepath,
        importId: data.importId,
        status: 'pending',
      },
    });

    logger.info(`Created pending order price for ${data.orderNumber}`);

    return { id: result.id };
  }

  /**
   * Create pending order price without transaction (convenience method)
   */
  async createPendingOrderPriceSimple(
    data: {
      orderNumber: string;
      reference?: string | null;
      currency: string;
      valueNetto: number;
      valueBrutto?: number | null;
      filename: string;
      filepath: string;
      importId: number;
    }
  ): Promise<{ id: number }> {
    const result = await this.prisma.pendingOrderPrice.create({
      data: {
        orderNumber: data.orderNumber,
        reference: data.reference || null,
        currency: data.currency,
        valueNetto: data.valueNetto,
        valueBrutto: data.valueBrutto || null,
        filename: data.filename,
        filepath: data.filepath,
        importId: data.importId,
        status: 'pending',
      },
    });

    return { id: result.id };
  }

  // ============================================================
  // FILE IMPORT RECORD OPERATIONS
  // ============================================================

  /**
   * Create import record within a transaction
   */
  async createImportRecord(
    tx: TransactionClient,
    data: {
      filename: string;
      filepath: string;
      fileType: string;
      status?: string;
      metadata?: string;
    }
  ): Promise<FileImport> {
    return tx.fileImport.create({
      data: {
        filename: data.filename,
        filepath: data.filepath,
        fileType: data.fileType,
        status: data.status || 'pending',
        metadata: data.metadata,
      },
    });
  }

  /**
   * Update import record within a transaction
   */
  async updateImportRecord(
    tx: TransactionClient,
    importId: number,
    data: {
      status?: string;
      processedAt?: Date;
      metadata?: string;
      errorMessage?: string;
    }
  ): Promise<FileImport> {
    return tx.fileImport.update({
      where: { id: importId },
      data,
    });
  }
}
