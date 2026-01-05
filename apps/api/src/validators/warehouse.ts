/**
 * Warehouse validation schemas
 */

import { z } from 'zod';
import { idParamsSchema } from './common.js';

// ============================================================================
// Existing Schemas (kept for compatibility)
// ============================================================================

export const warehouseStatsQuerySchema = z.object({
  profileId: z.string().regex(/^\d+$/).optional(),
  colorId: z.string().regex(/^\d+$/).optional(),
});

export const warehouseOrderParamsSchema = idParamsSchema('warehouse order');

export const updateWarehouseOrderSchema = z.object({
  status: z.enum(['pending', 'received', 'archived']).optional(),
  notes: z.string().optional(),
});

export type WarehouseStatsQuery = z.infer<typeof warehouseStatsQuerySchema>;
export type WarehouseOrderParams = z.infer<typeof warehouseOrderParamsSchema>;
export type UpdateWarehouseOrderInput = z.infer<typeof updateWarehouseOrderSchema>;

// ============================================================================
// New Schemas for Warehouse Routes Refactoring
// ============================================================================

/**
 * Schema for colorId parameter validation with type coercion
 * Used in GET /:colorId, GET /:colorId/average, GET /history/:colorId
 */
export const colorIdParamSchema = z.object({
  colorId: z.coerce.number().int().positive({
    message: 'colorId must be a positive integer'
  })
});

/**
 * Schema for profile and color parameters with type coercion
 * Used in PUT /:colorId/:profileId
 */
export const profileColorParamsSchema = z.object({
  colorId: z.coerce.number().int().positive({
    message: 'colorId must be a positive integer'
  }),
  profileId: z.coerce.number().int().positive({
    message: 'profileId must be a positive integer'
  })
});

/**
 * Schema for updating warehouse stock
 * Used in PUT /:colorId/:profileId
 */
export const updateStockBodySchema = z.object({
  currentStockBeams: z.number().int().nonnegative({
    message: 'currentStockBeams must be a non-negative integer'
  }),
  userId: z.number().int().positive({
    message: 'userId must be a positive integer'
  })
});

/**
 * Schema for monthly inventory update
 * Used in POST /monthly-update
 */
export const monthlyUpdateBodySchema = z.object({
  colorId: z.number().int().positive({
    message: 'colorId must be a positive integer'
  }),
  updates: z
    .array(
      z.object({
        profileId: z.number().int().positive({
          message: 'profileId must be a positive integer'
        }),
        actualStock: z.number().int().nonnegative({
          message: 'actualStock must be a non-negative integer'
        })
      })
    )
    .min(1, { message: 'At least one update is required' }),
  userId: z.number().int().positive({
    message: 'userId must be a positive integer'
  })
});

/**
 * Schema for inventory rollback
 * Used in POST /rollback-inventory
 */
export const rollbackInventoryBodySchema = z.object({
  colorId: z.number().int().positive({
    message: 'colorId must be a positive integer'
  }),
  userId: z.number().int().positive({
    message: 'userId must be a positive integer'
  })
});

/**
 * Schema for month finalization
 * Used in POST /finalize-month
 */
export const finalizeMonthBodySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format (01-12)'
  }),
  archive: z.boolean().optional().default(false)
});

/**
 * Schema for history query parameters with type coercion
 * Used in GET /history/:colorId and GET /history
 */
export const historyQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, { message: 'limit must be at least 1' })
    .max(1000, { message: 'limit cannot exceed 1000' })
    .optional()
    .default(100)
});

/**
 * Schema for monthly average query parameters with type coercion
 * Used in GET /:colorId/average
 */
export const averageQuerySchema = z.object({
  months: z.coerce
    .number()
    .int()
    .min(1, { message: 'months must be at least 1' })
    .max(24, { message: 'months cannot exceed 24' })
    .optional()
    .default(6)
});

// ============================================================================
// Type Exports
// ============================================================================

export type ColorIdParams = z.infer<typeof colorIdParamSchema>;
export type ProfileColorParams = z.infer<typeof profileColorParamsSchema>;
export type UpdateStockBody = z.infer<typeof updateStockBodySchema>;
export type MonthlyUpdateBody = z.infer<typeof monthlyUpdateBodySchema>;
export type RollbackInventoryBody = z.infer<typeof rollbackInventoryBodySchema>;
export type FinalizeMonthBody = z.infer<typeof finalizeMonthBodySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type AverageQuery = z.infer<typeof averageQuerySchema>;
