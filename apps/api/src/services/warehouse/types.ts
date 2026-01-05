/**
 * Type definitions for warehouse services
 */

/**
 * Warehouse table row data structure
 */
export interface WarehouseRow {
  profileId: number;
  profileNumber: string;
  currentStock: number;
  initialStock: number;
  demand: number;
  demandMeters: number;
  afterDemand: number;
  orderedBeams: number;
  expectedDeliveryDate: Date | null;
  pendingOrders: Array<{
    id: number;
    profileId: number;
    colorId: number;
    orderedBeams: number;
    expectedDeliveryDate: Date | null;
    status: string;
  }>;
  receivedOrders: Array<{
    id: number;
    profileId: number;
    colorId: number;
    orderedBeams: number;
    expectedDeliveryDate: Date | null;
    status: string;
  }>;
  isLow: boolean;
  isNegative: boolean;
  updatedAt: Date;
}

/**
 * Material shortage information
 */
export interface Shortage {
  profileId: number;
  profileNumber: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  currentStock: number;
  demand: number;
  shortage: number;
  orderedBeams: number;
  expectedDeliveryDate: Date | null;
  priority: 'critical' | 'high' | 'medium';
}

/**
 * Monthly usage data for a profile
 */
export interface MonthlyUsage {
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
 * Monthly inventory update data
 */
export interface MonthlyUpdateInput {
  profileId: number;
  actualStock: number;
}

/**
 * Monthly inventory update result
 */
export interface MonthlyUpdateResult {
  profileId: number;
  calculatedStock: number;
  actualStock: number;
  difference: number;
}
