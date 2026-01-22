export interface GlassOrder {
  id: number;
  glassOrderNumber: string;
  orderDate: string;
  supplier: string;
  orderedBy: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  status: 'ordered' | 'partially_delivered' | 'delivered' | 'cancelled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: GlassOrderItem[];
  validationResults?: GlassOrderValidation[];
  deliveryItems?: GlassDeliveryItem[];
  _count?: {
    items: number;
  };
}

export interface GlassOrderItem {
  id: number;
  glassOrderId: number;
  orderNumber: string;
  orderSuffix: string | null;
  position: string;
  glassType: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  createdAt: string;
}

export interface GlassDelivery {
  id: number;
  rackNumber: string;
  customerOrderNumber: string;
  supplierOrderNumber: string | null;
  deliveryDate: string;
  fileImportId: number | null;
  createdAt: string;
  items?: GlassDeliveryItem[];
  _count?: {
    items: number;
  };
  totalQuantity?: number; // Suma wszystkich quantity z items
}

export interface GlassDeliveryItem {
  id: number;
  glassDeliveryId: number;
  glassOrderId: number | null;
  orderNumber: string;
  orderSuffix: string | null;
  position: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  glassComposition: string | null;
  serialNumber: string | null;
  clientCode: string | null;
  matchStatus: 'pending' | 'matched' | 'conflict' | 'unmatched';
  matchedItemId: number | null;
  // Nowe pola - per item (mogą różnić się od parent GlassDelivery)
  customerOrderNumber: string | null;
  rackNumber: string | null;
  createdAt: string;
}

/**
 * Pogrupowana dostawa szyb - grupowanie po customerOrderNumber + rackNumber
 * Używane w widoku tabeli dostaw
 */
export interface GroupedGlassDelivery {
  // Klucz grupowania
  customerOrderNumber: string;
  rackNumber: string;
  // Data dostawy
  deliveryDate: string;
  // Suma szyb w tej grupie
  totalQuantity: number;
  // ID parent delivery (do usuwania)
  glassDeliveryId: number;
  // Szyby należące do tej grupy
  items: GlassDeliveryItem[];
}

export interface GlassOrderValidation {
  id: number;
  glassOrderId: number | null;
  orderNumber: string;
  validationType: string;
  severity: 'info' | 'warning' | 'error';
  expectedQuantity: number | null;
  orderedQuantity: number | null;
  deliveredQuantity: number | null;
  message: string;
  details: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  glassOrder?: GlassOrder;
}

export interface GlassOrderSummary {
  glassOrderNumber: string;
  totalOrdered: number;
  totalDelivered: number;
  orderBreakdown: Array<{
    orderNumber: string;
    ordered: number;
    delivered: number;
    status: 'pending' | 'partial' | 'complete' | 'excess';
  }>;
  issues: GlassOrderValidation[];
}

export interface ValidationDashboard {
  stats: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    byType: Record<string, number>;
  };
  recentIssues: GlassOrderValidation[];
}

export interface GlassOrderFilters {
  status?: string;
  orderNumber?: string;
}

export interface GlassDeliveryFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface LatestImportSummary {
  delivery: {
    id: number;
    rackNumber: string;
    customerOrderNumber: string;
    supplierOrderNumber: string | null;
    deliveryDate: string;
    createdAt: string;
  };
  stats: {
    total: number;
    matched: number;
    conflict: number;
    unmatched: number;
    pending: number;
  };
  orderSummary: Array<{
    orderNumber: string;
    itemCount: number;
    quantity: number;
    matchStatus: {
      matched: number;
      conflict: number;
      unmatched: number;
      pending: number;
    };
  }>;
}

// ========== Kategoryzowane Szyby ==========

export interface CategorizedGlassBase {
  id: number;
  glassDeliveryId: number;
  customerOrderNumber: string;
  clientName: string | null;
  widthMm: number;
  heightMm: number;
  quantity: number;
  orderNumber: string;
  glassComposition: string | null;
  createdAt: string;
  glassDelivery?: {
    deliveryDate: string;
    rackNumber: string;
  };
}

export interface LooseGlass extends CategorizedGlassBase {}

export interface AluminumGlass extends CategorizedGlassBase {}

export interface ReclamationGlass extends CategorizedGlassBase {}

export interface AluminumGlassSummary {
  customerOrderNumber: string;
  clientName: string | null;
  totalQuantity: number;
}
