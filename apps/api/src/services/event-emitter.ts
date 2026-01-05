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