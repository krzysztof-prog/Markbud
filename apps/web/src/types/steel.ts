import type { ID, Timestamp } from './common';

/**
 * Stal - wzmocnienie stalowe
 * Rozpoznawana po numerze artykułu zaczynającym się od 201 lub 202
 */
export interface Steel {
  id: ID;
  number: string;
  articleNumber?: string | null;
  name: string;
  description?: string | null;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Stan magazynowy stali
 */
export interface SteelStock {
  id: ID;
  steelId: ID;
  currentStockBeams: number;
  initialStockBeams: number;
  version: number;
  deletedAt?: Timestamp | null;
  updatedAt: Timestamp;
  updatedById?: ID | null;
}

/**
 * Stal z stanem magazynowym (dla widoku magazynu)
 * Relacja 1:1 - każda stal ma dokładnie jeden rekord stock
 */
export interface SteelWithStock extends Steel {
  steelStock: SteelStock | null;
}

/**
 * Dane do utworzenia stali
 */
export interface CreateSteelData {
  number: string;
  articleNumber?: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

/**
 * Dane do aktualizacji stali
 */
export interface UpdateSteelData {
  number?: string;
  articleNumber?: string | null;
  name?: string;
  description?: string | null;
  sortOrder?: number;
}

/**
 * Dane do aktualizacji kolejności stali
 */
export interface UpdateSteelOrdersData {
  orders: Array<{ id: number; sortOrder: number }>;
}

/**
 * Dane do aktualizacji stanu magazynowego stali
 */
export interface UpdateSteelStockData {
  currentStockBeams: number;
  notes?: string;
}
