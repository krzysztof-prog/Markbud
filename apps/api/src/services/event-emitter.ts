import { EventEmitter } from 'events';

/**
 * Typy dla różnych zdarzeń aplikacji
 * Używamy bardziej elastycznych typów aby obsługiwać różne struktury danych
 */
export type EventData = Record<string, unknown> & {
  id?: number;
};

interface DataChangeEvent {
  type: string; // np. 'delivery:created', 'order:updated', 'warehouse:stock_changed'
  data: EventData;
  timestamp: Date;
}

class AppEventEmitter extends EventEmitter {
  private static instance: AppEventEmitter;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): AppEventEmitter {
    if (!AppEventEmitter.instance) {
      AppEventEmitter.instance = new AppEventEmitter();
    }
    return AppEventEmitter.instance;
  }

  // Emituj zdarzenie zmiany danych
  emitDataChange(event: DataChangeEvent): void {
    this.emit('dataChange', event);
    this.emit(event.type, event);
  }

  // Subskrybuj zmiany konkretnego typu
  onDataChange(type: string, callback: (event: DataChangeEvent) => void): () => void {
    this.on(type, callback);
    return () => {
      this.off(type, callback);
    };
  }

  // Subskrybuj wszystkie zmiany
  onAnyChange(callback: (event: DataChangeEvent) => void): () => void {
    this.on('dataChange', callback);
    return () => {
      this.off('dataChange', callback);
    };
  }
}

export const eventEmitter = AppEventEmitter.getInstance();

// Helpersy do emitowania zdarzeń
export const emitDeliveryCreated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'delivery:created',
  data,
  timestamp: new Date(),
});

export const emitDeliveryUpdated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'delivery:updated',
  data,
  timestamp: new Date(),
});

export const emitDeliveryDeleted = (id: number) => eventEmitter.emitDataChange({
  type: 'delivery:deleted',
  data: { id },
  timestamp: new Date(),
});

export const emitOrderCreated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'order:created',
  data,
  timestamp: new Date(),
});

export const emitOrderUpdated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'order:updated',
  data,
  timestamp: new Date(),
});

export const emitOrderDeleted = (id: number) => eventEmitter.emitDataChange({
  type: 'order:deleted',
  data: { id },
  timestamp: new Date(),
});

export const emitWarehouseStockUpdated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'warehouse:stock_updated',
  data,
  timestamp: new Date(),
});

export const emitWarehouseStockChanged = (data: EventData) => eventEmitter.emitDataChange({
  type: 'warehouse:stock_changed',
  data,
  timestamp: new Date(),
});

// Okuc events
export const emitOkucRwImported = (data: EventData) => eventEmitter.emitDataChange({
  type: 'okuc:rw_imported',
  data,
  timestamp: new Date(),
});

export const emitOkucRwProcessed = (data: EventData) => eventEmitter.emitDataChange({
  type: 'okuc:rw_processed',
  data,
  timestamp: new Date(),
});

export const emitOkucDemandImported = (data: EventData) => eventEmitter.emitDataChange({
  type: 'okuc:demand_imported',
  data,
  timestamp: new Date(),
});

export const emitOkucStockUpdated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'okuc:stock_updated',
  data,
  timestamp: new Date(),
});

// Okuc order events - dla real-time synchronizacji listy zamówień
export const emitOkucOrderCreated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'okuc:order_created',
  data,
  timestamp: new Date(),
});

export const emitOkucOrderUpdated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'okuc:order_updated',
  data,
  timestamp: new Date(),
});

export const emitOkucOrderDeleted = (id: number) => eventEmitter.emitDataChange({
  type: 'okuc:order_deleted',
  data: { id },
  timestamp: new Date(),
});

// Price import events
export const emitPriceImported = (data: EventData) => eventEmitter.emitDataChange({
  type: 'price:imported',
  data,
  timestamp: new Date(),
});

export const emitPricePending = (data: EventData) => eventEmitter.emitDataChange({
  type: 'price:pending',
  data,
  timestamp: new Date(),
});

// Schuco scraper events - real-time status updates
export const emitSchucoFetchStarted = (data: EventData) => eventEmitter.emitDataChange({
  type: 'schuco:fetch_started',
  data,
  timestamp: new Date(),
});

export const emitSchucoFetchProgress = (data: EventData) => eventEmitter.emitDataChange({
  type: 'schuco:fetch_progress',
  data,
  timestamp: new Date(),
});

export const emitSchucoFetchCompleted = (data: EventData) => eventEmitter.emitDataChange({
  type: 'schuco:fetch_completed',
  data,
  timestamp: new Date(),
});

export const emitSchucoFetchFailed = (data: EventData) => eventEmitter.emitDataChange({
  type: 'schuco:fetch_failed',
  data,
  timestamp: new Date(),
});

// Profile RW events
export const emitProfileRwProcessed = (data: EventData) => eventEmitter.emitDataChange({
  type: 'warehouse:rw_processed',
  data,
  timestamp: new Date(),
});

// Steel events
export const emitSteelStockUpdated = (data: EventData) => eventEmitter.emitDataChange({
  type: 'steel:stock_updated',
  data,
  timestamp: new Date(),
});

export const emitSteelRwProcessed = (data: EventData) => eventEmitter.emitDataChange({
  type: 'steel:rw_processed',
  data,
  timestamp: new Date(),
});

// ============================================================================
// Import Queue Events - postęp importu plików
// ============================================================================

export interface ImportProgressData {
  jobId: string;
  jobType: string;
  filePath?: string;
  orderId?: number;
  error?: string;
  retryCount?: number;
  retryInMs?: number;
  [key: string]: unknown; // Index signature dla zgodności z EventData
}

export const emitImportStarted = (data: ImportProgressData) => eventEmitter.emitDataChange({
  type: 'import:started',
  data,
  timestamp: new Date(),
});

export const emitImportCompleted = (data: ImportProgressData) => eventEmitter.emitDataChange({
  type: 'import:completed',
  data,
  timestamp: new Date(),
});

export const emitImportFailed = (data: ImportProgressData) => eventEmitter.emitDataChange({
  type: 'import:failed',
  data,
  timestamp: new Date(),
});

export const emitImportRetry = (data: ImportProgressData) => eventEmitter.emitDataChange({
  type: 'import:retry',
  data,
  timestamp: new Date(),
});

// ============================================================================
// Matching Queue Events - postęp matchingu (glass orders ↔ deliveries)
// ============================================================================

export interface MatchingProgressData {
  jobId: string;
  jobType: string;
  matchedCount?: number;
  glassOrderId?: number;
  glassDeliveryId?: number;
  orderNumbers?: string[];
  error?: string;
  retryCount?: number;
  retryInMs?: number;
  [key: string]: unknown; // Index signature dla zgodności z EventData
}

export const emitMatchingStarted = (data: MatchingProgressData) => eventEmitter.emitDataChange({
  type: 'matching:started',
  data,
  timestamp: new Date(),
});

export const emitMatchingCompleted = (data: MatchingProgressData) => eventEmitter.emitDataChange({
  type: 'matching:completed',
  data,
  timestamp: new Date(),
});

export const emitMatchingFailed = (data: MatchingProgressData) => eventEmitter.emitDataChange({
  type: 'matching:failed',
  data,
  timestamp: new Date(),
});

export const emitMatchingRetry = (data: MatchingProgressData) => eventEmitter.emitDataChange({
  type: 'matching:retry',
  data,
  timestamp: new Date(),
});

// ============================================================================
// Gmail IMAP Events - postęp pobierania maili z Gmail
// ============================================================================

export const emitGmailFetchStarted = (data: EventData) => eventEmitter.emitDataChange({
  type: 'gmail:fetch_started',
  data,
  timestamp: new Date(),
});

export const emitGmailFetchCompleted = (data: EventData) => eventEmitter.emitDataChange({
  type: 'gmail:fetch_completed',
  data,
  timestamp: new Date(),
});

export const emitGmailFetchFailed = (data: EventData) => eventEmitter.emitDataChange({
  type: 'gmail:fetch_failed',
  data,
  timestamp: new Date(),
});