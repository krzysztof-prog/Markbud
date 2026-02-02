/**
 * Import WebSocket Bridge
 *
 * Łączy eventy z kolejek importu i matchingu z WebSocket.
 * Umożliwia real-time aktualizacje na fronendzie.
 *
 * Eventy:
 * - import:started / import:completed / import:failed / import:retry
 * - matching:started / matching:completed / matching:failed / matching:retry
 */

import { importQueue } from './ImportQueueService.js';
import { matchingQueue } from './MatchingQueueService.js';
import {
  emitImportStarted,
  emitImportCompleted,
  emitImportFailed,
  emitImportRetry,
  emitMatchingStarted,
  emitMatchingCompleted,
  emitMatchingFailed,
  emitMatchingRetry,
} from '../event-emitter.js';
import { logger } from '../../utils/logger.js';

/**
 * Inicjalizuje bridge między kolejkami a WebSocket.
 * Wywołaj raz przy starcie serwera (w index.ts).
 */
export function initializeImportWebSocketBridge(): void {
  // ============================================================================
  // Import Queue Events
  // ============================================================================

  importQueue.on('job:started', (job) => {
    emitImportStarted({
      jobId: job.id,
      jobType: job.type,
      filePath: job.filePath,
    });
  });

  importQueue.on('job:completed', ({ job, result }) => {
    emitImportCompleted({
      jobId: job.id,
      jobType: job.type,
      filePath: job.filePath,
      orderId: result.orderId,
    });
  });

  importQueue.on('job:failed', ({ job, error }) => {
    emitImportFailed({
      jobId: job.id,
      jobType: job.type,
      filePath: job.filePath,
      error,
    });
  });

  importQueue.on('job:retry', ({ job, error, retryCount, retryInMs }) => {
    emitImportRetry({
      jobId: job.id,
      jobType: job.type,
      filePath: job.filePath,
      error,
      retryCount,
      retryInMs,
    });
  });

  // ============================================================================
  // Matching Queue Events
  // ============================================================================

  matchingQueue.on('job:started', (job) => {
    emitMatchingStarted({
      jobId: job.id,
      jobType: job.type,
      glassOrderId: job.metadata?.glassOrderId as number | undefined,
      glassDeliveryId: job.metadata?.glassDeliveryId as number | undefined,
      orderNumbers: job.metadata?.orderNumbers as string[] | undefined,
    });
  });

  matchingQueue.on('job:completed', ({ job, result }) => {
    emitMatchingCompleted({
      jobId: job.id,
      jobType: job.type,
      matchedCount: result.matchedCount,
      glassOrderId: job.metadata?.glassOrderId as number | undefined,
      glassDeliveryId: job.metadata?.glassDeliveryId as number | undefined,
      orderNumbers: job.metadata?.orderNumbers as string[] | undefined,
    });
  });

  matchingQueue.on('job:failed', ({ job, error }) => {
    emitMatchingFailed({
      jobId: job.id,
      jobType: job.type,
      error,
      glassOrderId: job.metadata?.glassOrderId as number | undefined,
      glassDeliveryId: job.metadata?.glassDeliveryId as number | undefined,
      orderNumbers: job.metadata?.orderNumbers as string[] | undefined,
    });
  });

  matchingQueue.on('job:retry', ({ job, error, retryCount, retryInMs }) => {
    emitMatchingRetry({
      jobId: job.id,
      jobType: job.type,
      error,
      retryCount,
      retryInMs,
      glassOrderId: job.metadata?.glassOrderId as number | undefined,
      glassDeliveryId: job.metadata?.glassDeliveryId as number | undefined,
      orderNumbers: job.metadata?.orderNumbers as string[] | undefined,
    });
  });

  logger.info('[ImportWebSocketBridge] Zainicjalizowano - eventy kolejek połączone z WebSocket');
}
