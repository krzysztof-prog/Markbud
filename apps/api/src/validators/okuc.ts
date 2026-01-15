/**
 * Zod validators for DualStock (Okuc) module
 */

import { z } from 'zod';

// ============ ARTICLE VALIDATORS ============

export const orderClassSchema = z.enum(['typical', 'atypical']);
export const sizeClassSchema = z.enum(['standard', 'gabarat']);
export const orderUnitSchema = z.enum(['piece', 'pack']);
export const warehouseTypeSchema = z.enum(['pvc', 'alu']);
export const subWarehouseSchema = z.enum(['production', 'buffer', 'gabaraty']).nullable();
export const basketTypeSchema = z.enum(['typical_standard', 'typical_gabarat', 'atypical']);

export const createArticleSchema = z.object({
  articleId: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  usedInPvc: z.boolean().default(false),
  usedInAlu: z.boolean().default(false),
  orderClass: orderClassSchema.default('typical'),
  sizeClass: sizeClassSchema.default('standard'),
  orderUnit: orderUnitSchema.default('piece'),
  packagingSizes: z.string().optional(), // JSON array: "[50, 100, 200]"
  preferredSize: z.number().int().positive().optional(),
  supplierCode: z.string().max(50).optional(),
  leadTimeDays: z.number().int().min(1).max(90).default(14),
  safetyDays: z.number().int().min(0).max(30).default(3),
});

export const updateArticleSchema = createArticleSchema.partial().omit({ articleId: true });

export const articleFiltersSchema = z.object({
  usedInPvc: z.boolean().optional(),
  usedInAlu: z.boolean().optional(),
  orderClass: orderClassSchema.optional(),
  sizeClass: sizeClassSchema.optional(),
  search: z.string().optional(),
});

export const addAliasSchema = z.object({
  aliasNumber: z.string().min(1).max(50),
});

// ============ STOCK VALIDATORS ============

export const stockFiltersSchema = z.object({
  articleId: z.number().int().positive().optional(),
  warehouseType: warehouseTypeSchema.optional(),
  subWarehouse: subWarehouseSchema.optional(),
  minQuantity: z.number().int().min(0).optional(),
  maxQuantity: z.number().int().min(0).optional(),
});

export const updateStockSchema = z.object({
  quantity: z.number().int().min(0),
  reason: z.string().max(500).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

export const adjustStockSchema = z.object({
  delta: z.number().int(), // Can be negative
  reason: z.string().min(1).max(500),
  expectedVersion: z.number().int().min(0).optional(),
});

export const transferStockSchema = z.object({
  articleId: z.number().int().positive(),
  fromSubWarehouse: subWarehouseSchema,
  toSubWarehouse: subWarehouseSchema,
  quantity: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

// ============ DEMAND VALIDATORS ============

export const demandStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_production',
  'completed',
  'cancelled',
]);

export const demandSourceSchema = z.enum(['order', 'csv_import', 'manual']);

export const createDemandSchema = z.object({
  demandId: z.string().max(50).optional(),
  articleId: z.number().int().positive(),
  orderId: z.number().int().positive().optional(),
  expectedWeek: z.string().regex(/^\d{4}-W\d{2}$/), // e.g., "2025-W08"
  quantity: z.number().int().positive(),
  status: demandStatusSchema.default('pending'),
  source: demandSourceSchema.default('manual'),
});

export const updateDemandSchema = z.object({
  quantity: z.number().int().positive().optional(),
  status: demandStatusSchema.optional(),
  expectedWeek: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  editReason: z.string().min(1).max(500), // Required for manual edits
});

export const demandFiltersSchema = z.object({
  articleId: z.number().int().positive().optional(),
  orderId: z.number().int().positive().optional(),
  status: demandStatusSchema.optional(),
  source: demandSourceSchema.optional(),
  expectedWeek: z.string().optional(),
  fromWeek: z.string().optional(),
  toWeek: z.string().optional(),
  isManualEdit: z.boolean().optional(),
});

// ============ ORDER VALIDATORS ============

export const okucOrderStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'confirmed',
  'in_transit',
  'received',
  'cancelled',
]);

export const createOkucOrderSchema = z.object({
  basketType: basketTypeSchema,
  items: z.array(
    z.object({
      articleId: z.number().int().positive(),
      orderedQty: z.number().int().positive(),
      unitPrice: z.number().positive().optional(),
    })
  ).min(1),
  notes: z.string().max(1000).optional(),
});

export const updateOkucOrderSchema = z.object({
  status: okucOrderStatusSchema.optional(),
  items: z.array(
    z.object({
      articleId: z.number().int().positive(),
      orderedQty: z.number().int().positive(),
      receivedQty: z.number().int().min(0).optional(),
      unitPrice: z.number().positive().optional(),
    })
  ).optional(),
  editReason: z.string().min(1).max(500).optional(),
});

export const receiveOrderSchema = z.object({
  items: z.array(
    z.object({
      articleId: z.number().int().positive(),
      receivedQty: z.number().int().min(0),
    })
  ).min(1),
  notes: z.string().max(1000).optional(),
});

// ============ PROPORTION VALIDATORS ============

export const proportionTypeSchema = z.enum(['multiplier', 'split']);

const proportionBaseSchema = z.object({
  sourceArticleId: z.number().int().positive(),
  targetArticleId: z.number().int().positive(),
  proportionType: proportionTypeSchema,
  ratio: z.number().positive().default(1.0),
  splitPercent: z.number().min(0).max(100).optional(),
  tolerance: z.number().min(0).max(1).default(0.9),
  isActive: z.boolean().default(true),
});

export const createProportionSchema = proportionBaseSchema.refine(
  (data) => data.sourceArticleId !== data.targetArticleId,
  { message: 'Source and target articles must be different' }
);

export const updateProportionSchema = proportionBaseSchema.partial().omit({
  sourceArticleId: true,
  targetArticleId: true,
});

// ============ HISTORY VALIDATORS ============

export const eventTypeSchema = z.enum([
  'rw_consumption',
  'manual_consumption',
  'adjustment',
  'transfer',
  'delivery',
  'return',
  'inventory',
  'order_placed',
  'order_received',
  'manual_edit',
]);

export const historyFiltersSchema = z.object({
  articleId: z.number().int().positive().optional(),
  warehouseType: warehouseTypeSchema.optional(),
  subWarehouse: z.string().optional(),
  eventType: eventTypeSchema.optional(),
  isManualEdit: z.boolean().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  recordedById: z.number().int().positive().optional(),
});

// ============ IMPORT VALIDATORS ============

export const importRwSchema = z.object({
  items: z.array(
    z.object({
      articleId: z.string().min(1),
      quantity: z.number().int().positive(),
      subWarehouse: subWarehouseSchema.default('production'),
      reference: z.string().optional(),
    })
  ).min(1),
});

export const importDemandSchema = z.object({
  items: z.array(
    z.object({
      demandId: z.string().optional(),
      articleId: z.string().min(1),
      expectedWeek: z.string().regex(/^\d{4}-W\d{2}$/),
      quantity: z.number().int().positive(),
      status: demandStatusSchema.default('pending'),
    })
  ).min(1),
  overwriteExisting: z.boolean().default(true), // CSV has priority
});

// ============ STOCK IMPORT VALIDATORS ============

// Schema dla query params w liście stocków
export const stockQueryFiltersSchema = z.object({
  articleId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  warehouseType: z.string().optional(),
  subWarehouse: z.string().optional(),
  belowMin: z.string().optional().transform(val => val !== undefined ? val === 'true' : undefined),
});

// Schema dla adjust stock request
export const adjustStockRequestSchema = z.object({
  stockId: z.number().int().positive(),
  quantity: z.number().int(),
  version: z.number().int().min(0),
});

// Schema dla importu stocków z CSV
export const importStockSchema = z.object({
  items: z.array(z.object({
    articleId: z.string().min(1),
    warehouseType: z.string().min(1),
    subWarehouse: z.string().optional(),
    currentQuantity: z.number().int().nonnegative(),
    minStock: z.number().int().nonnegative().optional(),
    maxStock: z.number().int().nonnegative().optional(),
  })).min(1),
  conflictResolution: z.enum(['skip', 'overwrite', 'selective']),
  selectedConflicts: z.array(z.object({
    articleId: z.string().min(1),
    warehouseType: z.string().min(1),
    subWarehouse: z.string().optional(),
  })).optional().default([]),
});

// ============ TYPE EXPORTS ============

export type StockQueryFilters = z.infer<typeof stockQueryFiltersSchema>;
export type AdjustStockRequest = z.infer<typeof adjustStockRequestSchema>;
export type ImportStockInput = z.infer<typeof importStockSchema>;
export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type ArticleFilters = z.infer<typeof articleFiltersSchema>;
export type StockFilters = z.infer<typeof stockFiltersSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type TransferStockInput = z.infer<typeof transferStockSchema>;
export type CreateDemandInput = z.infer<typeof createDemandSchema>;
export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;
export type DemandFilters = z.infer<typeof demandFiltersSchema>;
export type CreateOkucOrderInput = z.infer<typeof createOkucOrderSchema>;
export type UpdateOkucOrderInput = z.infer<typeof updateOkucOrderSchema>;
export type ReceiveOrderInput = z.infer<typeof receiveOrderSchema>;
export type CreateProportionInput = z.infer<typeof createProportionSchema>;
export type UpdateProportionInput = z.infer<typeof updateProportionSchema>;
export type HistoryFilters = z.infer<typeof historyFiltersSchema>;
export type ImportRwInput = z.infer<typeof importRwSchema>;
export type ImportDemandInput = z.infer<typeof importDemandSchema>;
