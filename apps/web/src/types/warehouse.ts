import type { ID, Timestamp } from './common';
import type { Profile } from './profile';
import type { Color } from './color';

/**
 * Stan magazynu profili
 */
export interface WarehouseStock {
  id: ID;
  profileId: ID;
  colorId: ID;
  quantity: number;
  profile?: Profile;
  color?: Color;
  updatedAt: Timestamp;
}

export interface UpdateStockData {
  quantity: number;
}

/**
 * Stan magazynu z wyliczeniami (zapotrzebowanie, niedobór)
 */
export interface WarehouseStockWithCalculations extends WarehouseStock {
  demand: number;
  afterDemand: number;
  shortage: number;
}

/**
 * Niedobór w magazynie
 */
export interface Shortage {
  profileId: ID;
  colorId: ID;
  shortage: number;
  profile?: Profile;
  color?: Color;
}

/**
 * Historia zmian w magazynie
 */
export interface WarehouseHistory {
  id: ID;
  profileId: ID;
  colorId: ID;
  previousQuantity: number;
  newQuantity: number;
  change: number;
  reason?: string;
  createdAt: Timestamp;
  profile?: Profile;
  color?: Color;
}

/**
 * Zamówienie magazynowe (dostawy do magazynu)
 */
export interface WarehouseOrder {
  id: ID;
  profileId: ID;
  colorId: ID;
  orderedBeams: number;
  receivedBeams?: number;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  status: 'pending' | 'received' | 'cancelled';
  notes?: string;
  profile?: Profile;
  color?: Color;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateWarehouseOrderData {
  profileId: number;
  colorId: number;
  orderedBeams: number;
  expectedDeliveryDate: string;
  notes?: string;
}

export interface UpdateWarehouseOrderData {
  orderedBeams?: number;
  receivedBeams?: number;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status?: 'pending' | 'received' | 'cancelled';
  notes?: string;
}

/**
 * Aktualizacja miesięczna magazynu
 */
export interface MonthlyStockUpdate {
  colorId: number;
  updates: {
    profileId: number;
    quantity: number;
  }[];
}

/**
 * Wiersz tabeli magazynu z dodatkowymi danymi
 */
export interface WarehouseTableRow {
  profileId: ID;
  profileNumber: string;
  profileName: string;
  currentStock: number;
  stock: number;
  demand: number;
  afterDemand: number;
  ordered: number;
  orderedBeams?: number;
  expectedDeliveryDate?: string;
  isNegative: boolean;
  isLow: boolean;
  pendingOrders: WarehouseOrder[];
  receivedOrders: WarehouseOrder[];
  nextDeliveryDate?: string;
}
