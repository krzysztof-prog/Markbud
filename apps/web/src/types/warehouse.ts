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
  currentStockBeams: number;  // Stan magazynowy w belkach (6m)
  profile?: Profile;
  color?: Color;
  updatedAt?: Timestamp;
}

export interface UpdateStockData {
  currentStockBeams: number;
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
  profileName?: string;
  currentStock: number;
  initialStock?: number;
  stock?: number;
  demand: number;
  afterDemand: number;
  ordered?: number;
  orderedBeams?: number;
  expectedDeliveryDate?: string;
  isNegative: boolean;
  isLow: boolean;
  pendingOrders: WarehouseOrder[];
  receivedOrders: WarehouseOrder[];
  nextDeliveryDate?: string;
  averageMonthly?: number; // Średnia miesięczna
}

/**
 * Response z GET /api/warehouse/:colorId
 */
export interface WarehouseDataResponse {
  color: {
    id: number;
    code: string;
    name: string;
    hexColor?: string;
    type: 'typical' | 'atypical';
  } | null;
  data: WarehouseTableRow[];
}

/**
 * Wpis formularza remanent (przed wysłaniem)
 */
export interface RemanentFormEntry {
  profileId: number;
  profileNumber: string;
  initialStock: number; // Stan początkowy (na początek miesiąca)
  calculatedStock: number; // Stan obliczony (currentStockBeams)
  actualStock: number | ''; // Stan rzeczywisty (INPUT value)
  difference: number; // actualStock - calculatedStock
}

/**
 * Request body dla monthly-update
 */
export interface RemanentSubmitData {
  colorId: number;
  updates: Array<{
    profileId: number;
    actualStock: number;
  }>;
}

/**
 * Response z monthly-update
 */
export interface RemanentSubmitResponse {
  updates: Array<{
    profileId: number;
    calculatedStock: number;
    actualStock: number;
    difference: number;
  }>;
  archivedOrdersCount: number;
}

/**
 * Wpis historii remanent
 */
export interface RemanentHistoryEntry {
  id: number;
  profileId: number;
  colorId: number;
  calculatedStock: number;
  actualStock: number;
  difference: number;
  recordedAt: string;
  profile: {
    id: number;
    number: string;
    name: string;
  };
  color: {
    id: number;
    code: string;
    name: string;
  };
}

/**
 * Pogrupowana historia (po dacie + kolorze)
 */
export interface RemanentHistoryGroup {
  date: string; // ISO date string
  colorId: number;
  colorCode: string;
  colorName: string;
  entries: RemanentHistoryEntry[];
  totalProfiles: number;
  differencesCount: number;
  canRollback: boolean; // true jeśli to najnowszy i <24h
}

/**
 * Response z rollback
 */
export interface RollbackResponse {
  success: boolean;
  message: string;
  rolledBackRecords: Array<{
    profileId: number;
    restoredStock: number;
    removedActualStock: number;
  }>;
  restoredOrdersCount: number;
}

/**
 * Dane średniej miesięcznej dla profilu
 */
export interface ProfileAverageData {
  profileId: number;
  profileNumber: string;
  profileName: string;
  averageBeamsPerMonth: number;
  monthlyData: Array<{
    month: string;
    beams: number;
  }>;
  totalBeams: number;
  monthsWithData: number;
}

/**
 * Response z /average endpoint
 */
export interface AverageResponse {
  averages: ProfileAverageData[];
  requestedMonths: number;
}

/**
 * Response z /finalize-month endpoint
 */
export interface FinalizeMonthResponse {
  success: boolean;
  message: string;
  archivedCount: number;
  archivedOrderNumbers: string[];
  preview?: boolean;
  ordersCount?: number;
  orderNumbers?: string[];
  month?: string;
}
