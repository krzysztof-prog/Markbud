/**
 * Import Queue Service
 *
 * Zarządza kolejką importów zapobiegając przeciążeniu bazy SQLite.
 * SQLite obsługuje tylko jeden zapis na raz - równoległe importy powodują timeouty.
 *
 * Funkcjonalności:
 * - Sekwencyjne przetwarzanie (1 import na raz)
 * - Auto-retry dla failujących importów
 * - Opóźnienie między importami (zapobiega przeciążeniu)
 * - Statystyki i monitoring
 */

import { logger } from '../../utils/logger.js';
import { EventEmitter } from 'events';

// Typy zadań w kolejce
export type ImportJobType =
  | 'uzyte_bele'
  | 'uzyte_bele_prywatne'
  | 'ceny_pdf'
  | 'okucia'
  | 'glass_order'
  | 'glass_order_correction'
  | 'glass_order_pdf'
  | 'glass_delivery';

export interface ImportJob {
  id: string;
  type: ImportJobType;
  filePath: string;
  priority: number; // Niższa wartość = wyższy priorytet
  addedAt: Date;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  metadata?: Record<string, unknown>;
  // Funkcja do wykonania - przyjmuje ścieżkę pliku i zwraca Promise
  execute: () => Promise<ImportJobResult>;
}

export interface ImportJobResult {
  success: boolean;
  orderId?: number;
  error?: string;
  shouldRetry?: boolean;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  totalProcessed: number;
  averageProcessingTimeMs: number;
}

// Konfiguracja kolejki
interface QueueConfig {
  // Opóźnienie między importami (ms) - zapobiega przeciążeniu SQLite
  delayBetweenJobsMs: number;
  // Maksymalna liczba prób dla jednego importu
  defaultMaxRetries: number;
  // Opóźnienie przed retry (ms) - rośnie z każdą próbą
  baseRetryDelayMs: number;
  // Maksymalne opóźnienie retry (ms)
  maxRetryDelayMs: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  delayBetweenJobsMs: 500, // 500ms między importami
  defaultMaxRetries: 3,
  baseRetryDelayMs: 2000, // 2s
  maxRetryDelayMs: 30000, // 30s max
};

/**
 * Singleton kolejki importów
 * Zapewnia że wszystkie watchery używają tej samej kolejki
 */
class ImportQueueService extends EventEmitter {
  private static instance: ImportQueueService | null = null;

  private queue: ImportJob[] = [];
  private retryQueue: ImportJob[] = [];
  private isProcessing = false;
  private currentJob: ImportJob | null = null;
  private config: QueueConfig;

  // Statystyki
  private stats = {
    completed: 0,
    failed: 0,
    totalProcessingTimeMs: 0,
  };

  private constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('[ImportQueue] Kolejka importów zainicjalizowana', {
      delayBetweenJobsMs: this.config.delayBetweenJobsMs,
      defaultMaxRetries: this.config.defaultMaxRetries,
    });
  }

  /**
   * Pobiera instancję singletona
   */
  static getInstance(config?: Partial<QueueConfig>): ImportQueueService {
    if (!ImportQueueService.instance) {
      ImportQueueService.instance = new ImportQueueService(config);
    }
    return ImportQueueService.instance;
  }

  /**
   * Resetuje singleton (tylko do testów)
   */
  static resetInstance(): void {
    if (ImportQueueService.instance) {
      ImportQueueService.instance.clear();
      ImportQueueService.instance = null;
    }
  }

  /**
   * Dodaje zadanie do kolejki
   */
  enqueue(job: Omit<ImportJob, 'id' | 'addedAt' | 'retryCount' | 'maxRetries'> & { maxRetries?: number }): string {
    const jobId = `${job.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const fullJob: ImportJob = {
      ...job,
      id: jobId,
      addedAt: new Date(),
      retryCount: 0,
      maxRetries: job.maxRetries ?? this.config.defaultMaxRetries,
    };

    // Wstaw w odpowiednie miejsce według priorytetu
    const insertIndex = this.queue.findIndex((j) => j.priority > fullJob.priority);
    if (insertIndex === -1) {
      this.queue.push(fullJob);
    } else {
      this.queue.splice(insertIndex, 0, fullJob);
    }

    logger.info(`[ImportQueue] Dodano do kolejki: ${job.filePath}`, {
      jobId,
      type: job.type,
      priority: job.priority,
      queueLength: this.queue.length,
    });

    this.emit('job:added', fullJob);

    // Uruchom przetwarzanie jeśli nie działa
    if (!this.isProcessing) {
      this.processNext();
    }

    return jobId;
  }

  /**
   * Dodaje wiele zadań na raz (dla skanowania istniejących plików)
   */
  enqueueBatch(
    jobs: Array<Omit<ImportJob, 'id' | 'addedAt' | 'retryCount' | 'maxRetries'> & { maxRetries?: number }>
  ): string[] {
    const jobIds: string[] = [];

    for (const job of jobs) {
      const jobId = this.enqueue(job);
      jobIds.push(jobId);
    }

    logger.info(`[ImportQueue] Dodano batch ${jobs.length} zadań`, {
      queueLength: this.queue.length,
    });

    return jobIds;
  }

  /**
   * Przetwarza następne zadanie w kolejce
   */
  private async processNext(): Promise<void> {
    // Sprawdź czy jest coś do przetworzenia
    if (this.queue.length === 0 && this.retryQueue.length === 0) {
      this.isProcessing = false;
      this.currentJob = null;
      logger.info('[ImportQueue] Kolejka pusta - przetwarzanie zakończone');
      this.emit('queue:empty');
      return;
    }

    this.isProcessing = true;

    // Najpierw sprawdź retry queue (zadania które czekają na ponowne wykonanie)
    const now = Date.now();
    const readyRetry = this.retryQueue.find(
      (j) => j.metadata?.retryAfter && (j.metadata.retryAfter as number) <= now
    );

    if (readyRetry) {
      // Usuń z retry queue i przenieś na początek głównej kolejki
      this.retryQueue = this.retryQueue.filter((j) => j.id !== readyRetry.id);
      this.queue.unshift(readyRetry);
    }

    // Pobierz następne zadanie
    const job = this.queue.shift();
    if (!job) {
      // Jeśli są zadania w retry queue ale jeszcze nie są gotowe, poczekaj
      if (this.retryQueue.length > 0) {
        const nextRetry = this.retryQueue.reduce((min, j) =>
          (j.metadata?.retryAfter as number) < (min.metadata?.retryAfter as number) ? j : min
        );
        const waitTime = Math.max(100, (nextRetry.metadata?.retryAfter as number) - now);
        logger.debug(`[ImportQueue] Czekam ${waitTime}ms na retry`);
        setTimeout(() => this.processNext(), waitTime);
        return;
      }
      this.isProcessing = false;
      return;
    }

    this.currentJob = job;
    const startTime = Date.now();

    logger.info(`[ImportQueue] Przetwarzam: ${job.filePath}`, {
      jobId: job.id,
      type: job.type,
      retryCount: job.retryCount,
      queueRemaining: this.queue.length,
    });

    this.emit('job:started', job);

    try {
      const result = await job.execute();
      const processingTime = Date.now() - startTime;

      if (result.success) {
        this.stats.completed++;
        this.stats.totalProcessingTimeMs += processingTime;

        logger.info(`[ImportQueue] Sukces: ${job.filePath}`, {
          jobId: job.id,
          processingTimeMs: processingTime,
          orderId: result.orderId,
        });

        this.emit('job:completed', { job, result, processingTimeMs: processingTime });
      } else {
        // Zadanie się nie powiodło
        await this.handleFailure(job, result.error || 'Nieznany błąd', result.shouldRetry !== false);
      }
    } catch (error) {
      // Błąd podczas wykonania
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';

      // Sprawdź czy to błąd timeout SQLite - zawsze retry
      const isTimeoutError = errorMessage.includes('timed out') || errorMessage.includes('SQLITE_BUSY');

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
  private async handleFailure(job: ImportJob, error: string, shouldRetry: boolean): Promise<void> {
    job.lastError = error;
    job.retryCount++;

    if (shouldRetry && job.retryCount <= job.maxRetries) {
      // Oblicz opóźnienie exponential backoff
      const retryDelay = Math.min(
        this.config.baseRetryDelayMs * Math.pow(2, job.retryCount - 1),
        this.config.maxRetryDelayMs
      );

      job.metadata = {
        ...job.metadata,
        retryAfter: Date.now() + retryDelay,
      };

      this.retryQueue.push(job);

      logger.warn(`[ImportQueue] Retry ${job.retryCount}/${job.maxRetries}: ${job.filePath}`, {
        jobId: job.id,
        error,
        retryInMs: retryDelay,
      });

      this.emit('job:retry', { job, error, retryCount: job.retryCount, retryInMs: retryDelay });
    } else {
      // Ostateczna porażka
      this.stats.failed++;

      logger.error(`[ImportQueue] Porażka (po ${job.retryCount} próbach): ${job.filePath}`, {
        jobId: job.id,
        error,
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
  getStats(): QueueStats {
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
  getCurrentJob(): ImportJob | null {
    return this.currentJob;
  }

  /**
   * Zwraca oczekujące zadania
   */
  getPendingJobs(): ImportJob[] {
    return [...this.queue];
  }

  /**
   * Zwraca zadania oczekujące na retry
   */
  getRetryJobs(): ImportJob[] {
    return [...this.retryQueue];
  }

  /**
   * Sprawdza czy plik jest już w kolejce
   */
  isFileInQueue(filePath: string): boolean {
    return (
      this.queue.some((j) => j.filePath === filePath) ||
      this.retryQueue.some((j) => j.filePath === filePath) ||
      this.currentJob?.filePath === filePath
    );
  }

  /**
   * Czyści kolejkę
   */
  clear(): void {
    const cleared = this.queue.length + this.retryQueue.length;
    this.queue = [];
    this.retryQueue = [];
    logger.info(`[ImportQueue] Wyczyszczono ${cleared} zadań z kolejki`);
    this.emit('queue:cleared');
  }

  /**
   * Zatrzymuje przetwarzanie (obecne zadanie zostanie dokończone)
   */
  pause(): void {
    logger.info('[ImportQueue] Pauza - kolejka zatrzymana');
    this.isProcessing = false;
    this.emit('queue:paused');
  }

  /**
   * Wznawia przetwarzanie
   */
  resume(): void {
    if (!this.isProcessing && (this.queue.length > 0 || this.retryQueue.length > 0)) {
      logger.info('[ImportQueue] Wznowienie przetwarzania');
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
export const importQueue = ImportQueueService.getInstance();

// Eksport klasy dla testów
export { ImportQueueService };
