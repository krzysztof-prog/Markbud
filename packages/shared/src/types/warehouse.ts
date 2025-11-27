// Stan magazynowy
export interface WarehouseStock {
  id: number;
  profileId: number;
  colorId: number;
  currentStockBeams: number; // aktualny stan (bele)
  orderedBeams?: number; // zamówione bele (DEPRECATED - użyj WarehouseOrder)
  expectedDeliveryDate?: Date; // przewidywana data dostawy (DEPRECATED - użyj WarehouseOrder)
  updatedAt: Date;
  updatedBy?: string;
}

export interface UpdateWarehouseStockDto {
  currentStockBeams?: number;
  orderedBeams?: number;
  expectedDeliveryDate?: Date;
}

// Zamówienie magazynowe
export interface WarehouseOrder {
  id: number;
  profileId: number;
  colorId: number;
  orderedBeams: number;
  expectedDeliveryDate: Date;
  status: 'pending' | 'received' | 'cancelled';
  notes?: string;
  createdAt: Date;
  createdById?: number;
}

export interface CreateWarehouseOrderDto {
  profileId: number;
  colorId: number;
  orderedBeams: number;
  expectedDeliveryDate: Date;
  notes?: string;
}

export interface UpdateWarehouseOrderDto {
  orderedBeams?: number;
  expectedDeliveryDate?: Date;
  status?: 'pending' | 'received' | 'cancelled';
  notes?: string;
}

// Historia zmian magazynu (do statystyk i predykcji)
export interface WarehouseHistory {
  id: number;
  profileId: number;
  colorId: number;
  calculatedStock: number; // obliczony stan
  actualStock: number; // rzeczywisty stan (z natury)
  difference: number; // różnica
  recordedAt: Date;
  recordedBy?: string;
}

export interface CreateWarehouseHistoryDto {
  profileId: number;
  colorId: number;
  calculatedStock: number;
  actualStock: number;
}

// Widok tabeli magazynowej dla danego koloru
export interface WarehouseTableRow {
  profileId: number;
  profileNumber: string;
  currentStock: number; // stan magazynu (bele)
  demand: number; // zapotrzebowanie (suma z aktywnych zleceń)
  afterDemand: number; // stan po zapotrzebowaniu
  orderedBeams: number; // zamówione (suma z pending orders)
  expectedDeliveryDate?: Date; // najbliższa data dostawy
  orders: WarehouseOrder[]; // lista wszystkich zamówień
  isLow: boolean; // czy niski stan
  isNegative: boolean; // czy ujemny (brak)
}

// Alert o braku materiału
export interface MaterialShortageAlert {
  profileId: number;
  profileNumber: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  currentStock: number;
  demand: number;
  shortage: number; // ile brakuje
  daysUntilShortage?: number; // za ile dni zabraknie
  priority: 'low' | 'medium' | 'high' | 'critical';
}
