/**
 * Typy dla modułu PVC Warehouse
 */

export interface PvcColor {
  id: number;
  code: string;
  name: string;
  hexColor: string | null;
  type: string;
}

export interface ProfileSystems {
  isLiving: boolean;
  isBlok: boolean;
  isVlak: boolean;
  isCt70: boolean;
  isFocusing: boolean;
}

export interface PvcStock {
  colorId: number | null;
  color: PvcColor | null;
  privateColorId: number | null;
  privateColorName: string | null;
  initialStockBeams: number;
  deliveriesBeams: number;
  rwBeams: number;
  currentStockBeams: number;
  orderedBeams: number;
  demandBeams: number;
  afterDemandBeams: number;
}

export interface PvcProfileWithStock {
  id: number;
  number: string;
  name: string;
  articleNumber: string | null;
  systems: ProfileSystems;
  stocks: PvcStock[];
}

export interface PvcWarehouseResponse {
  profiles: PvcProfileWithStock[];
  colors: PvcColor[];
  totals: {
    totalBeams: number;
    totalProfiles: number;
    totalPositions: number;
  };
}

export interface DemandOrder {
  id: number;
  number: string;
  beams: number;
}

export interface PvcDemandItem {
  profile: {
    id: number;
    number: string;
    name: string;
    isLiving: boolean;
    isBlok: boolean;
    isVlak: boolean;
    isCt70: boolean;
    isFocusing: boolean;
  };
  color: PvcColor;
  totalBeams: number;
  orders: DemandOrder[];
}

export interface PvcDemandResponse {
  demand: PvcDemandItem[];
  totals: {
    totalBeams: number;
    totalPositions: number;
    totalOrders: number;
  };
}

export interface RwOrder {
  id: number;
  number: string;
  beams: number;
  completedAt: string | null;
}

export interface PrivateColor {
  id: number;
  name: string;
}

export interface PvcRwItem {
  profile: {
    id: number;
    number: string;
    name: string;
    isLiving: boolean;
    isBlok: boolean;
    isVlak: boolean;
    isCt70: boolean;
    isFocusing: boolean;
  };
  color: PvcColor | null;
  privateColor: PrivateColor | null;
  totalBeams: number;
  orders: RwOrder[];
}

export interface PvcRwResponse {
  rw: PvcRwItem[];
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
  };
  totals: {
    totalBeams: number;
    totalPositions: number;
    totalOrders: number;
  };
}

export interface SystemStats {
  name: string;
  count: number;
}

export interface PvcSystemsResponse {
  systems: {
    living: SystemStats;
    blok: SystemStats;
    vlak: SystemStats;
    ct70: SystemStats;
    focusing: SystemStats;
  };
  totalProfiles: number;
}

export type SystemType = 'living' | 'blok' | 'vlak' | 'ct70' | 'focusing';

export const SYSTEM_LABELS: Record<SystemType, string> = {
  living: 'Living',
  blok: 'BLOK',
  vlak: 'VLAK',
  ct70: 'CT70',
  focusing: 'FOCUSING',
};

// Typy dla zamówień Schuco
export interface SchucoDeliveryInfo {
  id: number;
  orderNumber: string;
  orderName: string;
  projectNumber: string;
  shippingStatus: string;
  orderDate: string;
}

export interface SchucoOrderItem {
  id: number;
  schucoDeliveryId: number;
  position: number;
  articleNumber: string;
  articleDescription: string;
  orderedQty: number;
  shippedQty: number;
  unit: string;
  dimensions: string | null;
  configuration: string | null;
  deliveryWeek: string | null;
  deliveryDate: string | null;
  tracking: string | null;
  comment: string | null;
  schucoDelivery: SchucoDeliveryInfo;
}

export interface SchucoOrderWeek {
  weekStart: string;
  weekLabel: string;
  items: SchucoOrderItem[];
  totalOrdered: number;
  totalShipped: number;
}

export interface PvcOrdersResponse {
  weeks: SchucoOrderWeek[];
  items: SchucoOrderItem[];
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
  };
  totals: {
    totalItems: number;
    totalOrdered: number;
    totalShipped: number;
    totalOrders: number;
  };
}
