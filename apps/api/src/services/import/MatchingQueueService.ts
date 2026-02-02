/**
 * Matching Queue Service
 *
 * Osobna kolejka dla ciężkich operacji matchowania (glass orders ↔ deliveries).
 * Rozwiązuje problem zagnieżdżonych transakcji SQLite - matching jest wykonywany
 * POZA transakcją importu, w osobnej kolejce.
 *
 * Funkcjonalności:
 * - Sekwencyjne przetwarzanie (1 matching na raz)
 * - Auto-retry z exponential backoff
 * - Dłuższe timeouty niż ImportQueue (cięższe operacje)
 * - Eventy dla WebSocket notifications
 */

import { logger } from '../../utils/logger.js';
import { EventEmitter } from 'events';

// Typy zadań matchingowych
export type MatchingJobType =
  | 'glass_order_matching'    // Matching po imporcie zamówienia szyb
  | 'glass_delivery_matching' // Matching po imporcie dostawy szyb
  | 'order_rematch';          // Re-matching dla konkretnych zleceń

export interface MatchingJob {
  id: string;
  type: MatchingJobType;
  priority: number; // Niższa wartość = wyższy priorytet
  addedAt: Date;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  metadata?: {
    glassOrderId?: number;
    glassDeliveryId?: number;
    orderNumbers?: string[];
    source?: string;
    [key: string]: unknown;
  };
  // Funkcja do wykonania - zwraca Promise z wynikiem
  execute: () => Promise<MatchingJobResult>;
}

export interface MatchingJobResult {
  success: boolean;
  matchedCount?: number;
  error?: string;
  shouldRetry?: boolean;
}

export interface MatchingQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  totalProcessed: number;
  averageProcessingTimeMs: number;
}

// Konfiguracja kolejki - dłuższe czasy niż ImportQueue
interface MatchingQueueConfig {
  // Opóźnienie między jobami (ms) - dłuższe bo cięższe operacje
  delayBetweenJobsMs: number;
  // Maksymalna liczba prób
  defaultMaxRetries: number;
  // Opóźnienie przed retry (ms) - rośnie z każdą próbą
  baseRetryDelayMs: number;
  // Maksymalne opóźnienie retry (ms)
  maxRetryDelayMs: number;
}

const DEFAULT_CONFIG: MatchingQueueConfig = {
  delayBetweenJobsMs: 1000,   // 1s między jobami (więcej niż ImportQueue)
  defaultMaxRetries: 3,
  baseRetryDelayMs: 5000,     // 5s base retry (więcej niż ImportQueue)
  maxRetryDelayMs: 60000,     // 60s max retry
};

/**
 * Singleton kolejki matchingowej
 * Zapewnia że wszystkie operacje matching używają tej samej kolejki
 */
class MatchingQueueService extends EventEmitter {
  private static instance: MatchingQueueService | null = null;

  private queue: MatchingJob[] = [];
  private retryQueue: MatchingJob[] = [];
  private isProcessing = false;
  private currentJob: MatchingJob | null = null;
  private config: MatchingQueueConfig;

  // Statystyki
  private stats = {
    completed: 0,
    failed: 0,
    totalProcessingTimeMs: 0,
  };

  private constructor(config: Partial<MatchingQueueConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('[MatchingQueue] Kolejka matchingu zainicjalizowana', {
      delayBetweenJobsMs: this.config.delayBetweenJobsMs,
      defaultMaxRetries: this.config.defaultMaxRetries,
    });
  }

  /**
   * Pobiera instancję singletona
   */
  static getInstance(config?: Partial<MatchingQueueConfig>): MatchingQueueService {
    if (!MatchingQueueService.instance) {
      MatchingQueueService.instance = new MatchingQueueService(config);
    }
    return MatchingQueueService.instance;
  }

  /**
   * Resetuje singleton (tylko do testów)
   */
  static resetInstance(): void {
    if (MatchingQueueService.instance) {
      MatchingQueueService.instance.clear();
      MatchingQueueService.instance = null;
    }
  }

  /**
   * Dodaje zadanie do kolejki
   */
  enqueue(
    job: Omit<MatchingJob, 'id' | 'addedAt' | 'retryCount' | 'maxRetries'> & { maxRetries?: number }
  ): string {
    const jobId = `match-${job.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const fullJob: MatchingJob = {
      ...job,
      id: jobId,
      addedAt: new Date(),
      retryCount: 0,
      maxRetries: job.maxRetries ?? this.config.defaultMaxRetries,
    };

    // Wstaw według priorytetu (niższy = wcześniej)
    const insertIndex = this.queue.findIndex((j) => j.priority > fullJob.priority);
    if (insertIndex === -1) {
      this.queue.push(fullJob);
    } else {
      this.queue.splice(insertIndex, 0, fullJob);
    }

    logger.info(`[MatchingQueue] Dodano do kolejki: ${job.type}`, {
      jobId,
      type: job.type,
      priority: job.priority,
      queueLength: this.queue.length,
      metadata: job.metadata,
    });

    this.emit('job:added', fullJob);

    // Uruchom przetwarzanie jeśli nie działa
    if (!this.isProcessing) {
      this.processNext();
    }

    return jobId;
  }

  /**
   * Przetwarza następne zadanie w kolejce
   */
  private async processNext(): Promise<void> {
    // Sprawdź czy jest coś do przetworzenia
    if (this.queue.length === 0 && this.retryQueue.length === 0) {
      this.isProcessing = false;
      this.currentJob = null;
      logger.info('[MatchingQueue] Kolejka pusta - przetwarzanie zakończone');
      this.emit('queue:empty');
      return;
    }

    this.isProcessing = true;

    // Najpierw sprawdź retry queue
    const now = Date.now();
    const readyRetry = this.retryQueue.find(
      (j) => j.metadata?.retryAfter && (j.metadata.retryAfter as number) <= now
    );

    if (readyRetry) {
      this.retryQueue = this.retryQueue.filter((j) => j.id !== readyRetry.id);
      this.queue.unshift(readyRetry);
    }

    // Pobierz następne zadanie
    const job = this.queue.shift();
    if (!job) {
      // Jeśli są zadania w retry queue ale jeszcze nie gotowe, poczekaj
      if (this.retryQueue.length > 0) {
        const nextRetry = this.retryQueue.reduce((min, j) =>
          (j.metadata?.retryAfter as number) < (min.metadata?.retryAfter as number) ? j : min
        );
        const waitTime = Math.max(100, (nextRetry.metadata?.retryAfter as number) - now);
        logger.debug(`[MatchingQueue] Czekam ${waitTime}ms na retry`);
        setTimeout(() => this.processNext(), waitTime);
        return;
      }
      this.isProcessing = false;
      return;
    }

    this.currentJob = job;
    const startTime = Date.now();

    logger.info(`[MatchingQueue] Przetwarzam: ${job.type}`, {
      jobId: job.id,
      type: job.type,
      retryCount: job.retryCount,
      queueRemaining: this.queue.length,
      metadata: job.metadata,
    });

    this.emit('job:started', job);

    try {
      const result = await job.execute();
      const processingTime = Date.now() - startTime;

      if (result.success) {
        this.stats.completed++;
        this.stats.totalProcessingTimeMs += processingTime;

        logger.info(`[MatchingQueue] Sukces: ${job.type}`, {
          jobId: job.id,
          processingTimeMs: processingTime,
          matchedCount: result.matchedCount,
        });

        this.emit('job:completed', { job, result, processingTimeMs: processingTime });
      } else {
        await this.handleFailure(job, result.error || 'Nieznany błąd', result.shouldRetry !== false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';

      // SQLite timeout/busy - zawsze retry
      const isTimeoutError =
        errorMessage.includes('timed out') ||
        errorMessage.includes('SQLITE_BUSY') ||
        errorMessage.includes('database is locked');

      await this.handleFailure(job, errorMessage, isTimeoutError || true);
    }

    this.currentJob = null;

    // Opóźnienie przed następnym zadaniem
    await this.delay(this.config.delayBetweenJobsMs);

    // Kontynuuj przetwarzanie
    this.processNext();
  }

  /**
   * Obsługuje nieudane zadanie
   */
  private async handleFailure(job: MatchingJob, error: string, shouldRetry: boolean): Promise<void> {
    job.lastError = error;
    job.retryCount++;

    if (shouldRetry && job.retryCount <= job.maxRetries) {
      // Exponential backoff
      const retryDelay = Math.min(
        this.config.baseRetryDelayMs * Math.pow(2, job.retryCount - 1),
        this.config.maxRetryDelayMs
      );

      job.metadata = {
        ...job.metadata,
        retryAfter: Date.now() + retryDelay,
      };

      this.retryQueue.push(job);

      logger.warn(`[MatchingQueue] Retry ${job.retryCount}/${job.maxRetries}: ${job.type}`, {
        jobId: job.id,
        error,
        retryInMs: retryDelay,
      });

      this.emit('job:retry', { job, error, retryCount: job.retryCount, retryInMs: retryDelay });
    } else {
      // Ostateczna porażka
      this.stats.failed++;

      logger.error(`[MatchingQueue] Porażka (po ${job.retryCount} próbach): ${job.type}`, {
        jobId: job.id,
        error,
        metadata: job.metadata,
      });

      this.emit('job:failed', { job, error, finalFailure: true });
    }
  }

  /**
   * Pomocnicza funkcja delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Zwraca statystyki kolejki
   */
  getStats(): MatchingQueueStats {
    return {
      pending: this.queue.length,
      processing: this.currentJob ? 1 : 0,
      completed: this.stats.completed,
      failed: this.stats.failed,
      retrying: this.retryQueue.length,
      totalProcessed: this.stats.completed + this.stats.failed,
      averageProcessingTimeMs:
        this.stats.completed > 0
          ? Math.round(this.stats.totalProcessingTimeMs / this.stats.completed)
          : 0,
    };
  }

  /**
   * Zwraca aktualnie przetwarzane zadanie
   */
  getCurrentJob(): MatchingJob | null {
    return this.currentJob;
  }

  /**
   * Zwraca oczekujące zadania
   */
  getPendingJobs(): MatchingJob[] {
    return [...this.queue];
  }

  /**
   * Zwraca zadania oczekujące na retry
   */
  getRetryJobs(): MatchingJob[] {
    return [...this.retryQueue];
  }

  /**
   * Czyści kolejkę
   */
  clear(): void {
    const cleared = this.queue.length + this.retryQueue.length;
    this.queue = [];
    this.retryQueue = [];
    logger.info(`[MatchingQueue] Wyczyszczono ${cleared} zadań z kolejki`);
    this.emit('queue:cleared');
  }

  /**
   * Zatrzymuje przetwarzanie (obecne zadanie zostanie dokończone)
   */
  pause(): void {
    logger.info('[MatchingQueue] Pauza - kolejka zatrzymana');
    this.isProcessing = false;
    this.emit('queue:paused');
  }

  /**
   * Wznawia przetwarzanie
   */
  resume(): void {
    if (!this.isProcessing && (this.queue.length > 0 || this.retryQueue.length > 0)) {
      logger.info('[MatchingQueue] Wznowienie przetwarzania');
      this.emit('queue:resumed');
      this.processNext();
    }
  }

  /**
   * Sprawdza czy kolejka jest aktywna
   */
  isActive(): boolean {
    return this.isProcessing;
  }
}

// Eksport singletona
export const matchingQueue = MatchingQueueService.getInstance();

// Eksport klasy dla testów
export { MatchingQueueService };
