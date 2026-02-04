# Plan: Przebudowa architektury kolejki importów

## Problem
SQLite timeout errors podczas importu wielu plików jednocześnie. Root cause: **zagnieżdżone transakcje** w `GlassOrderService.importFromTxt()` → `matchWithProductionOrdersTx()` → `rematchUnmatchedForOrders()` (tworzy własną transakcję wewnątrz istniejącej).

## Rozwiązanie: Architektura dwóch kolejek

### Diagram przepływu
```
[FileWatcher] → [ImportQueue] → [Import + Basic Matching] → [MatchingQueue] → [Heavy Matching]
                     ↓                    ↓                        ↓
              WebSocket: start     WebSocket: imported      WebSocket: matched
```

### Kluczowe zmiany

1. **Nowa kolejka MatchingQueue** - osobna kolejka dla ciężkich operacji matchowania
2. **Deferred Matching** - import kończy się szybko, matching kolejkowany osobno
3. **WebSocket Bridge** - łączy eventy kolejek z frontendem
4. **Transaction-aware methods** - metody z sufiksem `Tx` dla użycia wewnątrz transakcji

---

## Pliki do stworzenia

### 1. `apps/api/src/services/import/MatchingQueueService.ts`

Nowa kolejka dla operacji matchowania (podobna struktura do ImportQueueService):

```typescript
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

export type MatchingJobType = 'glass_order_matching' | 'glass_delivery_matching' | 'order_rematch';

export interface MatchingJob {
  id: string;
  type: MatchingJobType;
  priority: number;
  addedAt: Date;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  metadata?: {
    glassOrderId?: number;
    orderNumbers?: string[];
    source?: string;
  };
  execute: () => Promise<MatchingJobResult>;
}

export interface MatchingJobResult {
  success: boolean;
  matchedCount?: number;
  error?: string;
  shouldRetry?: boolean;
}

class MatchingQueueService extends EventEmitter {
  private static instance: MatchingQueueService | null = null;
  private queue: MatchingJob[] = [];
  private isProcessing = false;
  private currentJob: MatchingJob | null = null;

  // Konfiguracja - dłuższe opóźnienia niż ImportQueue (cięższe operacje)
  private config = {
    delayBetweenJobsMs: 1000,  // 1s między jobami
    defaultMaxRetries: 3,
    baseRetryDelayMs: 5000,    // 5s base retry
    maxRetryDelayMs: 60000,    // 60s max retry
  };

  static getInstance(): MatchingQueueService {
    if (!MatchingQueueService.instance) {
      MatchingQueueService.instance = new MatchingQueueService();
    }
    return MatchingQueueService.instance;
  }

  enqueue(job: Omit<MatchingJob, 'id' | 'addedAt' | 'retryCount' | 'maxRetries'>): string {
    const jobId = `match-${job.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const fullJob: MatchingJob = {
      ...job,
      id: jobId,
      addedAt: new Date(),
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
    };

    this.queue.push(fullJob);
    this.emit('job:added', fullJob);

    if (!this.isProcessing) {
      this.processNext();
    }

    return jobId;
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      this.emit('queue:empty');
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift()!;
    this.currentJob = job;

    this.emit('job:started', job);

    try {
      const result = await job.execute();

      if (result.success) {
        this.emit('job:completed', { job, result });
      } else {
        await this.handleFailure(job, result.error || 'Unknown error', result.shouldRetry !== false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handleFailure(job, errorMessage, true);
    }

    this.currentJob = null;
    await this.delay(this.config.delayBetweenJobsMs);
    this.processNext();
  }

  private async handleFailure(job: MatchingJob, error: string, shouldRetry: boolean): Promise<void> {
    job.retryCount++;

    if (shouldRetry && job.retryCount <= job.maxRetries) {
      const retryDelay = Math.min(
        this.config.baseRetryDelayMs * Math.pow(2, job.retryCount - 1),
        this.config.maxRetryDelayMs
      );

      setTimeout(() => {
        this.queue.unshift(job);
        if (!this.isProcessing) this.processNext();
      }, retryDelay);

      this.emit('job:retry', { job, error, retryCount: job.retryCount });
    } else {
      this.emit('job:failed', { job, error, finalFailure: true });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      pending: this.queue.length,
      processing: this.currentJob ? 1 : 0,
      currentJob: this.currentJob?.type,
    };
  }
}

export const matchingQueue = MatchingQueueService.getInstance();
```

### 2. `apps/api/src/services/import/ImportWebSocketBridge.ts`

Łączy kolejki z WebSocket:

```typescript
import { importQueue } from './ImportQueueService.js';
import { matchingQueue } from './MatchingQueueService.js';
import { eventEmitter } from '../event-emitter.js';
import { logger } from '../../utils/logger.js';

export function initializeImportWebSocketBridge(): void {
  // Import Queue events
  importQueue.on('job:started', (job) => {
    eventEmitter.emitImportProgress({
      type: 'import:started',
      jobId: job.id,
      jobType: job.type,
      filePath: job.filePath,
    });
  });

  importQueue.on('job:completed', ({ job, result }) => {
    eventEmitter.emitImportProgress({
      type: 'import:completed',
      jobId: job.id,
      jobType: job.type,
      orderId: result.orderId,
    });
  });

  importQueue.on('job:failed', ({ job, error }) => {
    eventEmitter.emitImportProgress({
      type: 'import:failed',
      jobId: job.id,
      jobType: job.type,
      error,
    });
  });

  // Matching Queue events
  matchingQueue.on('job:started', (job) => {
    eventEmitter.emitMatchingProgress({
      type: 'matching:started',
      jobId: job.id,
      jobType: job.type,
      metadata: job.metadata,
    });
  });

  matchingQueue.on('job:completed', ({ job, result }) => {
    eventEmitter.emitMatchingProgress({
      type: 'matching:completed',
      jobId: job.id,
      jobType: job.type,
      matchedCount: result.matchedCount,
    });
  });

  matchingQueue.on('job:failed', ({ job, error }) => {
    eventEmitter.emitMatchingProgress({
      type: 'matching:failed',
      jobId: job.id,
      jobType: job.type,
      error,
    });
  });

  logger.info('[ImportWebSocketBridge] Initialized - queue events connected to WebSocket');
}
```

---

## Pliki do modyfikacji

### 3. `apps/api/src/services/event-emitter.ts`

Dodać metody dla import/matching eventów:

```typescript
// Dodać nowe typy eventów
export interface ImportProgressEvent {
  type: 'import:started' | 'import:completed' | 'import:failed';
  jobId: string;
  jobType: string;
  filePath?: string;
  orderId?: number;
  error?: string;
}

export interface MatchingProgressEvent {
  type: 'matching:started' | 'matching:completed' | 'matching:failed';
  jobId: string;
  jobType: string;
  matchedCount?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

// W klasie AppEventEmitter dodać:
emitImportProgress(event: ImportProgressEvent): void {
  this.emit('importProgress', event);
}

emitMatchingProgress(event: MatchingProgressEvent): void {
  this.emit('matchingProgress', event);
}
```

### 4. `apps/api/src/services/glassOrderService.ts`

**Kluczowa zmiana** - usunąć zagnieżdżoną transakcję, kolejkować matching osobno:

```typescript
// W importFromTxt - ZAMIAST wywoływania matchWithProductionOrdersTx w transakcji:

// PRZED (linia 80-81):
// await this.matchWithProductionOrdersTx(tx, glassOrder.id, glassOrder.expectedDeliveryDate);

// PO:
// 1. W transakcji tylko podstawowe matching (bez rematch)
await this.basicMatchWithProductionOrdersTx(tx, glassOrder.id, glassOrder.expectedDeliveryDate);

// 2. Po transakcji - kolejkuj ciężkie matching
this.enqueueHeavyMatching(glassOrder.id, orderNumbers);

// Nowe metody:
private async basicMatchWithProductionOrdersTx(
  tx: Prisma.TransactionClient,
  glassOrderId: number,
  expectedDeliveryDate: Date | null
) {
  // Tylko podstawowe matching - BEZ rematchUnmatchedForOrders
  const items = await tx.glassOrderItem.findMany({ where: { glassOrderId } });

  const byOrder = new Map<string, number>();
  for (const item of items) {
    const current = byOrder.get(item.orderNumber) || 0;
    byOrder.set(item.orderNumber, current + item.quantity);
  }

  const orderNumbers = [...byOrder.keys()];
  const existingOrders = await tx.order.findMany({
    where: { orderNumber: { in: orderNumbers } },
    select: { orderNumber: true },
  });
  const existingSet = new Set(existingOrders.map(o => o.orderNumber));

  for (const [orderNumber, quantity] of byOrder) {
    if (existingSet.has(orderNumber)) {
      await tx.order.update({
        where: { orderNumber },
        data: {
          orderedGlassCount: { increment: quantity },
          glassOrderStatus: 'ordered',
          glassDeliveryDate: expectedDeliveryDate,
        },
      });
    } else {
      await tx.glassOrderValidation.create({
        data: {
          glassOrderId,
          orderNumber,
          validationType: 'missing_production_order',
          severity: 'warning',
          orderedQuantity: quantity,
          message: `Nie znaleziono zlecenia produkcyjnego ${orderNumber}`,
        },
      });
    }
  }

  return orderNumbers;
}

private enqueueHeavyMatching(glassOrderId: number, orderNumbers: string[]) {
  if (orderNumbers.length === 0) return;

  matchingQueue.enqueue({
    type: 'glass_order_matching',
    priority: 10,
    metadata: { glassOrderId, orderNumbers, source: 'glass_order_import' },
    execute: async () => {
      const result = await this.matchingService.rematchUnmatchedForOrdersStandalone(orderNumbers);
      return {
        success: true,
        matchedCount: result.rematched,
      };
    },
  });
}
```

### 5. `apps/api/src/services/glass-delivery/GlassDeliveryMatchingService.ts`

Dodać wersje metod: `Standalone` (własna transakcja z timeout) i `Tx` (bez transakcji):

```typescript
// Dodać nową metodę z własną transakcją i timeoutem:
async rematchUnmatchedForOrdersStandalone(orderNumbers: string[]): Promise<{ rematched: number }> {
  return this.prisma.$transaction(
    async (tx) => {
      return this.rematchUnmatchedForOrdersTx(tx, orderNumbers);
    },
    {
      timeout: 120000,  // 2 minuty dla ciężkich operacji
      maxWait: 30000,   // 30s czekania na lock
    }
  );
}

// Istniejąca metoda rematchUnmatchedForOrders zmienić na:
async rematchUnmatchedForOrdersTx(
  tx: Prisma.TransactionClient,
  orderNumbers: string[]
): Promise<{ rematched: number }> {
  // Istniejąca logika, ale używa tx zamiast this.prisma
  // ...
}

// Zachować backward compatibility:
async rematchUnmatchedForOrders(orderNumbers: string[]): Promise<{ rematched: number }> {
  return this.rematchUnmatchedForOrdersStandalone(orderNumbers);
}
```

### 6. `apps/api/src/index.ts`

Dodać inicjalizację bridge'a:

```typescript
// Import na górze:
import { initializeImportWebSocketBridge } from './services/import/ImportWebSocketBridge.js';

// W funkcji start(), po setupWebSocket:
initializeImportWebSocketBridge();
logger.info('[Server] Import/Matching WebSocket bridge initialized');
```

---

## Kolejność implementacji

1. **MatchingQueueService.ts** - nowa kolejka (nowy plik)
2. **ImportWebSocketBridge.ts** - bridge dla WebSocket (nowy plik)
3. **event-emitter.ts** - dodać metody emit dla import/matching
4. **GlassDeliveryMatchingService.ts** - dodać `Standalone` i `Tx` wersje
5. **GlassOrderService.ts** - usunąć zagnieżdżoną transakcję, kolejkować matching
6. **index.ts** - inicjalizacja bridge'a
7. **Test** - zaimportować wiele plików jednocześnie

## Korzyści

- ✅ **Brak zagnieżdżonych transakcji** - główna przyczyna timeoutów usunięta
- ✅ **Szybsze importy** - matching nie blokuje importu
- ✅ **Real-time progress** - frontend widzi postęp przez WebSocket
- ✅ **Retry logic** - ciężkie operacje mają automatyczne ponowienia
- ✅ **Backward compatibility** - stare API zachowane

## Ryzyko

- ⚠️ **Eventual consistency** - matching może się opóźnić względem importu
- ⚠️ **Więcej kodu** - dwie kolejki zamiast jednej
- ⚠️ **Debug complexity** - więcej miejsc do sprawdzenia gdy coś nie działa

## Testowanie

1. Uruchom serwer z wieloma plikami glass_order w folderze
2. Sprawdź logi - brak timeout errors
3. Sprawdź WebSocket - eventy import:started/completed/failed i matching:*
4. Sprawdź kolejność - import kończy się przed matching