import type { OrderStatus } from '../constants';

export interface Order {
  id: number;
  orderNumber: string; // np. '53368'
  status: OrderStatus;
  valuePln?: number;
  valueEur?: number;
  invoiceNumber?: string;
  deliveryDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export interface CreateOrderDto {
  orderNumber: string;
  valuePln?: number;
  valueEur?: number;
  invoiceNumber?: string;
  deliveryDate?: Date;
  notes?: string;
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  valuePln?: number;
  valueEur?: number;
  invoiceNumber?: string;
  deliveryDate?: Date;
  notes?: string;
}

// Zapotrzebowanie na profile w zleceniu
export interface OrderRequirement {
  id: number;
  orderId: number;
  profileId: number;
  colorId: number;
  beamsCount: number; // ilość bel (po przeliczeniu)
  meters: number; // metry (reszta przeliczona)
  restMm: number; // oryginalna reszta w mm
  createdAt: Date;
}

export interface CreateOrderRequirementDto {
  orderId: number;
  profileId: number;
  colorId: number;
  beamsCount: number;
  meters: number;
  restMm: number;
}

// Wymiary okien w zleceniu (do pakowania palet)
export interface OrderWindow {
  id: number;
  orderId: number;
  widthMm: number;
  heightMm: number;
  profileType: string;
  quantity: number;
  reference?: string;
  createdAt: Date;
}

export interface CreateOrderWindowDto {
  orderId: number;
  widthMm: number;
  heightMm: number;
  profileType: string;
  quantity: number;
  reference?: string;
}

// Widok tabeli zleceń dla danego koloru
export interface OrderRequirementTableRow {
  orderNumber: string;
  orderId: number;
  requirements: {
    [profileNumber: string]: {
      beams: number;
      meters: number;
    };
  };
}
