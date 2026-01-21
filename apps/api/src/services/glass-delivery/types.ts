import type { PrismaClient, GlassDelivery, GlassDeliveryItem } from '@prisma/client';

/**
 * Type for Prisma transaction client
 */
export type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Filters for glass delivery queries
 */
export interface GlassDeliveryFilters {
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Match status statistics for delivery items
 */
export interface MatchStatusStats {
  matched: number;
  conflict: number;
  unmatched: number;
  pending: number;
}

/**
 * Order summary for delivery
 */
export interface OrderDeliverySummary {
  orderNumber: string;
  itemCount: number;
  quantity: number;
  matchStatus: MatchStatusStats;
}

/**
 * Import summary for latest delivery
 */
export interface ImportSummary {
  delivery: {
    id: number;
    rackNumber: string;
    customerOrderNumber: string | null;
    supplierOrderNumber: string | null;
    deliveryDate: Date;
    createdAt: Date;
  };
  stats: MatchStatusStats & { total: number };
  orderSummary: OrderDeliverySummary[];
}

/**
 * Result of rematch operation
 */
export interface RematchResult {
  rematched: number;
  stillUnmatched: number;
}

/**
 * Glass delivery with items included
 */
export type GlassDeliveryWithItems = GlassDelivery & {
  items: GlassDeliveryItem[];
};

/**
 * Glass delivery with items and count
 */
export type GlassDeliveryWithItemsAndCount = GlassDelivery & {
  items: GlassDeliveryItem[];
  _count: {
    items: number;
  };
  totalQuantity: number; // Suma wszystkich quantity z items
};

/**
 * Pogrupowana dostawa szyb - grupowanie po customerOrderNumber + rackNumber z items
 * Używane w widoku tabeli dostaw
 */
export interface GroupedGlassDelivery {
  // Klucz grupowania
  customerOrderNumber: string;
  rackNumber: string;
  // Data dostawy (z parent GlassDelivery)
  deliveryDate: Date;
  // Suma szyb w tej grupie
  totalQuantity: number;
  // ID parent delivery (do usuwania)
  glassDeliveryId: number;
  // Szyby należące do tej grupy
  items: GlassDeliveryItem[];
}
