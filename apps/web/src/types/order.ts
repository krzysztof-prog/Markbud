import type { ID, Timestamp, Status } from './common';
import type { Requirement } from './requirement';
import type { SchucoDeliveryLink } from './schuco';

/**
 * Okno/drzwi w zleceniu
 */
export interface Window {
  id?: ID;
  widthMm: number;
  heightMm: number;
  profileType: string;
  quantity: number;
  reference?: string;
  lp?: number;
  szer?: number;
  wys?: number;
  typProfilu?: string;
  ilosc?: number;
  referencja?: string;
}

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
  deliveryDate?: Timestamp;
  productionDate?: Timestamp;
  clientName?: string;
  deliveryId?: ID;
  priority?: number;
  status: Status;
  valuePln?: number | string | null;
  valueEur?: number | string | null;
  priceInheritedFromOrder?: string | null;
  invoiceNumber?: string;
  glassDeliveryDate?: Timestamp;
  orderedGlassCount?: number;
  deliveredGlassCount?: number;
  glassOrderStatus?: string;
  glassOrderNote?: string | null;
  notes?: string;
  completedAt?: Timestamp;
  archivedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  // Ręczny status zlecenia: 'do_not_cut' (NIE CIĄĆ), 'cancelled' (Anulowane), 'on_hold' (Wstrzymane)
  manualStatus?: 'do_not_cut' | 'cancelled' | 'on_hold' | null;
  manualStatusSetAt?: Timestamp;
  totalWindows?: number;
  totalSashes?: number;
  totalGlasses?: number;
  // Sumy z materiałówki (wartości w centach EUR)
  windowsNetValue?: number | null;
  windowsMaterial?: number | null;
  assemblyValue?: number | null;
  extrasValue?: number | null;
  otherValue?: number | null;
  windows?: {
    id?: ID;
    profileType?: string;
    reference?: string;
  }[];
  schucoLinks?: SchucoDeliveryLink[];
  deliveryOrders?: Array<{
    id?: number;
    deliveryId: number;
    position?: number;
    delivery?: {
      id?: number;
      deliveryDate?: string;
      deliveryNumber?: string;
      status?: string;
    };
  }>;
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
