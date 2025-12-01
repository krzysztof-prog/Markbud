import type { ID, Timestamp, Status } from './common';
import type { Requirement } from './requirement';

/**
 * Zlecenie produkcyjne
 */
export interface Order {
  id: ID;
  orderNumber: string;
  client?: string;
  project?: string;
  system?: string;
  deadline?: Timestamp;
  pvcDeliveryDate?: Timestamp;
  clientName?: string;
  deliveryId?: ID;
  priority?: number;
  status: Status;
  valuePln?: string;
  valueEur?: string;
  invoiceNumber?: string;
  glassDeliveryDate?: Timestamp;
  archivedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalWindows?: number;
  totalSashes?: number;
  totalGlasses?: number;
}

export interface OrderWithRequirements extends Order {
  requirements: Requirement[];
}

export interface CreateOrderData {
  orderNumber: string;
  client?: string;
  project?: string;
  system?: string;
  deadline?: string;
  pvcDeliveryDate?: string;
  valuePln?: number;
  valueEur?: number;
  invoiceNumber?: string;
  deliveryDate?: string;
  glassDeliveryDate?: string;
  notes?: string;
  clientName?: string;
  deliveryId?: number;
  priority?: number;
  requirements?: {
    profileId: number;
    colorId: number;
    quantity: number;
  }[];
}

export interface UpdateOrderData {
  status?: string;
  client?: string;
  project?: string;
  system?: string;
  deadline?: string;
  pvcDeliveryDate?: string;
  valuePln?: number;
  valueEur?: number;
  invoiceNumber?: string;
  deliveryDate?: string;
  glassDeliveryDate?: string;
  notes?: string;
  clientName?: string;
  deliveryId?: number;
  priority?: number;
}

/**
 * Tabela zleceń per kolor (dla widoku orders table)
 */
export interface OrderTableData {
  profiles: {
    id: ID;
    number: string;
    name: string;
  }[];
  orders: {
    orderId: ID;
    orderNumber: string;
    requirements: Record<string, { beams: number; meters: number }>; // profileNumber -> {beams, meters}
  }[];
  totals: Record<string, { beams: number; meters: number }>; // profileNumber -> {beams, meters}
}
