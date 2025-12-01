import type { DeliveryStatus } from '../constants';

export interface Delivery {
  id: number;
  deliveryDate: Date;
  status: DeliveryStatus;
  totalWindows?: number;
  totalGlass?: number;
  totalPallets?: number;
  totalValue?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryDto {
  deliveryDate: Date;
  notes?: string;
}

export interface UpdateDeliveryDto {
  deliveryDate?: Date;
  status?: DeliveryStatus;
  totalWindows?: number;
  totalGlass?: number;
  totalPallets?: number;
  totalValue?: number;
  notes?: string;
}

// Zlecenie przypisane do dostawy
export interface DeliveryOrder {
  id: number;
  deliveryId: number;
  orderId: number;
  position: number; // kolejność na liście
}

// Typ palety
export interface PalletType {
  id: number;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  maxWeightKg: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePalletTypeDto {
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  maxWeightKg: number;
}

// Reguła pakowania
export interface PackingRule {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  ruleConfig: Record<string, unknown>; // JSON z konfiguracją reguły
  createdAt: Date;
  updatedAt: Date;
}

// Wynik optymalizacji pakowania
export interface PalletOptimizationResult {
  deliveryId: number;
  pallets: OptimizedPallet[];
  totalPallets: number;
  averageUtilization: number; // średnie wykorzystanie w %
}

export interface OptimizedPallet {
  palletTypeId: number;
  palletTypeName: string;
  items: PalletItem[];
  utilizationPercent: number;
}

export interface PalletItem {
  orderWindowId: number;
  orderNumber: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  positionX: number; // pozycja na palecie (do wizualizacji)
  positionY: number;
}

// Protokół odbioru
export interface DeliveryProtocol {
  deliveryId: number;
  deliveryDate: Date;
  orders: DeliveryProtocolOrder[];
  totalWindows: number;
  totalGlass: number;
  totalPallets: number;
  totalValue: number;
  reclamations: string[];
  generatedAt: Date;
}

export interface DeliveryProtocolOrder {
  orderNumber: string;
  windowsCount: number;
  glassCount?: number;
  value: number;
  isReclamation: boolean;
}
